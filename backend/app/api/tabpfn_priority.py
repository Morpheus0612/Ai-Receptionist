from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.schema import FollowUpItem, FollowUpItemOut
from ..services.tabpfn_service import tabpfn_service, HISTORICAL_TRAINING_DATA

router = APIRouter(prefix="/tabpfn", tags=["TabPFN Priority"])

class PriorityPredictRequest(BaseModel):
    intent: str = "book_meeting"
    urgency: float = 0.8
    sentiment: str = "neutral"
    is_repeat_caller: bool = False
    requires_follow_up: bool = True
    estimated_deal_size: float = 15000.0
    duration_seconds: int = 75
    missing_details: List[str] = []

@router.post("/predict")
def predict_priority(req: PriorityPredictRequest):
    """Runs TabPFN classification on caller tabular attributes."""
    result = tabpfn_service.predict_priority(req.model_dump())
    return result

@router.get("/queue", response_model=List[FollowUpItemOut])
def get_follow_up_queue(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieves intelligent follow-up queue sorted by priority."""
    items = db.query(FollowUpItem).order_by(FollowUpItem.priority_score.desc()).limit(limit).all()
    return items

@router.post("/acknowledge/{item_id}")
def acknowledge_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FollowUpItem).filter(FollowUpItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    item.acknowledged = True
    db.commit()
    return {"status": "success", "message": f"Item #{item_id} acknowledged"}

@router.post("/escalate/{item_id}")
def escalate_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FollowUpItem).filter(FollowUpItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    item.escalated = True
    item.priority = "High"
    item.priority_score = 0.99
    db.commit()
    return {"status": "success", "message": f"Item #{item_id} escalated to High priority"}

@router.get("/dataset-info")
def get_dataset_info():
    """Returns metadata about TabPFN prior training data."""
    sample_count = len(HISTORICAL_TRAINING_DATA) // 2
    return {
        "dataset_name": "Historical Call Center Receptionist Outcomes",
        "sample_count": sample_count,
        "features": [
            "urgency_score", "is_repeat_caller", "has_unresolved_request",
            "deal_size_thousands", "sentiment_score", "call_duration_seconds", "intent_type_code"
        ],
        "classes": ["High", "Medium", "Low"],
        "architecture": "TabPFN Transformer Architecture (Prior-Data Fitted Network)"
    }
