import React, { useState } from 'react';
import { Sparkles, BarChart3, Check, Flame, Sliders } from 'lucide-react';
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
        headers: { 'Content-Type': 'application/json' },
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
      const data = await res.json();
      setPredictionResult(data);
    } catch (e) {
      console.error('Error running TabPFN prediction:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    await fetch(`/api/tabpfn/acknowledge/${id}`, { method: 'POST' });
    onActionComplete();
  };

  const handleEscalate = async (id: number) => {
    await fetch(`/api/tabpfn/escalate/${id}`, { method: 'POST' });
    onActionComplete();
  };

  return (
    <div className="space-y-6">
      {/* TabPFN Intelligence Monitor */}
      <div className="apple-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[#af52de] text-[10px] font-medium mb-1 border border-white/[0.08]">
              <Sparkles className="w-3 h-3" />
              <span>Prior-Data Fitted Network</span>
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight">TabPFN Priority Classifier</h3>
            <p className="text-xs text-[#86868b]">
              Predicts supervisor callback prioritization based on tabular historical patterns and urgency
            </p>
          </div>

          <button
            onClick={runPrediction}
            disabled={loading}
            className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-semibold transition self-start sm:self-auto disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Run TabPFN Inference'}
          </button>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#86868b]">Caller Urgency</span>
              <span className="font-semibold text-white">{Math.round(urgency * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={urgency}
              onChange={(e) => setUrgency(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-[#0071e3]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#86868b]">Deal Value</span>
              <span className="font-semibold text-white">${(dealSize / 1000).toFixed(0)}k</span>
            </div>
            <input
              type="range"
              min="1000"
              max="100000"
              step="5000"
              value={dealSize}
              onChange={(e) => setDealSize(parseInt(e.target.value))}
              className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-[#0071e3]"
            />
          </div>

          <div>
            <div className="text-xs text-[#86868b] mb-1.5">Sentiment</div>
            <div className="flex space-x-1">
              {(['positive', 'neutral', 'negative'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSentiment(s)}
                  className={`flex-1 py-1 rounded-full text-[11px] capitalize border transition ${
                    sentiment === s
                      ? s === 'negative'
                        ? 'bg-[#ff453a]/20 border-[#ff453a]/40 text-[#ff453a]'
                        : 'bg-[#0071e3]/20 border-[#0071e3]/40 text-[#2997ff]'
                      : 'bg-white/[0.03] border-white/[0.06] text-[#86868b]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-[#86868b] mb-1.5">Conditions</div>
            <div className="flex space-x-3 pt-0.5">
              <label className="flex items-center space-x-1.5 text-xs text-[#d2d2d7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRepeat}
                  onChange={(e) => setIsRepeat(e.target.checked)}
                  className="rounded bg-[#1c1c1e] border-white/[0.1] text-[#0071e3]"
                />
                <span className="text-[11px]">Repeat Caller</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs text-[#d2d2d7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMissing}
                  onChange={(e) => setHasMissing(e.target.checked)}
                  className="rounded bg-[#1c1c1e] border-white/[0.1] text-[#0071e3]"
                />
                <span className="text-[11px]">Pending Slots</span>
              </label>
            </div>
          </div>
        </div>

        {/* Prediction Results */}
        {predictionResult && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#86868b]">Predicted Priority:</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    predictionResult.predicted_priority === 'High'
                      ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                      : predictionResult.predicted_priority === 'Medium'
                      ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                      : 'bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30'
                  }`}
                >
                  {predictionResult.predicted_priority} ({Math.round(predictionResult.confidence * 100)}% Confidence)
                </span>
              </div>
              <span className="text-[11px] text-[#86868b] font-mono">{predictionResult.model_used}</span>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#d2d2d7]">Key Attribution Factors:</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {predictionResult.factors.map((f: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-medium">{f.factor}</span>
                      <span className="text-[#86868b] font-mono text-[10px]">{f.value}</span>
                    </div>
                    <span className="text-[11px] text-[#34c759] font-medium">{f.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prioritized Review Queue Table */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Intelligent Follow-Up Queue</h3>
            <p className="text-xs text-[#86868b]">Prioritized automatically by TabPFN</p>
          </div>
          <span className="text-xs font-medium text-[#86868b] bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
            {queue.length} Cases
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-8 text-[#86868b] text-xs">
            No items in queue. Completed calls needing follow-up will be listed here automatically.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {queue.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      item.priority === 'High'
                        ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                        : item.priority === 'Medium'
                        ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                        : 'bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30'
                    }`}
                  >
                    {item.priority}
                  </span>
                  <div>
                    <div className="font-semibold text-white">{item.caller_name}</div>
                    <div className="text-[11px] text-[#86868b]">{item.reason}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {item.acknowledged ? (
                    <span className="text-[10px] text-[#34c759] font-medium">Acknowledged</span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(item.id)}
                      className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white transition"
                    >
                      Ack
                    </button>
                  )}
                  {!item.escalated && (
                    <button
                      onClick={() => handleEscalate(item.id)}
                      className="px-3 py-1 rounded-full bg-[#ff453a]/15 hover:bg-[#ff453a]/25 text-[#ff453a] text-xs font-medium transition"
                    >
                      Escalate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
