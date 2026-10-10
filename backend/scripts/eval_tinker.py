#!/usr/bin/env python3
"""
Tinker Fine-Tuning Evaluation Script
Compares Base Google Gemma model against Thinking Machines Tinker Fine-Tuned Intent Model.
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.app.services.tinker_service import tinker_service

def main():
    print("=" * 70)
    print("THINKING MACHINES TINKER — INTENT BENCHMARK EVALUATION")
    print("=" * 70)
    
    results = tinker_service.run_benchmark_evaluation()
    summary = results["summary"]
    
    print(f"Total Test Benchmark Samples: {summary['total_test_samples']}")
    print(f"Base Model:    {summary['base_model']}")
    print(f"Tinker Model:  {summary['tinker_model']}")
    print("-" * 70)
    print(f"Accuracy:")
    print(f"  • Base Model:       {summary['accuracy']['base']}")
    print(f"  • Tinker Model:     {summary['accuracy']['tinker']}")
    print(f"  • Improvement:      {summary['accuracy']['improvement']}")
    print(f"Inference Latency:")
    print(f"  • Base Model:       {summary['average_latency']['base']}")
    print(f"  • Tinker Model:     {summary['average_latency']['tinker']}")
    print(f"  • Performance:      {summary['average_latency']['latency_reduction']}")
    print("-" * 70)
    print("Detailed Test Cases:")
    for item in results["detailed_cases"]:
        match_base = "✓" if item["base_prediction"] == item["ground_truth_intent"] else "✗"
        match_tinker = "✓" if item["tinker_prediction"] == item["ground_truth_intent"] else "✗"
        print(f"[{item['id']}] Input: \"{item['input'][:55]}...\"")
        print(f"     Target: {item['ground_truth_intent']} | Base: {item['base_prediction']} ({match_base}) | Tinker: {item['tinker_prediction']} ({match_tinker})")
    print("=" * 70)

if __name__ == "__main__":
    main()
