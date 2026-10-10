import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, Activity, Sparkles, Layers, Calendar, Sliders, Cpu, Award } from 'lucide-react';
import { CallRecord, Appointment, FollowUpItem, HardwareState } from './types';
import { TinkerEvaluationView } from './components/TinkerEvaluationView';
import { GeminiDialerModal } from './components/GeminiDialerModal';
import { PhoneSimulatorModal } from './components/PhoneSimulatorModal';
import { TelephonyDialerModal } from './components/TelephonyDialerModal';
import { CalendarAppointmentsView } from './components/CalendarAppointmentsView';
import { TabPFNPriorityView } from './components/TabPFNPriorityView';
import { ArduinoStatusWidget } from './components/ArduinoStatusWidget';
import { InteractiveDemoGuide } from './components/InteractiveDemoGuide';

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'tabpfn' | 'tinker'>('overview');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [isTelephonyModalOpen, setIsTelephonyModalOpen] = useState(false);
  const [simulatorCaller, setSimulatorCaller] = useState({ name: 'Alex Mercer', number: '+1-555-0199' });

  const handleOpenBrowserLine = (name?: string, number?: string) => {
    if (name || number) {
      setSimulatorCaller({
        name: name || 'Caller',
        number: number || '+1-555-0199'
      });
    }
    setIsPhoneModalOpen(true);
  };

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<FollowUpItem[]>([]);
  const [hardwareState, setHardwareState] = useState<HardwareState>({
    status: 'AVAILABLE',
    color: 'GREEN',
    description: 'System ready. Receptionist available for calls.',
    last_action: 'INITIALIZED',
    acknowledged: false,
    escalated: false,
    is_hardware_detected: false,
    port: 'Virtual UNO Q Port'
  });
  const [activeCallSession, setActiveCallSession] = useState<any>(null);

  const safeFetchJson = async <T,>(url: string): Promise<T | null> => {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-cache'
      });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.toLowerCase().includes('application/json')) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  };

  const fetchData = async () => {
    try {
      const [newCalls, newApps, newQueue, newHw] = await Promise.all([
        safeFetchJson<CallRecord[]>('/api/calls/records'),
        safeFetchJson<Appointment[]>('/api/calendar/appointments'),
        safeFetchJson<FollowUpItem[]>('/api/tabpfn/queue'),
        safeFetchJson<HardwareState>('/api/hardware/state')
      ]);

      if (newCalls) setCalls(newCalls);
      if (newApps) setAppointments(newApps);
      if (newQueue) setQueue(newQueue);
      if (newHw) setHardwareState(newHw);
    } catch {
      // transient network failures during reload ignored cleanly
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    try {
      if (typeof window !== 'undefined' && window.location && window.location.host) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          if (!isMounted) return;
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
            } else if (type === 'hardware_update') {
              setHardwareState(data);
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onerror = () => {
          // ignore WebSocket errors per environment constraint
        };
      }
    } catch {
      // WebSocket fallback to polling handled by interval
    }

    return () => {
      isMounted = false;
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#af52de] animate-pulse" />
              <span>Vapi AI & Gemma Active</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${hardwareState.color === 'BLUE' ? 'bg-[#2997ff] animate-pulse' : hardwareState.color === 'RED' ? 'bg-[#ff453a]' : hardwareState.color === 'AMBER' ? 'bg-[#ff9f0a]' : 'bg-[#34c759]'}`} />
              <span>UNO Q: {hardwareState.status}</span>
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
              onClick={() => setIsTelephonyModalOpen(true)}
              className="px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white rounded-full text-xs font-medium transition flex items-center space-x-1.5 shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call a Person (Vapi AI)</span>
            </button>

            <button
              onClick={() => handleOpenBrowserLine()}
              className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] text-white rounded-full text-xs font-medium transition flex items-center space-x-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-[#86868b]" />
              <span className="hidden sm:inline">Browser Audio Line</span>
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
            onClick={() => setActiveTab('appointments')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              activeTab === 'appointments'
                ? 'bg-white text-black font-semibold'
                : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Calendar Bookings ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('tabpfn')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              activeTab === 'tabpfn'
                ? 'bg-white text-black font-semibold'
                : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            TabPFN Priority Queue ({queue.length})
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="apple-card p-4">
            <span className="text-[11px] text-[#86868b] font-medium block">Total Call Records</span>
            <div className="text-2xl font-semibold tracking-tight text-white mt-1">{calls.length}</div>
            <span className="text-[10px] text-[#34c759] font-medium mt-0.5 block">Logged in system</span>
          </div>

          <div className="apple-card p-4">
            <span className="text-[11px] text-[#86868b] font-medium block">Active Session</span>
            <div className="text-2xl font-semibold tracking-tight text-white mt-1">
              {activeCallSession ? '1' : '0'}
            </div>
            <span className="text-[10px] text-[#2997ff] font-medium mt-0.5 block">
              {activeCallSession ? 'Live turn in progress' : 'No active call'}
            </span>
          </div>

          <div className="apple-card p-4">
            <span className="text-[11px] text-[#86868b] font-medium block">Booked Appointments</span>
            <div className="text-2xl font-semibold tracking-tight text-white mt-1">{appointments.length}</div>
            <span className="text-[10px] text-[#34c759] font-medium mt-0.5 block">Confirmed calendar slots</span>
          </div>

          <div className="apple-card p-4">
            <span className="text-[11px] text-[#86868b] font-medium block">Hardware Indicator</span>
            <div className="text-base font-semibold tracking-tight text-white mt-1 flex items-center space-x-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${hardwareState.color === 'BLUE' ? 'bg-[#2997ff] led-blue' : hardwareState.color === 'RED' ? 'bg-[#ff453a] led-red' : hardwareState.color === 'AMBER' ? 'bg-[#ff9f0a] led-amber' : 'bg-[#34c759] led-green'}`} />
              <span>{hardwareState.color}</span>
            </div>
            <span className="text-[10px] text-[#86868b] font-medium mt-0.5 block truncate">{hardwareState.status}</span>
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
                      <p className="text-xs text-[#86868b]">{activeCallSession.caller_name || 'Caller'} • {activeCallSession.caller_number || 'Unknown number'}</p>
                    </div>
                  </div>
                  <span className="flex items-center space-x-1.5 text-xs text-[#2997ff] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] animate-pulse" />
                    <span>LIVE</span>
                  </span>
                </div>
                {activeCallSession.intent && (
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                    <p className="text-[11px] text-[#86868b] mb-1">Detected Intent</p>
                    <p className="text-sm text-white font-medium capitalize">{activeCallSession.intent.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="apple-card p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[140px]">
                <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#86868b]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">No Active Calls</p>
                  <p className="text-xs text-[#86868b] mt-1">Start a <strong>Voice Call</strong> to dispatch a session, open the <strong>Browser Audio Line</strong> to speak directly to the AI, or run scripted demo scenes below.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsTelephonyModalOpen(true)}
                    className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium transition"
                  >
                    Start Voice Call
                  </button>
                  <button
                    onClick={() => handleOpenBrowserLine()}
                    className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-full text-xs font-medium transition"
                  >
                    Browser Audio Line
                  </button>
                </div>
              </div>
            )}

            {/* Hardware Status & Interactive Demo Guide Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <ArduinoStatusWidget hardwareState={hardwareState} onRefresh={fetchData} />
              </div>
              <div className="lg:col-span-2">
                <InteractiveDemoGuide onSceneTriggered={fetchData} />
              </div>
            </div>

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
                        <div className={`w-2 h-2 rounded-full ${call.status === 'completed' ? 'bg-[#34c759]' : call.status === 'failed' ? 'bg-[#ff453a]' : 'bg-[#2997ff]'}`} />
                        <div>
                          <p className="text-xs font-medium text-white">{call.caller_name || 'Caller'} <span className="text-[#86868b]">({call.caller_number || 'Unknown'})</span></p>
                          <p className="text-[11px] text-[#86868b]">{call.summary || call.intent || 'No summary'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${call.priority === 'High' ? 'bg-[#ff453a]/20 text-[#ff453a]' : call.priority === 'Medium' ? 'bg-[#ff9f0a]/20 text-[#ff9f0a]' : 'bg-[#34c759]/20 text-[#34c759]'}`}>
                          {call.priority || 'Medium'} Priority
                        </span>
                        <p className="text-[10px] text-[#636366] mt-0.5">{call.created_at ? new Date(call.created_at).toLocaleTimeString() : ''}</p>
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
                  <h3 className="text-sm font-semibold text-white">Gemma & Gemini Voice Engine</h3>
                </div>
                <p className="text-xs text-[#86868b] leading-relaxed">
                  Real-time speech understanding powered by Google Gemma intent extraction and Gemini Live Audio pipeline. Automatically extracts meeting times, attendees, departments, and clarification questions.
                </p>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
                  <span className="text-[11px] text-[#34c759] font-medium">Ready for calls</span>
                </div>
              </div>

              <div className="apple-card p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#ff9f0a]" />
                  <h3 className="text-sm font-semibold text-white">Integrated Architecture</h3>
                </div>
                <div className="space-y-1.5 text-xs font-mono text-[#d2d2d7]">
                  <div><span className="text-[#86868b]">Runtime:</span> Node.js 22 · Express API</div>
                  <div><span className="text-[#86868b]">ML Engine:</span> TabPFN Prior Classifier</div>
                  <div><span className="text-[#86868b]">Telephony:</span> Vapi AI API · Cellular Outbound</div>
                  <div><span className="text-[#86868b]">Tuning:</span> Thinking Machines Tinker Benchmark</div>
                  <div><span className="text-[#86868b]">Hardware:</span> Arduino UNO Q Status Indicator</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Appointments Tab */}
        {activeTab === 'appointments' && (
          <CalendarAppointmentsView appointments={appointments} />
        )}

        {/* TabPFN Priority Queue Tab */}
        {activeTab === 'tabpfn' && (
          <TabPFNPriorityView queue={queue} onActionComplete={fetchData} />
        )}

        {/* Tinker Evaluation Tab */}
        {activeTab === 'tinker' && (
          <TinkerEvaluationView />
        )}
      </main>

      {/* Gemini Call Modal */}
      <GeminiDialerModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        onCallTriggered={fetchData}
        onOpenBrowserLine={handleOpenBrowserLine}
      />

      {/* Browser Phone Simulator Modal */}
      <PhoneSimulatorModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onCallStateChanged={fetchData}
        initialCallerName={simulatorCaller.name}
        initialCallerNumber={simulatorCaller.number}
      />

      {/* Telephony Dialer Modal */}
      <TelephonyDialerModal
        isOpen={isTelephonyModalOpen}
        onClose={() => setIsTelephonyModalOpen(false)}
        onCallTriggered={fetchData}
        onOpenBrowserLine={handleOpenBrowserLine}
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-5 mt-auto bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868b] gap-2">
          <div>AI Receptionist OS • Powered by Gemma, Gemini API & TabPFN</div>
          <div className="flex items-center space-x-4">
            <span>Arduino UNO Q Virtual & Physical Link</span>
            <span>Tinker Fine-Tuning Evaluator</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
