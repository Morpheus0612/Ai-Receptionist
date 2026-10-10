import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
import uuid
from fastapi import WebSocket
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..models.schema import CallRecord, Appointment, Lead, FollowUpItem
from .gemma_service import gemma_service
from .calendar_service import calendar_service
from .tabpfn_service import tabpfn_service
from .hardware_service import hardware_service

logger = logging.getLogger(__name__)

class CallManager:
    def __init__(self):
        # Active dashboard websockets
        self.dashboard_sockets: Set[WebSocket] = set()
        # Active calls {call_sid: CallSession}
        self.active_calls: Dict[str, Dict[str, Any]] = {}

    async def register_dashboard_ws(self, ws: WebSocket):
        await ws.accept()
        self.dashboard_sockets.add(ws)
        # Send initial snapshot
        await self.broadcast_hardware_state()

    def unregister_dashboard_ws(self, ws: WebSocket):
        self.dashboard_sockets.discard(ws)

    async def broadcast(self, event_type: str, payload: Dict[str, Any]):
        """Broadcasts event to all connected dashboard clients."""
        dead_sockets = set()
        message = json.dumps({"type": event_type, "data": payload, "timestamp": datetime.utcnow().isoformat()})
        for ws in self.dashboard_sockets:
            try:
                await ws.send_text(message)
            except Exception:
                dead_sockets.add(ws)
        for ws in dead_sockets:
            self.dashboard_sockets.discard(ws)

    async def broadcast_hardware_state(self):
        state = hardware_service.get_state()
        await self.broadcast("hardware_update", state)

    async def start_call(self, caller_name: str = "Alex Mercer", caller_number: str = "+1-555-0199", company: str = "Acme Corp") -> Dict[str, Any]:
        """
        Scene 1: Call arrives.
        Sets Arduino indicator to BLUE. Broadcasts call start.
        """
        call_sid = f"CA{uuid.uuid4().hex[:16]}"
        db: Session = SessionLocal()
        try:
            record = CallRecord(
                call_sid=call_sid,
                caller_name=caller_name,
                caller_number=caller_number,
                caller_company=company,
                status="in-progress",
                transcript=""
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            record_id = record.id
        finally:
            db.close()

        # Update physical hardware to BLUE
        hardware_service.set_state("IN_CALL", "BLUE", f"Call started with {caller_name}")
        await self.broadcast_hardware_state()

        call_session = {
            "id": record_id,
            "call_sid": call_sid,
            "caller_name": caller_name,
            "caller_number": caller_number,
            "company": company,
            "status": "in-progress",
            "transcript_turns": [],
            "current_entities": {},
            "actions_taken": [],
            "start_time": datetime.utcnow()
        }
        self.active_calls[call_sid] = call_session

        await self.broadcast("call_started", {
            "call_sid": call_sid,
            "caller_name": caller_name,
            "caller_number": caller_number,
            "company": company,
            "status": "in-progress"
        })

        return call_session

    async def process_utterance(self, call_sid: str, caller_utterance: str) -> Dict[str, Any]:
        """
        Scene 2 & 3:
        Caller speaks. Gemma analyzes intent & entities.
        Executes actions or asks clarifying follow-up question.
        """
        call_session = self.active_calls.get(call_sid)
        if not call_session:
            # Fallback auto-start call if needed
            call_session = await self.start_call()
            call_sid = call_session["call_sid"]

        call_session["transcript_turns"].append({"speaker": "caller", "text": caller_utterance})
        full_transcript = " ".join([f"{turn['speaker']}: {turn['text']}" for turn in call_session["transcript_turns"]])

        # Broadcast caller speech event
        await self.broadcast("transcript_turn", {
            "call_sid": call_sid,
            "speaker": "caller",
            "text": caller_utterance
        })

        # Gemma intent & entity analysis (Feature B / Scene 2)
        analysis = await gemma_service.analyze_utterance(full_transcript)
        
        # Merge discovered entities
        for k, v in analysis["entities"].items():
            if v and not call_session["current_entities"].get(k):
                call_session["current_entities"][k] = v

        # If caller name wasn't extracted from speech, keep known caller name
        if not call_session["current_entities"].get("attendee_name"):
            call_session["current_entities"]["attendee_name"] = call_session["caller_name"]

        # Default caller email if missing
        if not call_session["current_entities"].get("attendee_email"):
            clean_name = call_session["caller_name"].lower().replace(" ", ".")
            call_session["current_entities"]["attendee_email"] = f"{clean_name}@example.com"

        # Preserve multi-turn dialogue intent if answering a follow-up
        if call_session.get("intent") == "book_meeting" and analysis["intent"] == "general_inquiry":
            analysis["intent"] = "book_meeting"
        call_session["intent"] = analysis["intent"]
        call_session["sentiment"] = analysis["sentiment"]
        call_session["urgency"] = analysis["urgency"]

        # If booking meeting and date + time are now present, all required slots are fulfilled!
        if call_session["intent"] == "book_meeting":
            if call_session["current_entities"].get("requested_date") and call_session["current_entities"].get("requested_time"):
                analysis["requires_follow_up"] = False

        response_text = ""
        action_executed = None

        # Check dialogue state:
        # Scene 2: Missing details -> Receptionist asks follow-up rather than guessing
        if analysis["requires_follow_up"] and analysis.get("follow_up_question"):
            response_text = analysis["follow_up_question"]
            action_desc = f"Awaiting missing details: {', '.join(analysis.get('missing_details', []))}"
            call_session["actions_taken"].append(action_desc)

        # Scene 3: A real business action succeeds
        elif analysis["intent"] == "book_meeting":
            # Real calendar availability check & creation
            db: Session = SessionLocal()
            try:
                date_str = call_session["current_entities"].get("requested_date", "next Tuesday")
                time_str = call_session["current_entities"].get("requested_time", "2:00 PM")
                start_dt, end_dt = calendar_service.parse_requested_slot(date_str, time_str)
                
                booking_result = calendar_service.create_meeting(
                    attendee_name=call_session["current_entities"].get("attendee_name", call_session["caller_name"]),
                    attendee_email=call_session["current_entities"].get("attendee_email", "guest@example.com"),
                    start_time=start_dt,
                    end_time=end_dt,
                    team=call_session["current_entities"].get("team", "Sales"),
                    notes=f"Booked via Voice AI Receptionist for {call_session['caller_name']}",
                    call_id=call_session["id"],
                    db=db
                )
                if booking_result["success"]:
                    action_executed = "Meeting Booked"
                    call_session["actions_taken"].append(f"Booked {booking_result['title']} in Google Calendar (ID: {booking_result['event_id']})")
                    response_text = (
                        f"I have checked our schedule and successfully confirmed your meeting with the {call_session['current_entities'].get('team', 'Sales')} team "
                        f"for {start_dt.strftime('%A, %B %d at %I:%M %p')}. A calendar invite and confirmation email have been sent to {call_session['current_entities']['attendee_email']}!"
                    )
                else:
                    response_text = f"I checked the calendar, but unfortunately that slot is unavailable: {booking_result['message']}. Would another time work for you?"
            finally:
                db.close()

        elif analysis["intent"] == "transfer_call":
            target_dept = call_session["current_entities"].get("team", "Sales")
            action_executed = "Call Transfer Initiated"
            call_session["actions_taken"].append(f"Routing call to {target_dept} queue")
            response_text = f"Certainly! Connecting you directly to our {target_dept} specialist now. Please hold for one moment."

        elif analysis["intent"] == "save_lead":
            db = SessionLocal()
            try:
                lead = Lead(
                    call_id=call_session["id"],
                    name=call_session["caller_name"],
                    company=call_session["company"],
                    email=call_session["current_entities"].get("attendee_email"),
                    phone=call_session["caller_number"],
                    intent="Sales Pipeline Inquiry",
                    estimated_deal_size=15000.0,
                    status="New"
                )
                db.add(lead)
                db.commit()
                action_executed = "Lead Saved to CRM"
                call_session["actions_taken"].append(f"Saved commercial lead for {call_session['caller_name']} ($15,000 pipeline)")
                response_text = "Thank you for your interest! I've logged your company details and our enterprise team will reach out with a customized proposal."
            finally:
                db.close()

        else:
            response_text = "I understand. I'm noting that down right now and will make sure our team has all the details."

        call_session["transcript_turns"].append({"speaker": "receptionist", "text": response_text})

        # Broadcast receptionist response
        await self.broadcast("transcript_turn", {
            "call_sid": call_sid,
            "speaker": "receptionist",
            "text": response_text
        })

        await self.broadcast("call_analysis_update", {
            "call_sid": call_sid,
            "intent": analysis["intent"],
            "confidence": analysis["confidence"],
            "entities": call_session["current_entities"],
            "requires_follow_up": analysis["requires_follow_up"],
            "actions_taken": call_session["actions_taken"],
            "sentiment": analysis["sentiment"],
            "urgency": analysis["urgency"]
        })

        return {
            "response_text": response_text,
            "analysis": analysis,
            "action_executed": action_executed,
            "call_session": call_session
        }

    async def end_call(self, call_sid: str) -> Dict[str, Any]:
        """
        Scene 4 & Scene 5:
        TabPFN predicts priority.
        Summary saved. Hardware returns to Green or Amber.
        """
        call_session = self.active_calls.get(call_sid)
        if not call_session:
            return {"error": "Call not found"}

        duration = int((datetime.utcnow() - call_session["start_time"]).total_seconds()) or 45
        full_transcript = " \n".join([f"{turn['speaker'].title()}: {turn['text']}" for turn in call_session["transcript_turns"]])

        # Scene 4: TabPFN Priority Prediction (Feature C)
        call_summary_data = {
            "intent": call_session.get("intent", "general_inquiry"),
            "urgency": call_session.get("urgency", 0.5),
            "sentiment": call_session.get("sentiment", "neutral"),
            "is_repeat_caller": False,
            "requires_follow_up": len(call_session.get("actions_taken", [])) == 0 or "Awaiting" in "".join(call_session.get("actions_taken", [])),
            "estimated_deal_size": 15000.0 if "lead" in call_session.get("intent", "") or "sales" in str(call_session.get("current_entities", {})).lower() else 5000.0,
            "duration_seconds": duration,
            "missing_details": []
        }
        tabpfn_result = tabpfn_service.predict_priority(call_summary_data)

        # Update database record
        db: Session = SessionLocal()
        follow_up_created = False
        try:
            record: Optional[CallRecord] = db.query(CallRecord).filter(CallRecord.id == call_session["id"]).first()
            if record:
                record.status = "completed"
                record.transcript = full_transcript
                record.intent = call_session.get("intent", "book_meeting")
                record.intent_confidence = 0.95
                record.summary = f"Call with {call_session['caller_name']} ({call_session['company']}). Intent: {record.intent}. Handled with actions: {', '.join(call_session['actions_taken'])}."
                record.sentiment = call_session.get("sentiment", "positive")
                record.urgency = call_session.get("urgency", 0.4)
                record.priority = tabpfn_result["predicted_priority"]
                record.priority_score = tabpfn_result["confidence"]
                record.priority_explanation = tabpfn_result
                record.actions_taken = call_session["actions_taken"]
                record.duration_seconds = duration

                # If priority is High or Medium, queue intelligent follow-up
                if tabpfn_result["predicted_priority"] in ["High", "Medium"]:
                    record.follow_up_needed = True
                    queue_item = FollowUpItem(
                        call_id=record.id,
                        caller_name=call_session["caller_name"],
                        caller_phone=call_session["caller_number"],
                        reason=f"Priority {tabpfn_result['predicted_priority']}: Review appointment details and follow up on inquiry",
                        priority=tabpfn_result["predicted_priority"],
                        priority_score=tabpfn_result["confidence"],
                        priority_factors=tabpfn_result["factors"]
                    )
                    db.add(queue_item)
                    follow_up_created = True

                db.commit()
                db.refresh(record)
        finally:
            db.close()

        # Scene 5: Hardware status indicator update
        if follow_up_created and tabpfn_result["predicted_priority"] == "High":
            hardware_service.set_state("CALLBACK_NEEDED", "AMBER", f"Call ended. High priority follow-up queued for {call_session['caller_name']}.")
        else:
            hardware_service.set_state("AVAILABLE", "GREEN", "Call completed. Receptionist available.")

        await self.broadcast_hardware_state()

        completed_payload = {
            "call_sid": call_sid,
            "status": "completed",
            "duration": duration,
            "summary": record.summary if record else "",
            "tabpfn_prediction": tabpfn_result,
            "actions_taken": call_session["actions_taken"]
        }

        await self.broadcast("call_completed", completed_payload)
        self.active_calls.pop(call_sid, None)

        return completed_payload

call_manager = CallManager()
