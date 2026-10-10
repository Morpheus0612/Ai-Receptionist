from datetime import datetime, timedelta
import sys
import os

# Add parent path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.schema import CallRecord, Appointment, Lead, FollowUpItem
from backend.app.services.tabpfn_service import tabpfn_service

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing if needed
    if db.query(CallRecord).count() > 0:
        print("Database already has records. Seeding skipped.")
        db.close()
        return

    print("Seeding initial historical data...")

    now = datetime.utcnow()

    # Pre-booked appointments
    app1 = Appointment(
        title="Sales Demo with CloudScale Inc",
        start_time=now + timedelta(days=1, hours=2),
        end_time=now + timedelta(days=1, hours=2, minutes=45),
        attendee_name="Elena Rostova",
        attendee_email="elena@cloudscale.io",
        team="Sales",
        calendar_event_id="evt_cloudscale_01",
        status="confirmed",
        notes="Booked via AI Receptionist. 120 user tier evaluation."
    )
    db.add(app1)

    app2 = Appointment(
        title="Technical Deep Dive with FinTech Global",
        start_time=now + timedelta(days=2, hours=4),
        end_time=now + timedelta(days=2, hours=4, minutes=45),
        attendee_name="Marcus Brody",
        attendee_email="mbrody@fintechglobal.com",
        team="Engineering",
        calendar_event_id="evt_fintech_02",
        status="confirmed",
        notes="SOC2 compliance and API integration questions."
    )
    db.add(app2)

    # Leads
    lead1 = Lead(
        name="Sarah Connor",
        company="Cyberdyne Systems",
        email="s.connor@cyberdyne.com",
        phone="+1-555-0142",
        intent="Enterprise Automation",
        estimated_deal_size=45000.0,
        notes="Interested in full receptionist deployment across 4 regional branches.",
        status="New"
    )
    db.add(lead1)

    # Historical Completed Calls
    c1 = CallRecord(
        call_sid="CA_HIST_01",
        caller_name="Elena Rostova",
        caller_number="+1-415-555-8921",
        caller_company="CloudScale Inc",
        status="completed",
        transcript="Caller: I want to schedule a product demo with your enterprise sales representative. AI: Certainly! I have confirmed your appointment for tomorrow at 2:00 PM.",
        intent="book_meeting",
        intent_confidence=0.98,
        summary="Booked enterprise sales demo for CloudScale Inc.",
        sentiment="positive",
        urgency=0.6,
        priority="Medium",
        priority_score=0.72,
        priority_explanation={"explanation": "Medium priority scheduled booking with confirmed calendar slot."},
        follow_up_needed=False,
        actions_taken=["Meeting Booked in Google Calendar", "Confirmation email sent"],
        duration_seconds=78,
        created_at=now - timedelta(hours=3)
    )
    db.add(c1)

    c2 = CallRecord(
        call_sid="CA_HIST_02",
        caller_name="David Sterling",
        caller_number="+1-212-555-0914",
        caller_company="Sterling Capital",
        status="completed",
        transcript="Caller: This is an emergency, our billing reconciliation pipeline threw an authentication timeout and our account seems locked. I need this escalated now!",
        intent="support_query",
        intent_confidence=0.96,
        summary="Emergency billing lockout reported by Sterling Capital. Escalation needed.",
        sentiment="negative",
        urgency=0.95,
        priority="High",
        priority_score=0.96,
        priority_explanation={
            "model_used": "TabPFN",
            "predicted_priority": "High",
            "confidence": 0.96,
            "factors": [
                {"factor": "High Caller Urgency", "value": "95%", "impact": "+35% on High Priority", "direction": "positive"},
                {"factor": "Frustrated Sentiment Detected", "value": "Negative", "impact": "+20% on Escalation Risk", "direction": "negative"},
                {"factor": "Unresolved Follow-Up Items", "value": "Account Lockout", "impact": "+25% on Review Priority", "direction": "positive"}
            ],
            "explanation": "TabPFN classified this call as 'High' priority driven by High Caller Urgency and Negative Sentiment."
        },
        follow_up_needed=True,
        actions_taken=["Escalation notification dispatched", "Priority Ticket #802 created"],
        duration_seconds=112,
        created_at=now - timedelta(hours=1)
    )
    db.add(c2)

    # Follow up queue item for c2
    queue_item = FollowUpItem(
        call_id=2,
        caller_name="David Sterling",
        caller_phone="+1-212-555-0914",
        reason="Priority High: Emergency billing lockout reported by Sterling Capital",
        priority="High",
        priority_score=0.96,
        priority_factors={
            "urgency": "95%",
            "sentiment": "Negative",
            "primary_driver": "Urgent technical account lockout"
        },
        acknowledged=False,
        escalated=False,
        created_at=now - timedelta(hours=1)
    )
    db.add(queue_item)

    db.commit()
    db.close()
    print("Database successfully seeded!")

if __name__ == "__main__":
    seed_database()
