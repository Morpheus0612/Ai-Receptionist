import React, { useState, useEffect } from 'react';
import { Layers, Check, X, Play, ArrowRight, Loader2, Award, Zap, Sliders } from 'lucide-react';

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
      const res = await fetch('/api/tinker/benchmark', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setBenchmark(data);
      }
    } catch (e) {
      console.warn('Error fetching benchmark:', e);
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
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ utterance: customInput })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setCustomResult(data);
      }
    } catch (e) {
      console.warn('Error evaluating custom utterance:', e);
    } finally {
      setEvaluatingCustom(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
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
                Benchmark comparison: Base Google Gemma 2B/9B vs. Receptionist Fine-Tuned Model
              </p>
            </div>
          </div>

          <button
            onClick={fetchBenchmark}
            disabled={loading}
            className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Re-run Evaluation</span>
          </button>
        </div>

        {/* Metrics Grid */}
        {benchmark?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] text-[#86868b] block mb-1">Base Gemma Accuracy</span>
              <div className="text-xl font-semibold text-white">{benchmark.summary.accuracy.base}</div>
              <span className="text-[10px] text-[#86868b] mt-0.5 block">Zero-shot prompt</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-[#34c759]/30">
              <span className="text-[11px] text-[#86868b] block mb-1">Tinker Tuned Accuracy</span>
              <div className="text-xl font-semibold text-[#34c759]">{benchmark.summary.accuracy.tinker}</div>
              <span className="text-[10px] text-[#34c759] font-medium mt-0.5 block">
                {benchmark.summary.accuracy.improvement} gain
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] text-[#86868b] block mb-1">Inference Latency</span>
              <div className="text-xl font-semibold text-white">{benchmark.summary.average_latency.tinker}</div>
              <span className="text-[10px] text-[#2997ff] font-medium mt-0.5 block">
                {benchmark.summary.average_latency.latency_reduction}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] text-[#86868b] block mb-1">Confidence Score</span>
              <div className="text-xl font-semibold text-white">{benchmark.summary.mean_confidence.tinker}</div>
              <span className="text-[10px] text-[#af52de] font-medium mt-0.5 block">vs {benchmark.summary.mean_confidence.base} base</span>
            </div>
          </div>
        )}

        {/* Test Cases Table */}
        {benchmark?.detailed_cases && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-white px-1">Evaluation Test Set Samples</div>
            <div className="space-y-2">
              {benchmark.detailed_cases.map((c: any) => {
                const basePass = c.base_prediction === c.ground_truth_intent;
                const tinkerPass = c.tinker_prediction === c.ground_truth_intent;

                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-[11px] text-[#86868b] px-1.5 py-0.5 rounded bg-white/[0.04]">
                        {c.id}
                      </span>
                      <p className="flex-1 text-[#f5f5f7] italic leading-relaxed">"{c.input}"</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-white">
                        Truth: {c.ground_truth_intent}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
                      <div className="flex items-center space-x-1.5">
                        {basePass ? (
                          <Check className="w-3.5 h-3.5 text-[#34c759]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-[#ff453a]" />
                        )}
                        <span className="text-[11px] text-[#86868b]">Base:</span>
                        <span className={`text-[11px] font-medium ${basePass ? 'text-white' : 'text-[#ff453a]'}`}>
                          {c.base_prediction} ({c.base_latency_ms}ms)
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {tinkerPass ? (
                          <Check className="w-3.5 h-3.5 text-[#34c759]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-[#ff453a]" />
                        )}
                        <span className="text-[11px] text-[#86868b]">Tinker:</span>
                        <span className="text-[11px] font-medium text-[#34c759]">
                          {c.tinker_prediction} ({c.tinker_latency_ms}ms)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Custom Evaluator */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-white/[0.06]">
          <Sliders className="w-4 h-4 text-[#2997ff]" />
          <h4 className="text-sm font-semibold text-white">Interactive Model Comparison</h4>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a sample customer phrase, e.g. 'Can I book a demo with the enterprise sales rep next Monday?'"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomEval()}
            className="flex-1 bg-[#1c1c1e] border border-white/[0.1] rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#0071e3]"
          />
          <button
            onClick={handleCustomEval}
            disabled={evaluatingCustom || !customInput.trim()}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white rounded-2xl text-xs font-semibold transition shrink-0"
          >
            {evaluatingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Compare'}
          </button>
        </div>

        {customResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[11px] text-[#86868b] font-medium block">
                {customResult.base_model.name}
              </span>
              <div className="text-sm font-semibold text-white capitalize">
                {customResult.base_model.intent.replace(/_/g, ' ')}
              </div>
              <div className="text-[10px] text-[#86868b]">
                Latency: {customResult.base_model.latency_ms}ms • Confidence: {Math.round(customResult.base_model.confidence * 100)}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-[#af52de]/30 space-y-1">
              <span className="text-[11px] text-[#af52de] font-medium block">
                {customResult.tinker_model.name}
              </span>
              <div className="text-sm font-semibold text-white capitalize">
                {customResult.tinker_model.intent.replace(/_/g, ' ')}
              </div>
              <div className="text-[10px] text-[#34c759] font-medium">
                Latency: {customResult.tinker_model.latency_ms}ms • Confidence: {Math.round(customResult.tinker_model.confidence * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
