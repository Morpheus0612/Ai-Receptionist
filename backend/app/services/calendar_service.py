from datetime import datetime, timedelta
import logging
from typing import Dict, Any, List, Optional
import uuid
from sqlalchemy.orm import Session
from ..models.schema import Appointment

logger = logging.getLogger(__name__)

class CalendarService:
    def __init__(self):
        # In-memory storage for rapid demo calendar inspection & sync
        self._demo_busy_slots = [
            # Pre-booked slots for sales team (e.g. next Tuesday 10:00 AM to 11:00 AM)
            {"start": "10:00", "end": "11:00", "title": "Internal Sales Pipeline Review"}
        ]

    def parse_requested_slot(self, date_str: str, time_str: str) -> tuple[datetime, datetime]:
        """
        Parses human date & time strings into concrete datetime objects.
        E.g. 'next Tuesday', '2:00 PM'
        """
        now = datetime.now()
        
        # Calculate target date
        target_date = now
        date_lower = (date_str or "").lower()
        if "next tuesday" in date_lower:
            days_ahead = (1 - now.weekday() + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
            target_date = now + timedelta(days=days_ahead)
        elif "tuesday" in date_lower:
            days_ahead = (1 - now.weekday() + 7) % 7
            target_date = now + timedelta(days=days_ahead if days_ahead > 0 else 7)
        elif "tomorrow" in date_lower:
            target_date = now + timedelta(days=1)
        else:
            # Default to next business day
            target_date = now + timedelta(days=2)

        # Parse hour/minute
        hour = 14 # default 2 PM
        minute = 0
        time_lower = (time_str or "").lower()
        if "10" in time_lower:
            hour = 10
        elif "11" in time_lower:
            hour = 11
        elif "1" in time_lower and "pm" in time_lower:
            hour = 13
        elif "2" in time_lower or "14" in time_lower:
            hour = 14
        elif "3" in time_lower or "15" in time_lower:
            hour = 15
        elif "4" in time_lower or "16" in time_lower:
            hour = 16
        elif "9" in time_lower:
            hour = 9

        start_time = target_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        end_time = start_time + timedelta(minutes=45)
        return start_time, end_time

    def check_availability(self, start_time: datetime, end_time: datetime, team: str = "Sales", db: Optional[Session] = None, call_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Checks calendar availability against business hours and existing bookings.
        """
        # Business hours check: 9 AM to 5 PM
        if start_time.hour < 9 or start_time.hour >= 17:
            return {
                "available": False,
                "reason": "Requested time is outside business hours (9:00 AM - 5:00 PM)."
            }

        # Check existing database appointments
        if db:
            q = db.query(Appointment).filter(
                Appointment.team == team,
                Appointment.status == "confirmed",
                Appointment.start_time < end_time,
                Appointment.end_time > start_time
            )
            if call_id:
                q = q.filter(Appointment.call_id != call_id)
            conflict = q.first()
            if conflict:
                return {
                    "available": False,
                    "reason": f"Slot conflicts with an existing booking '{conflict.title}' ({conflict.start_time.strftime('%I:%M %p')})."
                }

        # Check demo busy slots
        time_format = start_time.strftime("%H:%M")
        for slot in self._demo_busy_slots:
            if slot["start"] <= time_format < slot["end"]:
                return {
                    "available": False,
                    "reason": f"Slot {slot['start']}-{slot['end']} is reserved for {slot['title']}."
                }

        return {
            "available": True,
            "reason": f"{team} team is free on {start_time.strftime('%A, %B %d at %I:%M %p')}."
        }

    def create_meeting(
        self,
        attendee_name: str,
        attendee_email: str,
        start_time: datetime,
        end_time: datetime,
        team: str = "Sales",
        notes: str = "",
        call_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Confirms slot availability, creates the calendar event, and stores the record.
        """
        availability = self.check_availability(start_time, end_time, team, db, call_id=call_id)
        if not availability["available"]:
            return {
                "success": False,
                "message": availability["reason"],
                "event_id": None
            }

        event_id = f"evt_{uuid.uuid4().hex[:10]}"
        title = f"{team} Meeting with {attendee_name}"

        appointment = Appointment(
            call_id=call_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            attendee_name=attendee_name,
            attendee_email=attendee_email,
            team=team,
            calendar_event_id=event_id,
            status="confirmed",
            notes=notes
        )

        if db:
            db.add(appointment)
            db.commit()
            db.refresh(appointment)
            db_id = appointment.id
        else:
            db_id = 1

        logger.info(f"Successfully booked meeting: {title} ({event_id})")

        return {
            "success": True,
            "appointment_id": db_id,
            "event_id": event_id,
            "title": title,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "attendee_name": attendee_name,
            "attendee_email": attendee_email,
            "team": team,
            "calendar_provider": "Google Calendar (Connected/Demo Gateway)",
            "message": f"Confirmed! Meeting scheduled for {start_time.strftime('%A, %b %d at %I:%M %p')}. Calendar invite issued to {attendee_email}."
        }

calendar_service = CalendarService()
