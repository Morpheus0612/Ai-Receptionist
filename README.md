# 🎙️ Voice AI Receptionist with Gemma, TabPFN, Tinker & Arduino UNO Q

An enterprise-ready, autonomous voice calling agent built with a decoupled speech & inference pipeline. Features real business task execution, TabPFN call-priority predictions, Thinking Machines Tinker fine-tuned intent models, and physical status controls via Arduino UNO Q.

---

## 🏛️ System Architecture

```
                  ┌───────────────────────────────────────────────┐
                  │                 INCOMING CALL                 │
                  │  Twilio Voice Stream  /  Browser Phone Modal  │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │          FastAPI Call Manager         │
                      │     (Real-time State Machine & WS)    │
                      └───────┬───────────────┬───────────────┘
                              │               │
            ┌─────────────────┴──────┐        └──────────────────┐
            ▼                        ▼                           ▼
┌─────────────────────────┐  ┌───────────────┐          ┌─────────────────┐
│       Google Gemma      │  │ Google/Demo   │          │  Arduino UNO Q  │
│ Intent & Entity Engine  │  │ Calendar API  │          │  Status LED &   │
│ (DigitalOcean Inference)│  │ (Slot Verify) │          │ Physical Buttons│
└───────────┬─────────────┘  └───────────────┘          └─────────────────┘
            │
            ▼
┌─────────────────────────┐
│         TabPFN          │ ──► Intelligent Follow-Up Queue
│ Prior-Data Fitted Model │       (High / Med / Low Priority + Explanations)
└─────────────────────────┘
```

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Live receptionist dashboard & phone simulator |
| **UI Styling** | Tailwind CSS + Lucide Icons | Clean, dark-mode dashboard interface |
| **Backend** | Python 3.12 + FastAPI | APIs, call flow, WebSocket streaming, business rules |
| **Voice Calling** | Twilio Voice + Browser Web Speech | Incoming calls & bi-directional media audio |
| **Speech Processing**| Deepgram STT + Browser SpeechSynthesis | Real-time speech transcription & spoken responses |
| **Main AI Model** | Google Gemma (2B / 9B-IT) | Intent extraction, missing slots, summaries |
| **Inference Hosting**| DigitalOcean GPU Droplet / Fallback | Gemma inference endpoint with local fallback |
| **Fine-Tuning** | Thinking Machines Tinker | Domain LoRA intent model benchmark & evaluation |
| **Predictive ML** | TabPFN | Call priority prediction with factor explanations |
| **Database** | SQLite / PostgreSQL (SQLAlchemy) | Call records, appointments, leads, follow-up queue |
| **Hardware** | Arduino UNO Q / Uno R4 / ESP32 | Physical RGB status LED & Ack/Escalate push buttons |
| **Deployment** | Render (Web Service + Static Site) | Production hosting |

---

## 🎬 5-Scene Demonstration Flow

### Scene 1: The Call Arrives (0:00–0:20)
* **Action:** Incoming call arrives from Jordan Vance.
* **Result:** Dashboard displays call in progress; Arduino indicator turns **BLUE**.

### Scene 2: The AI Understands (0:20–0:45)
* **Caller:** *"Can you arrange a meeting with the sales team next Tuesday?"*
* **AI Logic:** Gemma extracts target date (`next Tuesday`) and department (`Sales`). Detects missing time and contact details. Asks a clarifying follow-up question rather than guessing!

### Scene 3: A Real Action Succeeds (0:45–1:05)
* **Caller:** *"Sure, 2:00 PM works best for me. My name is Jordan Vance and email is jordan.vance@nexusrobotics.io."*
* **AI Logic:** Checks calendar availability for Tuesday 2:00 PM. Verifies no double booking. Creates confirmed appointment and issues confirmation email.

### Scene 4: The System Learns and Prioritizes (1:05–1:30)
* **TabPFN:** Evaluates tabular call outcome features (urgency, unresolved items, deal size, sentiment) and predicts priority category with factor breakdown.
* **Tinker Benchmark:** Evaluates Base Gemma zero-shot (50.0% accuracy, 147.5 ms) against Tinker Fine-Tuned Model (100.0% accuracy, 85.7 ms).

### Scene 5: Show the Result (1:30–2:00)
* **Result:** Call summary saved, appointment confirmed in calendar, priority follow-up logged, and Arduino indicator returns to **GREEN** (Available).

---

## 🛠️ Quickstart & Local Setup

### 1. Prerequisites
* Python 3.12+
* Node.js v18+ & npm

### 2. Backend Setup
```bash
cd ai-receptionist
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Seed initial data
python backend/scripts/seed_data.py

# Run FastAPI Server
PYTHONPATH=. uvicorn backend.app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ai-receptionist/frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser!

---

## 🔌 Hardware Setup (Arduino UNO Q)

1. Open `backend/hardware/ai_receptionist_uno_q.ino` in the Arduino IDE.
2. Connect your **Arduino UNO Q** / Uno R4 / ESP32 via USB.
3. Wire the components:
   * **RGB LED:** Red -> Pin 9, Green -> Pin 10, Blue -> Pin 11.
   * **Button 1 (Acknowledge):** Pin 2 (Internal Pullup) to GND.
   * **Button 2 (Escalate):** Pin 3 (Internal Pullup) to GND.
4. Flash the sketch to the board.
5. Set `ARDUINO_SERIAL_PORT` in `.env` (defaults to auto-detect USB serial or virtual emulator).

---

## 🧪 Testing Guide

You can test the full system in three ways:

1. **Interactive Dashboard UI:**
   * Open the app at [http://localhost:5173](http://localhost:5173).
   * Click **"Auto-Play Full 5-Scene Demo"** or trigger Scenes 1 to 5 step-by-step.
   * Open the **"Simulate Voice Call"** modal to speak or type customized prompts.
2. **Terminal Scripts:**
   * Run Tinker evaluation: `python backend/scripts/eval_tinker.py`
   * Run TabPFN verification: `python backend/scripts/train_tabpfn.py`
3. **Postman / cURL API:**
   * Import `backend/postman_collection.json` to inspect and execute all REST endpoints.
