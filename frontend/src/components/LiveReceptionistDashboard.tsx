import React, { useState } from 'react';
import { Phone, CheckCircle2, Clock, Calendar, User, Search, Sparkles, PhoneCall, ChevronRight, ArrowUpRight } from 'lucide-react';
import { CallRecord } from '../types';

interface Props {
  calls: CallRecord[];
  activeCallSession: any;
  onOpenPhoneSimulator: () => void;
  onOpenTelephonyModal: () => void;
}

export const LiveReceptionistDashboard: React.FC<Props> = ({
  calls,
  activeCallSession,
  onOpenPhoneSimulator,
  onOpenTelephonyModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState('ALL');

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      c.caller_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.caller_number.includes(searchTerm) ||
      (c.caller_company && c.caller_company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.transcript.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIntent = intentFilter === 'ALL' || c.intent === intentFilter;
    return matchesSearch && matchesIntent;
  });

  return (
    <div className="space-y-6">
      {/* Top Telephony Action Banner (Apple Style) */}
      <div className="apple-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0071e3]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#2997ff] text-[11px] font-medium mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] animate-pulse" />
              <span>Gemma Telephony System Active</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              AI Voice Receptionist
            </h2>
            <p className="text-xs text-[#86868b] mt-1 max-w-xl leading-relaxed">
              Autonomous phone receptionist capable of handling natural spoken calls, booking verified calendar appointments, transferring departments, and prioritizing follow-ups.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={onOpenTelephonyModal}
              className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-lg shadow-[#0071e3]/25 transition flex items-center space-x-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call My Phone</span>
            </button>

            <button
              onClick={onOpenPhoneSimulator}
              className="px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/[0.1] text-white rounded-full text-xs font-semibold transition flex items-center space-x-2"
            >
              <Phone className="w-4 h-4 text-[#86868b]" />
              <span>Browser Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Call Live Feed Banner */}
      {activeCallSession && (
        <div className="apple-card p-6 border-[#0071e3]/40 shadow-[0_10px_40px_rgba(0,113,227,0.15)] relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-white/[0.08] gap-3">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-3.5 h-3.5 rounded-full bg-[#2997ff] animate-ping" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#2997ff] absolute inset-0" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-white">Live Call In Progress</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b]">
                    {activeCallSession.call_sid}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#d2d2d7] mt-0.5">
                  {activeCallSession.caller_name}{' '}
                  {activeCallSession.company && (
                    <span className="text-[#86868b] font-normal">({activeCallSession.company})</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenPhoneSimulator}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-xs font-medium text-white transition flex items-center space-x-1.5 self-start md:self-auto"
            >
              <span>View Live Dialogue</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#86868b]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Caller Intent Card */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-2xl text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium block mb-1">
                Detected Intent
              </span>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#2997ff]" />
                <span className="font-semibold text-white uppercase tracking-wide">
                  {activeCallSession.intent || 'Analyzing...'}
                </span>
              </div>
              <div className="text-[11px] text-[#86868b] mt-1.5">
                Sentiment: <strong className="text-white capitalize">{activeCallSession.sentiment || 'Neutral'}</strong>
              </div>
            </div>

            {/* Extracted Entities Card */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-2xl text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium block mb-1">
                Extracted Parameters
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {activeCallSession.current_entities &&
                Object.keys(activeCallSession.current_entities).length > 0 ? (
                  Object.entries(activeCallSession.current_entities).map(([k, v]) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[#d2d2d7] border border-white/[0.08] text-[10px] font-mono"
                    >
                      {k}: <strong className="text-white">{String(v)}</strong>
                    </span>
                  ))
                ) : (
                  <span className="text-[#86868b] text-[11px]">Listening for details...</span>
                )}
              </div>
            </div>

            {/* Actions Executed Card */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-2xl text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium block mb-1">
                Business Actions
              </span>
              {activeCallSession.actions_taken && activeCallSession.actions_taken.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {activeCallSession.actions_taken.map((act: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-[#34c759] font-medium text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{act}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[#86868b] text-[11px]">Ready to execute...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historical Call Activity Records */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Call Records & Actions</h3>
            <p className="text-xs text-[#86868b]">Logged phone calls, intent classifications, and outcomes</p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search records..."
                className="bg-[#1c1c1e] border border-white/[0.08] rounded-full pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#0071e3] w-48 sm:w-56"
              />
            </div>

            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="bg-[#1c1c1e] border border-white/[0.08] rounded-full px-3 py-1.5 text-xs text-[#d2d2d7] focus:outline-none"
            >
              <option value="ALL">All Intents</option>
              <option value="book_meeting">Book Meeting</option>
              <option value="transfer_call">Transfer Call</option>
              <option value="save_lead">Save Lead</option>
              <option value="support_query">Support Query</option>
              <option value="general_inquiry">General Inquiry</option>
            </select>
          </div>
        </div>

        {filteredCalls.length === 0 ? (
          <div className="text-center py-10 text-[#86868b] text-xs">
            No call records found matching your filter.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredCalls.map((call) => (
              <div key={call.id} className="py-4 space-y-2 first:pt-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        call.intent === 'book_meeting'
                          ? 'bg-[#34c759]'
                          : call.intent === 'support_query'
                          ? 'bg-[#ff453a]'
                          : call.intent === 'save_lead'
                          ? 'bg-[#af52de]'
                          : 'bg-[#0071e3]'
                      }`}
                    />
                    <span className="font-semibold text-white text-xs">{call.caller_name}</span>
                    {call.caller_company && (
                      <span className="text-[#86868b] text-xs">({call.caller_company})</span>
                    )}
                    <span className="text-[11px] font-mono text-[#86868b]">{call.caller_number}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        call.priority === 'High'
                          ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                          : call.priority === 'Medium'
                          ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                          : 'bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30'
                      }`}
                    >
                      {call.priority} Priority
                    </span>
                    <span className="text-[#86868b] font-mono">{call.duration_seconds}s</span>
                  </div>
                </div>

                {call.summary && (
                  <p className="text-xs text-[#d2d2d7] leading-relaxed pl-4.5 border-l-2 border-white/[0.08]">
                    {call.summary}
                  </p>
                )}

                {call.actions_taken && call.actions_taken.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                    {call.actions_taken.map((act, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] text-[#34c759] border border-white/[0.06] text-[10px]"
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#34c759]" />
                        <span>{act}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
