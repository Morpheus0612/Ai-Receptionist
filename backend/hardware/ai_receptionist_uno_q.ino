/*
 * AI Receptionist - Arduino UNO Q / Uno R4 / ESP32 Physical Status Indicator
 * 
 * Functions:
 * 1. RGB LED Status Indicator:
 *    - GREEN: Available (Ready for incoming calls)
 *    - BLUE: In-Call (Active voice conversation in progress)
 *    - AMBER / YELLOW: Callback Needed (Intelligent follow-up queue item)
 *    - RED: Escalated (Urgent review requested)
 * 2. Physical Controls:
 *    - Button 1 (Pin 2): ACKNOWLEDGE follow-up request
 *    - Button 2 (Pin 3): ESCALATE priority to management
 * 3. Bidirectional Serial Protocol:
 *    - Incoming commands: "SET:<STATUS>:<COLOR>\n"
 *    - Outgoing events:   "BTN:<ACTION>\n"
 */

// Pin Assignments
const int PIN_RED_LED   = 9;   // PWM pin for Red channel
const int PIN_GREEN_LED = 10;  // PWM pin for Green channel
const int PIN_BLUE_LED  = 11;  // PWM pin for Blue channel

const int PIN_BTN_ACK   = 2;   // Button 1: Acknowledge (Internal Pullup)
const int PIN_BTN_ESC   = 3;   // Button 2: Escalate (Internal Pullup)

// State Tracking
String currentStatus = "AVAILABLE";
unsigned long lastDebounceTimeAck = 0;
unsigned long lastDebounceTimeEsc = 0;
const unsigned long DEBOUNCE_DELAY = 250;

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000) {
    // Wait for serial connection
  }

  pinMode(PIN_RED_LED, OUTPUT);
  pinMode(PIN_GREEN_LED, OUTPUT);
  pinMode(PIN_BLUE_LED, OUTPUT);

  pinMode(PIN_BTN_ACK, INPUT_PULLUP);
  pinMode(PIN_BTN_ESC, INPUT_PULLUP);

  // Initial State: GREEN (Available)
  setRGB(0, 255, 0);
  Serial.println("DEVICE:READY:ARDUINO_UNO_Q");
}

void loop() {
  // 1. Process Serial Commands from AI Receptionist Backend
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.startsWith("SET:")) {
      handleSetCommand(input);
    }
  }

  // 2. Read Physical Push Buttons with Debouncing
  int ackState = digitalRead(PIN_BTN_ACK);
  int escState = digitalRead(PIN_BTN_ESC);

  // Button 1 (Acknowledge) pressed (active LOW)
  if (ackState == LOW && (millis() - lastDebounceTimeAck > DEBOUNCE_DELAY)) {
    lastDebounceTimeAck = millis();
    Serial.println("BTN:ACKNOWLEDGE");
    // Visual flash confirmation
    flashFeedback();
    setRGB(0, 255, 0); // Reset to green
  }

  // Button 2 (Escalate) pressed (active LOW)
  if (escState == LOW && (millis() - lastDebounceTimeEsc > DEBOUNCE_DELAY)) {
    lastDebounceTimeEsc = millis();
    Serial.println("BTN:ESCALATE");
    setRGB(255, 0, 0); // Immediate red alert
  }

  delay(20);
}

void handleSetCommand(String command) {
  // Command format: SET:<STATUS>:<COLOR>
  // e.g., SET:IN_CALL:BLUE
  int firstColon = command.indexOf(':');
  int secondColon = command.indexOf(':', firstColon + 1);

  if (firstColon != -1 && secondColon != -1) {
    String status = command.substring(firstColon + 1, secondColon);
    String color = command.substring(secondColon + 1);

    currentStatus = status;

    if (color == "GREEN") {
      setRGB(0, 255, 0);
    } else if (color == "BLUE") {
      setRGB(0, 100, 255);
    } else if (color == "AMBER" || color == "YELLOW") {
      setRGB(255, 140, 0);
    } else if (color == "RED") {
      setRGB(255, 0, 0);
    }

    Serial.print("ACK:STATE:");
    Serial.println(status);
  }
}

void setRGB(int red, int green, int blue) {
  analogWrite(PIN_RED_LED, red);
  analogWrite(PIN_GREEN_LED, green);
  analogWrite(PIN_BLUE_LED, blue);
}

void flashFeedback() {
  for (int i = 0; i < 2; i++) {
    setRGB(0, 0, 0);
    delay(60);
    setRGB(255, 255, 255);
    delay(60);
  }
}
