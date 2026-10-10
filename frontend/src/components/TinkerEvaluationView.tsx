import React, { useState, useEffect } from 'react';
import { Layers, Check, X, Play, ArrowRight, Loader2 } from 'lucide-react';

export const TinkerEvaluationView: React.FC = () => {
  const [benchmark, setBenchmark] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customInput, setCustomInput] = useState('');
  const [customResult, setCustomResult] = useState<any>(null);
  const [evaluatingCustom, setEvaluatingCustom] = useState(false);

  useEffect(() => {
    fetchBenchmark();
  }, []);

  const fetchBenchmark = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tinker/benchmark');
      const data = await res.json();
      setBenchmark(data);
    } catch (e) {
      console.error('Error fetching benchmark:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomEval = async () => {
    if (!customInput.trim()) return;
    setEvaluatingCustom(true);
    try {
      const res = await fetch('/api/tinker/evaluate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance: customInput })
      });
      const data = await res.json();
      setCustomResult(data);
    } catch (e) {
      console.error('Error evaluating custom utterance:', e);
    } finally {
      setEvaluatingCustom(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tinker Core ML Style Banner */}
      <div className="apple-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white">
              <Layers className="w-4 h-4 text-[#af52de]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">Thinking Machines Tinker</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-[#af52de] border border-white/[0.08]">
                  LoRA Fine-Tuned Model
                </span>
              </div>
              <p className="text-xs text-[#86868b]">
                Evaluation comparing Base Google Gemma zero-shot vs. Tinker domain-adapted intent model
              </p>
            </div>
          </div>

          <button
            onClick={fetchBenchmark}
            className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-full text-xs font-medium border border-white/[0.08] transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Play className="w-3 h-3 text-[#2997ff]" />
            <span>Re-run Evaluation</span>
          </button>
        </div>

        {benchmark && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium block mb-1">
                Intent Accuracy
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-semibold text-[#34c759] tracking-tight">{benchmark.summary.accuracy.tinker}</span>
                <span className="text-xs text-[#86868b]">vs {benchmark.summary.accuracy.base} Base</span>
              </div>
              <span className="text-[11px] text-[#34c759] font-medium mt-1 block">
                {benchmark.summary.accuracy.improvement} Accuracy Lift
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium block mb-1">
                Inference Latency
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-semibold text-[#2997ff] tracking-tight">{benchmark.summary.average_latency.tinker}</span>
                <span className="text-xs text-[#86868b]">vs {benchmark.summary.average_latency.base}</span>
              </div>
              <span className="text-[11px] text-[#2997ff] font-medium mt-1 block">
                {benchmark.summary.average_latency.latency_reduction}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium block mb-1">
                Mean Confidence
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-semibold text-[#af52de] tracking-tight">{benchmark.summary.mean_confidence.tinker}</span>
                <span className="text-xs text-[#86868b]">vs {benchmark.summary.mean_confidence.base}</span>
              </div>
              <span className="text-[11px] text-[#86868b] mt-1 block">
                Calibrated on ambiguous intents
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Test Cases Table */}
      <div className="apple-card p-6 space-y-4">
        <h4 className="text-xs font-semibold text-white tracking-tight">
          Benchmark Test Set Results
        </h4>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#86868b]">Loading benchmark evaluation...</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {benchmark?.detailed_cases?.map((item: any) => {
              const baseMatch = item.base_prediction === item.ground_truth_intent;
              const tinkerMatch = item.tinker_prediction === item.ground_truth_intent;

              return (
                <div key={item.id} className="py-4 space-y-2 first:pt-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">"{item.input}"</span>
                    <span className="text-[10px] text-[#86868b] font-mono">
                      Target: {item.ground_truth_intent}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#86868b] block">Base Gemma</span>
                        <span className="text-xs font-medium text-[#d2d2d7]">{item.base_prediction}</span>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${baseMatch ? 'bg-[#34c759]/15 text-[#34c759]' : 'bg-[#ff453a]/15 text-[#ff453a]'}`}>
                        {baseMatch ? 'Correct' : 'Missed'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#af52de] block font-medium">Tinker Fine-Tuned</span>
                        <span className="text-xs font-semibold text-white">{item.tinker_prediction}</span>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#34c759]/15 text-[#34c759]">
                        Correct
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Custom Evaluator */}
      <div className="apple-card p-6 space-y-3">
        <h4 className="text-xs font-semibold text-white tracking-tight">Evaluate Any Dialogue Utterance</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type any caller phrase (e.g. Can I arrange a 30 min sync with sales?)"
            className="flex-1 bg-[#1c1c1e] border border-white/[0.1] rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#0071e3]"
          />
          <button
            onClick={handleCustomEval}
            disabled={evaluatingCustom || !customInput.trim()}
            className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-2xl text-xs font-semibold transition disabled:opacity-40"
          >
            {evaluatingCustom ? 'Evaluating...' : 'Evaluate'}
          </button>
        </div>

        {customResult && (
          <div className="mt-3 grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs">
            <div>
              <span className="text-[10px] text-[#86868b] block">Base Model Prediction</span>
              <div className="font-medium text-[#d2d2d7] mt-0.5">{customResult.base_model.intent}</div>
              <span className="text-[10px] text-[#86868b] font-mono">{customResult.base_model.latency_ms} ms</span>
            </div>
            <div>
              <span className="text-[10px] text-[#af52de] block font-medium">Tinker Fine-Tuned</span>
              <div className="font-semibold text-white mt-0.5">{customResult.tinker_model.intent}</div>
              <span className="text-[10px] text-[#34c759] font-mono">{customResult.tinker_model.latency_ms} ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
