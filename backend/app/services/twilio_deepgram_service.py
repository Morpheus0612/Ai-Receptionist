import logging
from typing import Dict, Any, Optional
import httpx
from ..core.config import settings

logger = logging.getLogger(__name__)

class TwilioDeepgramService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self.deepgram_key = settings.DEEPGRAM_API_KEY

    def update_credentials(self, account_sid: str, auth_token: str, phone_number: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = phone_number

    def get_status(self) -> Dict[str, Any]:
        configured = bool(self.account_sid and self.auth_token and self.from_number)
        return {
            "is_configured": configured,
            "twilio_phone_number": self.from_number or "+1 (Not configured)",
            "account_sid_masked": f"{self.account_sid[:6]}...{self.account_sid[-4:]}" if self.account_sid else None,
            "can_make_real_calls": configured
        }

    def generate_initial_twiml(self, host_url: str, caller_name: str = "Caller") -> str:
        """
        Interactive TwiML voice dialogue using Twilio Speech Recognition Gather.
        Works reliably on all cell phones and landlines.
        """
        gather_url = f"{host_url}/api/twilio/gather"
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Hello! This is your AI receptionist powered by Google Gemma. How may I assist you today?</Say>
    <Gather input="speech" action="{gather_url}" method="POST" timeout="3" speechTimeout="auto">
        <Say voice="Polly.Joanna">I'm listening. Please state your request.</Say>
    </Gather>
    <Say voice="Polly.Joanna">We did not receive any input. Goodbye.</Say>
</Response>"""
        return twiml

    def generate_reply_twiml(self, host_url: str, reply_text: str, is_completed: bool = False) -> str:
        """
        Generates spoken response and keeps listening if conversational turns continue.
        """
        gather_url = f"{host_url}/api/twilio/gather"
        if is_completed:
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{reply_text}</Say>
    <Say voice="Polly.Joanna">Thank you for calling. Have a wonderful day. Goodbye!</Say>
    <Hangup />
</Response>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{reply_text}</Say>
    <Gather input="speech" action="{gather_url}" method="POST" timeout="4" speechTimeout="auto">
        <Say voice="Polly.Joanna">Please let me know if you need anything else.</Say>
    </Gather>
    <Say voice="Polly.Joanna">Thank you for calling. Goodbye.</Say>
</Response>"""

    async def initiate_outbound_call(self, to_number: str, host_url: str, caller_name: str = "User") -> Dict[str, Any]:
        """
        Makes a live telephone call to user's phone number via Twilio REST API.
        """
        if not self.account_sid or not self.auth_token or not self.from_number:
            return {
                "success": False,
                "error": "Twilio credentials are not configured. Please enter your Twilio Account SID, Auth Token, and Phone Number.",
                "needs_credentials": True
            }

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls.json"
        webhook_url = f"{host_url}/api/twilio/voice"

        data = {
            "To": to_number,
            "From": self.from_number,
            "Url": webhook_url,
            "Method": "POST"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, data=data, auth=(self.account_sid, self.auth_token))
            if resp.status_code in [200, 201]:
                call_data = resp.json()
                return {
                    "success": True,
                    "call_sid": call_data.get("sid"),
                    "status": call_data.get("status"),
                    "to": to_number,
                    "from": self.from_number,
                    "message": f"Calling your phone at {to_number} right now..."
                }
            else:
                err_body = resp.text
                logger.error(f"Twilio Call Error: {resp.status_code} - {err_body}")
                return {
                    "success": False,
                    "error": f"Twilio API rejected call ({resp.status_code}): {err_body}"
                }

twilio_deepgram_service = TwilioDeepgramService()
