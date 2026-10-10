import asyncio
import json
import logging
from typing import Dict, Any, Optional, Callable
import serial
import serial.tools.list_ports
from ..core.config import settings

logger = logging.getLogger(__name__)

class HardwareService:
    def __init__(self):
        self.port_name = settings.ARDUINO_SERIAL_PORT
        self.baud_rate = settings.ARDUINO_BAUD_RATE
        self.serial_conn: Optional[serial.Serial] = None
        self.is_connected = False
        
        # Current device state
        self.current_state = {
            "status": "AVAILABLE",
            "color": "GREEN",
            "description": "System ready. Receptionist available for calls.",
            "last_action": "INITIALIZED",
            "acknowledged": False,
            "escalated": False,
            "is_hardware_detected": False,
            "port": self.port_name
        }
        
        # Event callbacks
        self.callbacks = []

    def register_listener(self, cb: Callable[[Dict[str, Any]], Any]):
        self.callbacks.append(cb)

    def _notify_listeners(self):
        for cb in self.callbacks:
            try:
                cb(self.current_state)
            except Exception as e:
                logger.error(f"Error notifying hardware state listener: {e}")

    def initialize(self):
        """
        Attempts connection to physical Arduino UNO Q over Serial.
        Falls back to virtual hardware simulation if unplugged.
        """
        ports = [p.device for p in serial.tools.list_ports.comports()]
        target_port = None
        for p in ports:
            if "usbmodem" in p.lower() or "ttyacm" in p.lower() or "usbserial" in p.lower():
                target_port = p
                break
        
        if not target_port and ports:
            target_port = ports[0]

        if target_port:
            try:
                self.serial_conn = serial.Serial(target_port, self.baud_rate, timeout=1)
                self.is_connected = True
                self.current_state["is_hardware_detected"] = True
                self.current_state["port"] = target_port
                logger.info(f"Connected to Arduino on {target_port}")
            except Exception as e:
                logger.info(f"Could not open physical serial port {target_port}: {e}. Running virtual Arduino mode.")
                self.is_connected = False
                self.current_state["is_hardware_detected"] = False
        else:
            logger.info("No physical USB serial device detected. Running virtual Arduino UNO Q emulator.")
            self.current_state["is_hardware_detected"] = False

        self.set_state("AVAILABLE", "GREEN", "Ready and waiting for calls")

    def set_state(self, status: str, color: str, last_action: str = ""):
        """
        Transitions Arduino status and LED color:
        AVAILABLE (Green), IN_CALL (Blue), CALLBACK_NEEDED (Amber), ESCALATED (Red)
        """
        self.current_state["status"] = status
        self.current_state["color"] = color
        self.current_state["last_action"] = last_action
        
        if status == "AVAILABLE":
            self.current_state["description"] = "Physical UNO Q indicator: GREEN (Available)"
        elif status == "IN_CALL":
            self.current_state["description"] = "Physical UNO Q indicator: BLUE (Live call in progress)"
        elif status == "CALLBACK_NEEDED":
            self.current_state["description"] = "Physical UNO Q indicator: AMBER (Follow-up callback required)"
        elif status == "ESCALATED":
            self.current_state["description"] = "Physical UNO Q indicator: RED (Escalated follow-up)"

        # Write to physical Arduino if attached
        if self.serial_conn and self.serial_conn.is_open:
            try:
                msg = f"SET:{status}:{color}\n"
                self.serial_conn.write(msg.encode('utf-8'))
            except Exception as e:
                logger.warning(f"Error writing to Arduino serial: {e}")

        self._notify_listeners()
        return self.current_state

    def trigger_button_action(self, action: str) -> Dict[str, Any]:
        """
        Handles physical or virtual button press:
        - ACKNOWLEDGE (Button 1): Acknowledges follow-up, resets alert to Green
        - ESCALATE (Button 2): Escalates call to Red high priority
        """
        action = action.upper()
        if action == "ACKNOWLEDGE":
            self.current_state["acknowledged"] = True
            self.set_state("AVAILABLE", "GREEN", "Follow-up acknowledged via physical controls")
        elif action == "ESCALATE":
            self.current_state["escalated"] = True
            self.set_state("ESCALATED", "RED", "Urgent escalation triggered via physical controls")
        
        return self.current_state

    def get_state(self) -> Dict[str, Any]:
        return self.current_state

hardware_service = HardwareService()
