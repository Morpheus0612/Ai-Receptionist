import React, { useState } from 'react';
import { Sparkles, BarChart3, Check, Flame, Sliders, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { FollowUpItem } from '../types';

interface Props {
  queue: FollowUpItem[];
  onActionComplete: () => void;
}

export const TabPFNPriorityView: React.FC<Props> = ({ queue, onActionComplete }) => {
  const [urgency, setUrgency] = useState(0.85);
  const [dealSize, setDealSize] = useState(25000);
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('negative');
  const [isRepeat, setIsRepeat] = useState(true);
  const [hasMissing, setHasMissing] = useState(true);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tabpfn/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          intent: 'book_meeting',
          urgency,
          sentiment,
          is_repeat_caller: isRepeat,
          requires_follow_up: hasMissing,
          estimated_deal_size: dealSize,
          duration_seconds: 90,
          missing_details: hasMissing ? ['confirmed_time'] : []
        })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setPredictionResult(data);
      }
    } catch (e) {
      console.warn('Error running TabPFN prediction:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await fetch(`/api/tabpfn/acknowledge/${id}`, { method: 'POST' });
      onActionComplete();
    } catch (e) {
      console.warn('Error acknowledging item:', e);
    }
  };

  const handleEscalate = async (id: number) => {
    try {
      await fetch(`/api/tabpfn/escalate/${id}`, { method: 'POST' });
      onActionComplete();
    } catch (e) {
      console.warn('Error escalating item:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Priority Queue List */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white">
              <BarChart3 className="w-4 h-4 text-[#ff9f0a]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Intelligent Follow-Up Queue</h3>
              <p className="text-xs text-[#86868b]">
                Prior-calibrated ranking driven by caller urgency, pipeline size, and sentiment
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-[#86868b] bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
            {queue.length} Pending
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#86868b]">
            No outstanding high or medium priority follow-up items.
          </div>
        ) : (
          <div className="space-y-2.5">
            {queue.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition space-y-2.5 text-xs ${
                  item.escalated
                    ? 'bg-[#ff453a]/10 border-[#ff453a]/30'
                    : item.priority === 'High'
                    ? 'bg-white/[0.03] border-[#ff9f0a]/30'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-xs">{item.caller_name}</span>
                      <span className="text-[#86868b] font-mono text-[11px]">{item.caller_phone}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.priority === 'High'
                            ? 'bg-[#ff453a]/20 text-[#ff453a]'
                            : 'bg-[#ff9f0a]/20 text-[#ff9f0a]'
                        }`}
                      >
                        {item.priority} Priority ({Math.round(item.priority_score * 100)}%)
                      </span>
                    </div>
                    <p className="text-xs text-[#d2d2d7] mt-1">{item.reason}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {!item.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(item.id)}
                        className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-white transition flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3 text-[#34c759]" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                    {!item.escalated && (
                      <button
                        onClick={() => handleEscalate(item.id)}
                        className="px-2.5 py-1 rounded-full bg-[#ff453a]/15 hover:bg-[#ff453a]/25 text-[#ff453a] border border-[#ff453a]/30 text-[11px] font-medium transition flex items-center space-x-1"
                      >
                        <Flame className="w-3 h-3" />
                        <span>Escalate</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulator Section */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-white/[0.06]">
          <Sliders className="w-4 h-4 text-[#af52de]" />
          <div>
            <h4 className="text-sm font-semibold text-white">TabPFN Prioritization Simulator</h4>
            <p className="text-xs text-[#86868b]">Test how caller tabular attributes drive TabPFN prior weights</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-[11px] text-[#86868b] block mb-1">Caller Urgency ({Math.round(urgency * 100)}%)</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={urgency}
              onChange={(e) => setUrgency(parseFloat(e.target.value))}
              className="w-full accent-[#0071e3]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#86868b] block mb-1">Estimated Deal Size (${dealSize.toLocaleString()})</label>
            <input
              type="range"
              min="1000"
              max="100000"
              step="5000"
              value={dealSize}
              onChange={(e) => setDealSize(parseInt(e.target.value, 10))}
              className="w-full accent-[#0071e3]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#86868b] block mb-1">Sentiment</label>
            <select
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value as any)}
              className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        <button
          onClick={runPrediction}
          disabled={loading}
          className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-2xl text-xs font-semibold transition"
        >
          {loading ? 'Evaluating...' : 'Simulate TabPFN Prediction'}
        </button>

        {predictionResult && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#86868b]">Predicted Priority</span>
              <span className={`px-2.5 py-0.5 rounded-full font-semibold ${
                predictionResult.predicted_priority === 'High' ? 'bg-[#ff453a]/20 text-[#ff453a]' : 'bg-[#ff9f0a]/20 text-[#ff9f0a]'
              }`}>
                {predictionResult.predicted_priority} ({Math.round(predictionResult.confidence * 100)}%)
              </span>
            </div>
            <p className="text-[#d2d2d7] leading-relaxed italic">{predictionResult.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};
