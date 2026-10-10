import React, { useState } from 'react';
import { PhoneCall, X, Loader2, CheckCircle2, AlertCircle, Phone } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCallTriggered: () => void;
}

export const GeminiDialerModal: React.FC<Props> = ({ isOpen, onClose, onCallTriggered }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callerName, setCallerName] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<any>(null);

  const handleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setIsCalling(true);
    setCallStatus(null);

    try {
      const res = await fetch('/api/gemini/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: phoneNumber.trim(),
          caller_name: callerName.trim() || 'Caller',
        }),
      });
      const data = await res.json();
      setCallStatus(data);
      if (data.success) {
        onCallTriggered();
      }
    } catch (e: any) {
      setCallStatus({ success: false, error: e.message || 'Call failed. Check backend connection.' });
    } finally {
      setIsCalling(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setCallerName('');
    setCallStatus(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="bg-[#161617] border border-white/[0.12] rounded-3xl w-full max-w-md shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff]">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">Gemini Call</h2>
              <p className="text-xs text-[#86868b]">AI-powered outbound phone call</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-[#86868b] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info Banner */}
          <div className="bg-[#1c1c1e] border border-white/[0.06] rounded-2xl p-4 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">How it works</div>
            <p className="text-xs text-[#d2d2d7] leading-relaxed">
              The AI receptionist will call your phone. When you answer, Gemini handles the conversation — understanding your intent, extracting details, and responding naturally.
            </p>
          </div>

          {/* Call Status Result */}
          {callStatus && (
            <div className={`rounded-2xl p-4 flex items-start space-x-3 ${
              callStatus.success
                ? 'bg-[#1a3a1a] border border-[#34c759]/30'
                : 'bg-[#3a1a1a] border border-[#ff453a]/30'
            }`}>
              {callStatus.success
                ? <CheckCircle2 className="w-5 h-5 text-[#34c759] mt-0.5 shrink-0" />
                : <AlertCircle className="w-5 h-5 text-[#ff453a] mt-0.5 shrink-0" />
              }
              <div>
                <p className="text-xs font-semibold text-white">
                  {callStatus.success ? 'Call initiated!' : 'Call failed'}
                </p>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  {callStatus.message || callStatus.error || (callStatus.success ? 'Your phone should ring shortly.' : 'Please check backend logs.')}
                </p>
                {callStatus.call_sid && (
                  <p className="text-[10px] text-[#636366] mt-1 font-mono">SID: {callStatus.call_sid}</p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          {!callStatus?.success && (
            <form onSubmit={handleCall} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#d2d2d7] block mb-1.5">
                  Your Phone Number <span className="text-[#ff453a]">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636366]" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/[0.12] rounded-2xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] tracking-wide font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-[#86868b] mt-1.5">Include country code — e.g. +91 for India, +1 for US.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[#d2d2d7] block mb-1.5">Your Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-white/[0.12] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                />
              </div>

              <button
                type="submit"
                disabled={isCalling || !phoneNumber.trim()}
                className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-semibold transition flex items-center justify-center space-x-2"
              >
                {isCalling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Call...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    <span>Call My Phone Now</span>
                  </>
                )}
              </button>
            </form>
          )}

          {callStatus?.success && (
            <button
              onClick={handleClose}
              className="w-full py-3 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-2xl text-sm font-medium transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
