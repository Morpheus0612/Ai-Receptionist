from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import engine, Base
from .services.hardware_service import hardware_service
from .services.call_manager import call_manager

# Import API routers
from .api.calls import router as calls_router
from .api.calendar import router as calendar_router
from .api.tabpfn_priority import router as tabpfn_router
from .api.tinker_eval import router as tinker_router
from .api.hardware import router as hardware_router
from .api.leads import router as leads_router
from .api.twilio import router as twilio_router
from .api.gemini import router as gemini_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_receptionist")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized.")
    # Initialize hardware service (serial or virtual)
    hardware_service.initialize()
    logger.info("Hardware service initialized.")
    yield
    logger.info("Shutting down AI Receptionist server.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(calls_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")
app.include_router(tabpfn_router, prefix="/api")
app.include_router(tinker_router, prefix="/api")
app.include_router(hardware_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(twilio_router, prefix="/api")
app.include_router(gemini_router, prefix="/api")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": settings.DATABASE_URL.split("///")[0],
        "hardware_state": hardware_service.get_state()["status"]
    }

@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """
    Live real-time feed for Receptionist Dashboard:
    Sends call events, transcripts, Gemma analysis, actions, and hardware updates.
    """
    await call_manager.register_dashboard_ws(websocket)
    try:
        while True:
            # Keepalive / receive ping
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        call_manager.unregister_dashboard_ws(websocket)
    except Exception:
        call_manager.unregister_dashboard_ws(websocket)

@app.websocket("/ws/call")
async def browser_call_websocket(websocket: WebSocket):
    """
    Browser-based phone simulator WebSocket for audio & live conversational turns.
    """
    await websocket.accept()
    session = await call_manager.start_call(caller_name="Browser Caller", caller_number="+1-555-DEMO")
    call_sid = session["call_sid"]
    await websocket.send_json({"type": "call_connected", "call_sid": call_sid, "session": session})
    
    try:
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            if msg_type == "utterance":
                caller_text = msg.get("text", "")
                result = await call_manager.process_utterance(call_sid, caller_text)
                await websocket.send_json({
                    "type": "receptionist_turn",
                    "text": result["response_text"],
                    "analysis": result["analysis"],
                    "action_executed": result["action_executed"]
                })
            elif msg_type == "hangup":
                res = await call_manager.end_call(call_sid)
                await websocket.send_json({"type": "call_ended", "result": res})
                break
    except WebSocketDisconnect:
        await call_manager.end_call(call_sid)
    except Exception as e:
        logger.error(f"Error in browser call WS: {e}")
        await call_manager.end_call(call_sid)

# Scripted Demo Simulator API (Scenes 1 - 5)
@app.post("/api/demo/run-scene/{scene_number}")
async def run_demo_scene(scene_number: int):
    """
    Pre-scripted triggers for demonstration scenes 1 to 5.
    """
    if scene_number == 1:
        # Scene 1: The call arrives (0:00-0:20)
        session = await call_manager.start_call(
            caller_name="Jordan Vance",
            caller_number="+1-415-555-0182",
            company="Nexus Robotics"
        )
        return {
            "scene": 1,
            "title": "The Call Arrives",
            "description": "Incoming call established. Dashboard displays live call; Arduino indicator turns BLUE.",
            "session": session,
            "hardware": hardware_service.get_state()
        }
    elif scene_number == 2:
        # Scene 2: AI Understands & Asks Clarification (0:20-0:45)
        # Check active call or create one
        active = list(call_manager.active_calls.keys())
        call_sid = active[0] if active else (await call_manager.start_call())["call_sid"]
        utterance = "Can you arrange a meeting with the sales team next Tuesday?"
        result = await call_manager.process_utterance(call_sid, utterance)
        return {
            "scene": 2,
            "title": "The AI Understands",
            "description": "Gemma extracts requested date (next Tuesday) and team (Sales), identifies missing time & email, asks clarifying question rather than guessing.",
            "caller_utterance": utterance,
            "result": result
        }
    elif scene_number == 3:
        # Scene 3: A real action succeeds (0:45-1:05)
        active = list(call_manager.active_calls.keys())
        call_sid = active[-1] if active else (await call_manager.start_call())["call_sid"]
        session = call_manager.active_calls[call_sid]
        if not session.get("intent") or session.get("intent") == "unknown":
            session["intent"] = "book_meeting"
            session["current_entities"]["requested_date"] = "next Tuesday"
        utterance = "Sure, 2:00 PM works best for me. My name is Jordan Vance and email is jordan.vance@nexusrobotics.io."
        result = await call_manager.process_utterance(call_sid, utterance)
        return {
            "scene": 3,
            "title": "A Real Action Succeeds",
            "description": "System checks calendar availability, verifies slot, books meeting in Google/Demo Calendar, and confirms invite.",
            "caller_utterance": utterance,
            "result": result
        }
    elif scene_number == 4:
        # Scene 4: The system learns and prioritizes (1:05-1:30)
        from .services.tabpfn_service import tabpfn_service
        from .services.tinker_service import tinker_service
        sample_call = {
            "intent": "book_meeting",
            "urgency": 0.88,
            "sentiment": "positive",
            "is_repeat_caller": False,
            "requires_follow_up": True,
            "estimated_deal_size": 25000.0,
            "duration_seconds": 95,
            "missing_details": []
        }
        prio = tabpfn_service.predict_priority(sample_call)
        bench = tinker_service.run_benchmark_evaluation()
        return {
            "scene": 4,
            "title": "The System Learns & Prioritizes",
            "description": "TabPFN predicts priority with factor explanations; Tinker fine-tuning benchmark compared with Base Gemma.",
            "tabpfn_prediction": prio,
            "tinker_evaluation": bench["summary"]
        }
    elif scene_number == 5:
        # Scene 5: Show the result (1:30-2:00)
        active = list(call_manager.active_calls.keys())
        call_sid = active[0] if active else (await call_manager.start_call())["call_sid"]
        result = await call_manager.end_call(call_sid)
        return {
            "scene": 5,
            "title": "Show the Result",
            "description": "Call record saved, appointment logged, priority review queue updated, Arduino hardware returns to Available (GREEN).",
            "result": result,
            "hardware": hardware_service.get_state()
        }
    else:
        return {"error": "Invalid scene number. Choose 1 to 5."}
