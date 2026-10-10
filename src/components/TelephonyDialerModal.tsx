import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, CheckCircle2, AlertCircle, X, Loader2, Sparkles, Radio, Volume2, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCallTriggered: () => void;
  onOpenBrowserLine?: (callerName?: string, callerNumber?: string) => void;
}

export const TelephonyDialerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCallTriggered,
  onOpenBrowserLine
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callerName, setCallerName] = useState('My Phone');
  const [callEngine, setCallEngine] = useState<'vapi' | 'browser'>('vapi');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<any>(null);
  const [vapiConfig, setVapiConfig] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVapiConfig();
    }
  }, [isOpen]);

  const fetchVapiConfig = async () => {
    try {
      const res = await fetch('/api/vapi/config');
      const data = await res.json();
      setVapiConfig(data);
    } catch (e) {
      console.error('Error fetching Vapi config:', e);
    }
  };

  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    if (callEngine === 'browser') {
      handleLaunchBrowserLine();
      return;
    }

    setIsCalling(true);
    setCallStatus(null);

    try {
      const res = await fetch('/api/vapi/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: phoneNumber.trim(),
          caller_name: callerName.trim()
        })
      });
      const data = await res.json();
      setCallStatus(data);
      if (data.success) {
        onCallTriggered();
      }
    } catch (e: any) {
      setCallStatus({ success: false, error: e.message || 'Call failed' });
    } finally {
      setIsCalling(false);
    }
  };

  const handleLaunchBrowserLine = () => {
    onClose();
    if (onOpenBrowserLine) {
      onOpenBrowserLine(callerName || 'Alex Mercer', phoneNumber || '+1-555-0199');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="bg-[#161617] border border-white/[0.12] rounded-3xl w-full max-w-lg shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden text-white flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff]">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold tracking-tight text-white">Vapi AI Voice Calling</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#af52de]/20 text-[#af52de] border border-[#af52de]/30">
                  vapi.ai API
                </span>
              </div>
              <p className="text-xs text-[#86868b]">Outbound phone calls to people & web voice line</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-[#86868b] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Engine Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl">
            <button
              type="button"
              onClick={() => setCallEngine('vapi')}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition flex items-center justify-center space-x-2 ${
                callEngine === 'vapi'
                  ? 'bg-[#0071e3] text-white shadow-sm'
                  : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Vapi AI Calling</span>
            </button>
            <button
              type="button"
              onClick={() => setCallEngine('browser')}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition flex items-center justify-center space-x-2 ${
                callEngine === 'browser'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Browser Audio Line</span>
            </button>
          </div>

          {/* Vapi Info Banner */}
          {callEngine === 'vapi' ? (
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-[#af52de]" />
                  <span className="text-xs font-semibold text-white">Vapi AI Telephony Engine</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30">
                  {vapiConfig?.configured ? 'Vapi Key Configured' : 'Ready / Simulated'}
                </span>
              </div>
              <p className="text-xs text-[#a1a1a6] leading-relaxed">
                Uses the Vapi AI REST API to place autonomous conversational voice calls to any person's phone number. Gemma/Gemini handles conversational understanding and calendar booking.
              </p>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-[#34c759]" />
                  <span className="text-xs font-semibold text-white">Direct Browser Audio Line</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30">
                  Zero Setup
                </span>
              </div>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Connect immediately in the browser using your microphone and computer speakers with real-time speech recognition and voice synthesis.
              </p>
            </div>
          )}

          {/* Call Form */}
          <form onSubmit={handleTriggerCall} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#d2d2d7] block mb-1.5">
                Person's Phone Number to Call
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+1 555 123 4567 or +91 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-white/[0.12] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] tracking-wide font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-[#86868b] mt-1.5">
                Include country code (e.g. +1 for US/Canada, +91 for India, +44 for UK).
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#d2d2d7] block mb-1.5">
                Caller / Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Jordan Vance"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full bg-[#1c1c1e] border border-white/[0.12] rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#0071e3]"
              />
            </div>

            <button
              type="submit"
              disabled={isCalling || !phoneNumber.trim()}
              className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.99] text-white rounded-2xl text-xs font-semibold transition shadow-lg shadow-[#0071e3]/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isCalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing Call via Vapi AI...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>
                    {callEngine === 'vapi'
                      ? 'Call This Person via Vapi AI'
                      : 'Launch Browser Audio Line'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Feedback Status Alert */}
          {callStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                callStatus.success
                  ? 'bg-[#34c759]/10 border-[#34c759]/30 text-[#30d158]'
                  : 'bg-[#ff453a]/10 border-[#ff453a]/30 text-[#ff453a]'
              }`}
            >
              <div className="flex items-start space-x-2">
                {callStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="font-semibold">
                    {callStatus.vapi_live
                      ? 'Vapi AI Call Placed!'
                      : (callStatus.success ? 'Call Dispatched to System!' : 'Notice')}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#d2d2d7]">
                    {callStatus.message || callStatus.error}
                  </p>
                  {callStatus.vapi_call_id && (
                    <p className="text-[10px] text-[#86868b] mt-1 font-mono">
                      Vapi ID: {callStatus.vapi_call_id}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleLaunchBrowserLine}
                className="w-full py-2 bg-[#34c759] hover:bg-[#34c759]/90 text-black rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Join Live Audio Stream as {callerName || 'Caller'}</span>
              </button>
            </div>
          )}

          {/* Vapi Configuration Guide */}
          <div className="pt-2 text-[11px] text-[#86868b] leading-relaxed border-t border-white/[0.04]">
            <p>
              💡 <strong>Vapi AI Setup:</strong> To place live outbound phone calls to physical phone numbers via cellular networks, add <code className="text-white">VAPI_API_KEY=your_key</code> (and optional <code className="text-white">VAPI_PHONE_NUMBER_ID</code>) in your server environment (<code className="text-white">.env</code>). Without an API key, the system automatically runs the full conversational audio flow via the browser line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
