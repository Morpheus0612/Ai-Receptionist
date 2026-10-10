#!/usr/bin/env python3
"""
TabPFN Priority Training & Verification Script
Validates prior-data tabular predictions on historical receptionist data.
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.app.services.tabpfn_service import tabpfn_service

def main():
    print("=" * 70)
    print("TABPFN — CALL-PRIORITY PREDICTION VERIFICATION")
    print("=" * 70)
    
    test_cases = [
        {
            "desc": "High Urgency Frustrated Caller with Unresolved Issue",
            "data": {
                "intent": "support_query",
                "urgency": 0.95,
                "sentiment": "negative",
                "is_repeat_caller": True,
                "requires_follow_up": True,
                "estimated_deal_size": 20000.0,
                "duration_seconds": 120,
                "missing_details": ["error_log"]
            }
        },
        {
            "desc": "Routine Confirmed Meeting with Standard Urgency",
            "data": {
                "intent": "book_meeting",
                "urgency": 0.35,
                "sentiment": "positive",
                "is_repeat_caller": False,
                "requires_follow_up": False,
                "estimated_deal_size": 5000.0,
                "duration_seconds": 45,
                "missing_details": []
            }
        }
    ]

    for tc in test_cases:
        res = tabpfn_service.predict_priority(tc["data"])
        print(f"\nScenario: {tc['desc']}")
        print(f"Model: {res['model_used']}")
        print(f"Predicted Priority: {res['predicted_priority']} (Confidence: {int(res['confidence'] * 100)}%)")
        print(f"Class Probabilities: {res['class_probabilities']}")
        print("Factor Attribution:")
        for f in res["factors"]:
            print(f"  • {f['factor']} ({f['value']}): {f['impact']}")

    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()
