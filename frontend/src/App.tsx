import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, Activity, Sparkles, Layers } from 'lucide-react';
import { CallRecord } from './types';
import { TinkerEvaluationView } from './components/TinkerEvaluationView';
import { GeminiDialerModal } from './components/GeminiDialerModal';
import { PhoneSimulatorModal } from './components/PhoneSimulatorModal';

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tinker'>('overview');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [activeCallSession, setActiveCallSession] = useState<any>(null);

  const fetchData = async () => {
    try {
      const callsRes = await fetch('/api/calls/records');
      if (callsRes.ok) setCalls(await callsRes.json());
    } catch (e) {
      console.error('Error fetching dashboard state:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;

          if (type === 'call_started') {
            setActiveCallSession(data);
            fetchData();
          } else if (type === 'call_analysis_update') {
            setActiveCallSession((prev: any) => ({ ...prev, ...data }));
          } else if (type === 'call_completed') {
            setActiveCallSession(null);
            fetchData();
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };
    } catch (err) {
      console.warn('WS fallback to polling:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-black text-[#f5f5f7]">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 apple-glass border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold tracking-tight text-white">AI Receptionist</span>
                <span className="text-[10px] text-[#86868b] font-mono">OS 2.0</span>
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="hidden md:flex items-center space-x-4 text-xs text-[#86868b]">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
              <span>Gemini Active</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#af52de]" />
              <span>Tinker Ready</span>
            </div>
            {activeCallSession && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] animate-pulse" />
                  <span className="text-[#2997ff] font-medium">Call In Progress</span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsGeminiModalOpen(true)}
              className="px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white rounded-full text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call My Phone</span>
            </button>

            <button
              onClick={() => setIsPhoneModalOpen(true)}
              className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] text-white rounded-full text-xs font-medium transition flex items-center space-x-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-[#86868b]" />
              <span className="hidden sm:inline">Browser Line</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto flex space-x-1 border-t border-white/[0.04]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-black font-semibold'
                : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('tinker')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              activeTab === 'tinker'
                ? 'bg-white text-black font-semibold'
                : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Tinker Evaluation
          </button>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
          <div className="apple-card p-4">
            <span className="text-[11px] text-[#86868b] font-medium block">Total Call Records</span>
            <div className="text-2xl font-semibold tracking-tight text-white mt-1">{calls.length}</div>
            <span className="text-[10px] text-[#34c759] font-medium mt-0.5 block">Logged in database</span>
          </div>

          <div className="apple-card p-4">
            <span className="text-[11px] text-[#86868b] font-medium block">Active Session</span>
            <div className="text-2xl font-semibold tracking-tight text-white mt-1">
              {activeCallSession ? '1' : '0'}
            </div>
            <span className="text-[10px] text-[#2997ff] font-medium mt-0.5 block">
              {activeCallSession ? 'Call in progress' : 'No active call'}
            </span>
          </div>

          <div className="apple-card p-4">
            <span className="text-[11px] text-[#86868b] font-medium block">AI Engine</span>
            <div className="text-lg font-semibold tracking-tight text-white mt-1">Gemini</div>
            <span className="text-[10px] text-[#af52de] font-medium mt-0.5 block">Live API • Speech</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Active Call Card */}
            {activeCallSession ? (
              <div className="apple-card p-6 border border-[#2997ff]/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-[#2997ff]/15 border border-[#2997ff]/30 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4 text-[#2997ff]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Call In Progress</h3>
                      <p className="text-xs text-[#86868b]">{activeCallSession.caller_number || 'Unknown number'}</p>
                    </div>
                  </div>
                  <span className="flex items-center space-x-1.5 text-xs text-[#2997ff] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] animate-pulse" />
                    <span>LIVE</span>
                  </span>
                </div>
                {activeCallSession.current_intent && (
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-[11px] text-[#86868b] mb-1">Detected Intent</p>
                    <p className="text-sm text-white">{activeCallSession.current_intent}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="apple-card p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[160px]">
                <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#86868b]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">No Active Calls</p>
                  <p className="text-xs text-[#86868b] mt-1">Use <strong>Call My Phone</strong> to start a Gemini-powered call, or open the Browser Line for a simulated session.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsGeminiModalOpen(true)}
                    className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium transition"
                  >
                    Call My Phone
                  </button>
                  <button
                    onClick={() => setIsPhoneModalOpen(true)}
                    className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-full text-xs font-medium transition"
                  >
                    Browser Line
                  </button>
                </div>
              </div>
            )}

            {/* Recent Calls */}
            <div className="apple-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#86868b]" />
                  <h3 className="text-sm font-semibold text-white">Recent Call Records</h3>
                </div>
                <span className="text-[11px] text-[#86868b]">{calls.length} total</span>
              </div>

              {calls.length === 0 ? (
                <p className="text-xs text-[#86868b] text-center py-6">No calls recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {calls.slice(0, 8).map((call: any) => (
                    <div key={call.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${call.status === 'completed' ? 'bg-[#34c759]' : call.status === 'failed' ? 'bg-[#ff453a]' : 'bg-[#2997ff]'}`} />
                        <div>
                          <p className="text-xs font-medium text-white">{call.caller_number || 'Unknown'}</p>
                          <p className="text-[11px] text-[#86868b]">{call.intent_summary || 'No summary'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-[#86868b]">{call.status}</p>
                        <p className="text-[10px] text-[#636366]">{call.created_at ? new Date(call.created_at).toLocaleTimeString() : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="apple-card p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#af52de]" />
                  <h3 className="text-sm font-semibold text-white">Gemini AI Engine</h3>
                </div>
                <p className="text-xs text-[#86868b] leading-relaxed">
                  Powered by Gemini Live API for real-time speech understanding. The AI extracts caller intent, asks clarifying questions, and delivers natural spoken responses.
                </p>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
                  <span className="text-[11px] text-[#34c759] font-medium">Ready for calls</span>
                </div>
              </div>

              <div className="apple-card p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#ff9f0a]" />
                  <h3 className="text-sm font-semibold text-white">Backend Services</h3>
                </div>
                <div className="space-y-1.5 text-xs font-mono text-[#d2d2d7]">
                  <div><span className="text-[#86868b]">API:</span> FastAPI · Python</div>
                  <div><span className="text-[#86868b]">Database:</span> PostgreSQL + SQLAlchemy</div>
                  <div><span className="text-[#86868b]">Queue:</span> Redis + Celery</div>
                  <div><span className="text-[#86868b]">Deploy:</span> Render</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tinker' && (
          <TinkerEvaluationView />
        )}
      </main>

      {/* Gemini Call Modal */}
      <GeminiDialerModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        onCallTriggered={fetchData}
      />

      {/* Browser Phone Simulator Modal */}
      <PhoneSimulatorModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onCallStateChanged={fetchData}
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-5 mt-auto bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868b] gap-2">
          <div>AI Receptionist OS • Powered by Gemini API + Tinker</div>
          <div className="flex items-center space-x-4">
            <span>Render Deploy Ready</span>
            <span>DigitalOcean Gemma Endpoint</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
