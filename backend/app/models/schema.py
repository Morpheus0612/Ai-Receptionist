from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from ..core.database import Base

# SQLAlchemy Models
class CallRecord(Base):
    __tablename__ = "call_records"
    
    id = Column(Integer, primary_key=True, index=True)
    call_sid = Column(String(100), unique=True, index=True)
    caller_number = Column(String(50), default="+1-555-0199")
    caller_name = Column(String(100), default="Unknown Caller")
    caller_company = Column(String(100), nullable=True)
    caller_email = Column(String(100), nullable=True)
    status = Column(String(50), default="ringing")  # ringing, in-progress, completed, failed
    transcript = Column(Text, default="")
    intent = Column(String(50), default="unknown")  # book_meeting, transfer_call, save_lead, support_query, general_inquiry
    intent_confidence = Column(Float, default=0.0)
    summary = Column(Text, default="")
    sentiment = Column(String(20), default="neutral")  # positive, neutral, negative
    urgency = Column(Float, default=0.5)  # 0.0 to 1.0
    
    # Priority & Intelligent Follow-up (TabPFN)
    priority = Column(String(20), default="Medium")  # High, Medium, Low
    priority_score = Column(Float, default=0.5)
    priority_explanation = Column(JSON, default=dict)
    follow_up_needed = Column(Boolean, default=False)
    
    # Action Status
    actions_taken = Column(JSON, default=list)  # list of action descriptions
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    appointments = relationship("Appointment", back_populates="call")
    leads = relationship("Lead", back_populates="call")


class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("call_records.id"), nullable=True)
    title = Column(String(200))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    attendee_name = Column(String(100))
    attendee_email = Column(String(100))
    team = Column(String(50), default="Sales")
    calendar_event_id = Column(String(100), default="demo-event-id")
    status = Column(String(50), default="confirmed")  # confirmed, cancelled
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    call = relationship("CallRecord", back_populates="appointments")


class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("call_records.id"), nullable=True)
    name = Column(String(100))
    company = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    intent = Column(String(50))
    estimated_deal_size = Column(Float, default=5000.0)
    notes = Column(Text, default="")
    status = Column(String(50), default="New")  # New, Contacted, Qualified
    created_at = Column(DateTime, default=datetime.utcnow)
    
    call = relationship("CallRecord", back_populates="leads")


class FollowUpItem(Base):
    __tablename__ = "follow_up_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("call_records.id"), nullable=True)
    caller_name = Column(String(100))
    caller_phone = Column(String(50))
    reason = Column(String(255))
    priority = Column(String(20), default="Medium")
    priority_score = Column(Float, default=0.5)
    priority_factors = Column(JSON, default=dict)
    acknowledged = Column(Boolean, default=False)
    escalated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# Pydantic Schemas
class CallRecordOut(BaseModel):
    id: int
    call_sid: str
    caller_number: str
    caller_name: str
    caller_company: Optional[str] = None
    caller_email: Optional[str] = None
    status: str
    transcript: str
    intent: str
    intent_confidence: float
    summary: str
    sentiment: str
    urgency: float
    priority: str
    priority_score: float
    priority_explanation: Dict[str, Any]
    follow_up_needed: bool
    actions_taken: List[str]
    duration_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentCreate(BaseModel):
    call_id: Optional[int] = None
    title: str
    start_time: datetime
    end_time: datetime
    attendee_name: str
    attendee_email: str
    team: str = "Sales"
    notes: Optional[str] = ""


class AppointmentOut(BaseModel):
    id: int
    call_id: Optional[int] = None
    title: str
    start_time: datetime
    end_time: datetime
    attendee_name: str
    attendee_email: str
    team: str
    calendar_event_id: str
    status: str
    notes: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True


class LeadOut(BaseModel):
    id: int
    call_id: Optional[int] = None
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    intent: str
    estimated_deal_size: float
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class FollowUpItemOut(BaseModel):
    id: int
    call_id: Optional[int] = None
    caller_name: str
    caller_phone: str
    reason: str
    priority: str
    priority_score: float
    priority_factors: Dict[str, Any]
    acknowledged: bool
    escalated: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HardwareState(BaseModel):
    status: str  # AVAILABLE, IN_CALL, CALLBACK_NEEDED, ESCALATED
    color: str   # GREEN, BLUE, AMBER, RED
    description: str
    last_action: str
    acknowledged: bool = False
    escalated: bool = False
    connected: bool = True
