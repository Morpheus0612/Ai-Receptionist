import logging
from typing import Optional
from fastapi import APIRouter, Request, Response, Form, HTTPException
from pydantic import BaseModel
from ..services.twilio_deepgram_service import twilio_deepgram_service
from ..services.call_manager import call_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/twilio", tags=["Twilio Telephony"])

class OutboundCallRequest(BaseModel):
    to_number: str
    caller_name: Optional[str] = "Customer"
    host_url: Optional[str] = None

class TwilioCredentialsRequest(BaseModel):
    account_sid: str
    auth_token: str
    phone_number: str

@router.get("/config")
def get_twilio_config():
    """Returns whether live Twilio calling is configured and the assigned receptionist phone number."""
    return twilio_deepgram_service.get_status()

@router.post("/config")
def update_twilio_config(req: TwilioCredentialsRequest):
    """Updates Twilio credentials for live telephone calls."""
    twilio_deepgram_service.update_credentials(
        account_sid=req.account_sid.strip(),
        auth_token=req.auth_token.strip(),
        phone_number=req.phone_number.strip()
    )
    return {"status": "success", "config": twilio_deepgram_service.get_status()}

@router.post("/call-me")
async def trigger_outbound_call(request: Request, req: OutboundCallRequest):
    """
    Places a live outbound phone call to the user's mobile or landline number.
    When the user picks up, the AI receptionist speaks and executes business actions!
    """
    host = req.host_url or str(request.base_url).rstrip("/")
    result = await twilio_deepgram_service.initiate_outbound_call(
        to_number=req.to_number.strip(),
        host_url=host,
        caller_name=req.caller_name or "Mobile Caller"
    )
    if not result.get("success") and not result.get("needs_credentials"):
        raise HTTPException(status_code=400, detail=result.get("error", "Call failed"))
    return result

@router.post("/voice")
async def twilio_incoming_voice(request: Request):
    """
    Twilio voice webhook for both incoming phone calls and outbound connections.
    Starts call session, sets Arduino hardware to BLUE, and greets caller.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "CA_PHONE_CALL")
    from_number = form_data.get("From", "Unknown Number")

    # Start session in call manager
    await call_manager.start_call(
        caller_name=f"Caller ({from_number})",
        caller_number=from_number,
        company="Inbound Telephony"
    )

    host = str(request.base_url).rstrip("/")
    twiml_xml = twilio_deepgram_service.generate_initial_twiml(host, caller_name=from_number)
    return Response(content=twiml_xml, media_type="application/xml")

@router.post("/gather")
async def twilio_speech_gather(request: Request):
    """
    Webhook called when the telephone user finishes speaking.
    Twilio provides SpeechResult -> Gemma processes it -> Returns spoken TwiML response.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    speech_result = form_data.get("SpeechResult", "")

    host = str(request.base_url).rstrip("/")

    if not speech_result:
        reply_xml = twilio_deepgram_service.generate_reply_twiml(
            host,
            "I didn't quite catch that. Could you please repeat your request?",
            is_completed=False
        )
        return Response(content=reply_xml, media_type="application/xml")

    # Process through Gemma & Business action executor
    active = list(call_manager.active_calls.keys())
    target_sid = call_sid if call_sid in call_manager.active_calls else (active[-1] if active else None)
    
    if not target_sid:
        session = await call_manager.start_call(caller_name="Phone Caller")
        target_sid = session["call_sid"]

    result = await call_manager.process_utterance(target_sid, speech_result)
    reply_text = result["response_text"]
    
    # Check if completed (e.g. meeting booked or end of dialogue)
    is_completed = bool(result.get("action_executed") and "Booked" in result.get("action_executed", ""))

    reply_xml = twilio_deepgram_service.generate_reply_twiml(
        host,
        reply_text,
        is_completed=is_completed
    )
    return Response(content=reply_xml, media_type="application/xml")
