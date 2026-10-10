from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.schema import CallRecord, CallRecordOut
from ..services.call_manager import call_manager

router = APIRouter(prefix="/calls", tags=["Calls"])

class StartCallRequest(BaseModel):
    caller_name: str = "Alex Mercer"
    caller_number: str = "+1-555-0199"
    company: str = "Acme Corp"

class UtteranceRequest(BaseModel):
    call_sid: str
    utterance: str

class EndCallRequest(BaseModel):
    call_sid: str

@router.post("/start")
async def start_call(req: StartCallRequest):
    """Scene 1: Call arrives, Arduino turns blue, dashboard updates."""
    session = await call_manager.start_call(
        caller_name=req.caller_name,
        caller_number=req.caller_number,
        company=req.company
    )
    return session

@router.post("/utterance")
async def process_utterance(req: UtteranceRequest):
    """Scene 2 & 3: Caller speaks, Gemma extracts intent/entities, checks calendar or asks follow-up."""
    result = await call_manager.process_utterance(req.call_sid, req.utterance)
    return result

@router.post("/end")
async def end_call(req: EndCallRequest):
    """Scene 4 & 5: TabPFN classifies priority, summary saved, hardware returns to available."""
    result = await call_manager.end_call(req.call_sid)
    return result

@router.get("/records", response_model=List[CallRecordOut])
def get_call_records(limit: int = 50, db: Session = Depends(get_db)):
    records = db.query(CallRecord).order_by(CallRecord.created_at.desc()).limit(limit).all()
    return records

@router.get("/{call_id}", response_model=CallRecordOut)
def get_call_record(call_id: int, db: Session = Depends(get_db)):
    record = db.query(CallRecord).filter(CallRecord.id == call_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Call record not found")
    return record
