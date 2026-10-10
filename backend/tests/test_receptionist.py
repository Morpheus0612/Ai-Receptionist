import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.schema import Appointment

class TestAIReceptionist(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        # Clean up test appointments before each test run
        db = SessionLocal()
        try:
            db.query(Appointment).filter(Appointment.attendee_name == "Jordan Vance").delete()
            db.commit()
        finally:
            db.close()

    def test_health(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")

    def test_scenes_1_to_5_full_walkthrough(self):
        # Scene 1: The Call Arrives
        r1 = self.client.post("/api/demo/run-scene/1")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json()["scene"], 1)
        self.assertEqual(r1.json()["hardware"]["color"], "BLUE")

        # Scene 2: The AI Understands & Asks Clarification
        r2 = self.client.post("/api/demo/run-scene/2")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["scene"], 2)
        self.assertEqual(r2.json()["result"]["analysis"]["intent"], "book_meeting")
        self.assertTrue(r2.json()["result"]["analysis"]["requires_follow_up"])
        self.assertIn("Next Tuesday", r2.json()["result"]["response_text"])

        # Scene 3: A Real Action Succeeds (Calendar Booking Confirmed)
        r3 = self.client.post("/api/demo/run-scene/3")
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.json()["scene"], 3)
        self.assertEqual(r3.json()["result"]["action_executed"], "Meeting Booked")
        self.assertIn("successfully confirmed", r3.json()["result"]["response_text"])

        # Scene 4: The System Learns and Prioritizes (TabPFN + Tinker)
        r4 = self.client.post("/api/demo/run-scene/4")
        self.assertEqual(r4.status_code, 200)
        self.assertEqual(r4.json()["scene"], 4)
        self.assertIn("predicted_priority", r4.json()["tabpfn_prediction"])
        self.assertIn("accuracy", r4.json()["tinker_evaluation"])

        # Scene 5: Show the Result & Hardware Return to Available
        r5 = self.client.post("/api/demo/run-scene/5")
        self.assertEqual(r5.status_code, 200)
        self.assertEqual(r5.json()["scene"], 5)
        self.assertEqual(r5.json()["hardware"]["status"], "AVAILABLE")
        self.assertEqual(r5.json()["hardware"]["color"], "GREEN")

    def test_hardware_push_buttons(self):
        # Test Acknowledge button
        r1 = self.client.post("/api/hardware/button", json={"action": "ACKNOWLEDGE"})
        self.assertEqual(r1.status_code, 200)
        self.assertTrue(r1.json()["acknowledged"])
        self.assertEqual(r1.json()["color"], "GREEN")

        # Test Escalate button
        r2 = self.client.post("/api/hardware/button", json={"action": "ESCALATE"})
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(r2.json()["escalated"])
        self.assertEqual(r2.json()["color"], "RED")

    def test_tabpfn_direct_prediction(self):
        payload = {
            "intent": "support_query",
            "urgency": 0.95,
            "sentiment": "negative",
            "is_repeat_caller": True,
            "requires_follow_up": True,
            "estimated_deal_size": 20000.0,
            "duration_seconds": 120,
            "missing_details": ["diagnostic_dump"]
        }
        res = self.client.post("/api/tabpfn/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["predicted_priority"], ["High", "Medium", "Low"])
        self.assertGreater(len(data["factors"]), 0)

    def test_tinker_benchmark_endpoint(self):
        res = self.client.get("/api/tinker/benchmark")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("summary", data)
        self.assertIn("detailed_cases", data)

if __name__ == "__main__":
    unittest.main()
