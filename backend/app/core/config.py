import os
from pydantic import BaseModel, Field

class Settings(BaseModel):
    PROJECT_NAME: str = "Voice AI Receptionist"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./receptionist.db")
    
    # Gemma Inference (DigitalOcean GPU or compatible endpoint)
    GEMMA_ENDPOINT_URL: str = os.getenv("GEMMA_ENDPOINT_URL", "")
    GEMMA_API_KEY: str = os.getenv("GEMMA_API_KEY", "")
    GEMMA_MODEL_NAME: str = os.getenv("GEMMA_MODEL_NAME", "gemma-2-9b-it")
    USE_MOCK_GEMMA_IF_UNAVAILABLE: bool = True
    
    # Twilio (kept for legacy reference)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")

    # Plivo (active telephony provider)
    PLIVO_AUTH_ID: str = os.getenv("PLIVO_AUTH_ID", "")
    PLIVO_AUTH_TOKEN: str = os.getenv("PLIVO_AUTH_TOKEN", "")
    PLIVO_PHONE_NUMBER: str = os.getenv("PLIVO_PHONE_NUMBER", "")

    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Google Calendar
    GOOGLE_CALENDAR_CREDENTIALS_JSON: str = os.getenv("GOOGLE_CALENDAR_CREDENTIALS_JSON", "")
    USE_DEMO_CALENDAR: bool = True
    
    # Hardware (Arduino UNO Q)
    ARDUINO_SERIAL_PORT: str = os.getenv("ARDUINO_SERIAL_PORT", "/dev/ttyACM0")
    ARDUINO_BAUD_RATE: int = int(os.getenv("ARDUINO_BAUD_RATE", "115200"))
    SIMULATE_ARDUINO_IF_DISCONNECTED: bool = True
    
    # Notifications (Resend / SMTP)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    NOTIFICATION_EMAIL: str = os.getenv("NOTIFICATION_EMAIL", "receptionist@example.com")

settings = Settings()
