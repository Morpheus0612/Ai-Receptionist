from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from ..services.hardware_service import hardware_service
from ..services.call_manager import call_manager

router = APIRouter(prefix="/hardware", tags=["Hardware UNO Q"])

class ButtonPressRequest(BaseModel):
    action: str  # ACKNOWLEDGE or ESCALATE

class SetStateRequest(BaseModel):
    status: str  # AVAILABLE, IN_CALL, CALLBACK_NEEDED, ESCALATED
    color: str   # GREEN, BLUE, AMBER, RED
    description: str = ""

@router.get("/state")
def get_hardware_state():
    return hardware_service.get_state()

@router.post("/button")
async def trigger_button(req: ButtonPressRequest):
    new_state = hardware_service.trigger_button_action(req.action)
    await call_manager.broadcast_hardware_state()
    return new_state

@router.post("/set-state")
async def set_hardware_state(req: SetStateRequest):
    new_state = hardware_service.set_state(req.status, req.color, req.description)
    await call_manager.broadcast_hardware_state()
    return new_state
