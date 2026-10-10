"""
Plivo telephony service.

Plivo is a Twilio-compatible REST API — same concept, easier free tier.
Docs: https://www.plivo.com/docs/voice/api/call/

Flow:
  POST /api/plivo/call-me  →  Plivo REST API dials to_number
  Plivo calls your webhook  →  POST /api/plivo/voice  →  returns XML
  User speaks              →  POST /api/plivo/gather  →  Gemini processes it
  Gemini replies           →  XML response with <Speak> + next <GetDigits/Record>
"""

import logging
from typing import Dict, Any
import httpx
from ..core.config import settings

logger = logging.getLogger(__name__)


class PlivoService:
    BASE_URL = "https://api.plivo.com/v1"

    def __init__(self):
        self.auth_id = settings.PLIVO_AUTH_ID
        self.auth_token = settings.PLIVO_AUTH_TOKEN
        self.from_number = settings.PLIVO_PHONE_NUMBER

    def update_credentials(self, auth_id: str, auth_token: str, phone_number: str):
        self.auth_id = auth_id
        self.auth_token = auth_token
        self.from_number = phone_number
        # persist back to settings so webhooks work
        settings.PLIVO_AUTH_ID = auth_id
        settings.PLIVO_AUTH_TOKEN = auth_token
        settings.PLIVO_PHONE_NUMBER = phone_number

    def get_status(self) -> Dict[str, Any]:
        configured = bool(self.auth_id and self.auth_token and self.from_number)
        return {
            "is_configured": configured,
            "plivo_phone_number": self.from_number or "Not configured",
            "auth_id_masked": (
                f"{self.auth_id[:6]}...{self.auth_id[-4:]}" if self.auth_id else None
            ),
            "can_make_real_calls": configured,
        }

    def generate_answer_xml(self, host_url: str) -> str:
        """
        Plivo Answer XML — equivalent to Twilio TwiML.
        Plivo uses the same XML verbs: <Speak>, <GetInput>, <Record>, <Hangup>
        """
        gather_url = f"{host_url}/api/plivo/gather"
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-US">
    Hello! This is your AI receptionist powered by Google Gemini. How may I assist you today?
  </Speak>
  <GetInput action="{gather_url}" method="POST" inputType="speech"
            speechEndTimeout="2" speechTimeout="5" language="en-US">
    <Speak voice="WOMAN" language="en-US">I am listening. Please state your request.</Speak>
  </GetInput>
  <Speak voice="WOMAN" language="en-US">We did not receive any input. Goodbye.</Speak>
</Response>"""

    def generate_reply_xml(self, host_url: str, reply_text: str, is_completed: bool = False) -> str:
        """Reply XML after Gemini processes the caller's speech."""
        gather_url = f"{host_url}/api/plivo/gather"
        safe = reply_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        if is_completed:
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-US">{safe}</Speak>
  <Speak voice="WOMAN" language="en-US">Thank you for calling. Have a wonderful day. Goodbye!</Speak>
  <Hangup/>
</Response>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-US">{safe}</Speak>
  <GetInput action="{gather_url}" method="POST" inputType="speech"
            speechEndTimeout="2" speechTimeout="6" language="en-US">
    <Speak voice="WOMAN" language="en-US">Please let me know if you need anything else.</Speak>
  </GetInput>
  <Speak voice="WOMAN" language="en-US">Thank you for calling. Goodbye.</Speak>
</Response>"""

    async def initiate_outbound_call(
        self, to_number: str, host_url: str, caller_name: str = "User"
    ) -> Dict[str, Any]:
        """
        Place an outbound call via the Plivo REST API.
        Reference: https://www.plivo.com/docs/voice/api/call/#make-a-call
        """
        if not self.auth_id or not self.auth_token or not self.from_number:
            return {
                "success": False,
                "error": (
                    "Plivo credentials are not configured. "
                    "Please enter your Auth ID, Auth Token, and Plivo phone number."
                ),
                "needs_credentials": True,
            }

        answer_url = f"{host_url}/api/plivo/voice"
        url = f"{self.BASE_URL}/Account/{self.auth_id}/Call/"

        payload = {
            "to": to_number,
            "from": self.from_number,
            "answer_url": answer_url,
            "answer_method": "POST",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    auth=(self.auth_id, self.auth_token),
                )

            if resp.status_code in (200, 201):
                data = resp.json()
                call_uuid = (
                    data.get("request_uuid")
                    or (data.get("message", "") if isinstance(data.get("message"), str) else "")
                )
                return {
                    "success": True,
                    "call_uuid": call_uuid,
                    "status": "queued",
                    "to": to_number,
                    "from": self.from_number,
                    "message": f"Calling your phone at {to_number} now via Plivo…",
                }
            else:
                body = resp.text
                logger.error(f"Plivo API error {resp.status_code}: {body}")
                return {
                    "success": False,
                    "error": f"Plivo rejected the call ({resp.status_code}): {body}",
                }

        except httpx.RequestError as e:
            logger.error(f"Plivo network error: {e}")
            return {"success": False, "error": f"Network error reaching Plivo: {e}"}


plivo_service = PlivoService()
