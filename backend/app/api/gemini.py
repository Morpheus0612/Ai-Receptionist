"""
Gemini-powered outbound call endpoint.

Uses the Gemini Live API (or Text-to-Speech) to place and manage AI calls.
Requires GEMINI_API_KEY in environment / .env file.

To make actual phone calls you still need a telephony bridge:
  - Option A: Twilio + Gemini TTS  (replace audio_url with a Twilio TwiML that plays the Gemini audio)
  - Option B: Gemini Live API + WebRTC SIP bridge

For the demo the endpoint records the call request in the DB and returns a
confirmation. The audio interaction is handled by the PhoneSimulatorModal or
the existing voice pipeline depending on your telephony setup.
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..core.database import SessionLocal
from ..models.schema import CallRecord
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    GENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gemini", tags=["gemini"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


class CallRequest(BaseModel):
    to_number: str
    caller_name: str = "Caller"


class CallResponse(BaseModel):
    success: bool
    message: str = ""
    call_id: int | None = None
    error: str = ""


@router.post("/call", response_model=CallResponse)
async def initiate_gemini_call(request: CallRequest):
    """
    Initiate an outbound call via the Gemini AI pipeline.

    Steps:
    1. Validate the phone number.
    2. Create a call record in the database.
    3. Use Gemini to generate a greeting message.
    4. (Optional) Trigger your telephony bridge to place the call.
    5. Return a success response.
    """
    if not request.to_number.strip():
        raise HTTPException(status_code=400, detail="Phone number is required.")

    db: Session = SessionLocal()
    call_record = None

    try:
        # 1. Create a DB record for this outbound call
        call_record = CallRecord(
            caller_number=request.to_number,
            caller_name=request.caller_name,
            status="initiated",
            intent_summary=f"Outbound Gemini call to {request.caller_name}",
        )
        db.add(call_record)
        db.commit()
        db.refresh(call_record)

        # 2. Generate a Gemini greeting (used when the call connects)
        greeting_text = f"Hello {request.caller_name}! This is your AI receptionist powered by Google Gemini. How can I help you today?"

        if GEMINI_API_KEY and GENAI_AVAILABLE and genai is not None:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(
                    f"You are a friendly AI receptionist. Generate a short, warm opening greeting for a phone call to {request.caller_name}. Keep it under 2 sentences."
                )
                greeting_text = response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini greeting generation failed, using default: {e}")

        # 3. Update DB with pending status
        call_record.status = "pending_connection"
        db.commit()

        # 4. TODO: Integrate your telephony bridge here.
        #    Example (Twilio):
        #      from twilio.rest import Client
        #      twilio_client = Client(TWILIO_SID, TWILIO_TOKEN)
        #      call = twilio_client.calls.create(
        #          to=request.to_number,
        #          from_=TWILIO_NUMBER,
        #          url="https://your-backend.com/api/gemini/twiml"
        #      )
        #
        #    Example (Gemini Live API direct SIP):
        #      Connect via WebRTC / SIP bridge pointing at /ws/voice

        logger.info(f"Gemini call initiated for {request.to_number} (call_id={call_record.id})")

        return CallResponse(
            success=True,
            message=(
                f"Call queued for {request.to_number}. "
                "The AI receptionist will connect shortly. "
                "Tip: Set up your telephony bridge (Twilio or SIP) in the backend to make the phone actually ring."
            ),
            call_id=call_record.id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating Gemini call: {e}", exc_info=True)
        if call_record and call_record.id:
            try:
                call_record.status = "failed"
                db.commit()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")
    finally:
        db.close()


@router.get("/config")
async def get_gemini_config():
    """Return the current Gemini configuration status."""
    return {
        "api_key_configured": bool(GEMINI_API_KEY),
        "genai_package_installed": GENAI_AVAILABLE,
        "model": "gemini-1.5-flash",
        "telephony_bridge": "Not configured — see backend/app/api/gemini.py for setup instructions",
        "status": "ready" if (GEMINI_API_KEY and GENAI_AVAILABLE) else ("api_key_missing" if GENAI_AVAILABLE else "package_not_installed"),
    }
