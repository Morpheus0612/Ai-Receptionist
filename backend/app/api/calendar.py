from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.schema import Appointment, AppointmentOut, AppointmentCreate
from ..services.calendar_service import calendar_service

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("/appointments", response_model=List[AppointmentOut])
def get_appointments(limit: int = 50, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).order_by(Appointment.start_time.asc()).limit(limit).all()
    return appointments

@router.post("/book", response_model=AppointmentOut)
def book_appointment(req: AppointmentCreate, db: Session = Depends(get_db)):
    result = calendar_service.create_meeting(
        attendee_name=req.attendee_name,
        attendee_email=req.attendee_email,
        start_time=req.start_time,
        end_time=req.end_time,
        team=req.team,
        notes=req.notes or "",
        call_id=req.call_id,
        db=db
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    app_record = db.query(Appointment).filter(Appointment.id == result["appointment_id"]).first()
    return app_record

@router.get("/check-slot")
def check_slot(start_time: str, end_time: str, team: str = "Sales", db: Session = Depends(get_db)):
    try:
        st = datetime.fromisoformat(start_time)
        et = datetime.fromisoformat(end_time)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ISO datetime format")
    return calendar_service.check_availability(st, et, team, db)
