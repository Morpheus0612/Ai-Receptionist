from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.schema import Lead, LeadOut

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=List[LeadOut])
def get_leads(limit: int = 50, db: Session = Depends(get_db)):
    leads = db.query(Lead).order_by(Lead.created_at.desc()).limit(limit).all()
    return leads
