import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, ShieldCheck, Key, Settings2, CheckCircle2, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCallTriggered: () => void;
}

export const TelephonyDialerModal: React.FC<Props> = ({ isOpen, onClose, onCallTriggered }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callerName, setCallerName] = useState('My Phone');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Twilio Credential Inputs
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [twilioNumber, setTwilioNumber] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/twilio/config');
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error('Error fetching Twilio config:', e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/twilio/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_sid: accountSid,
          auth_token: authToken,
          phone_number: twilioNumber
        })
      });
      const data = await res.json();
      setConfig(data.config);
      setShowConfig(false);
    } catch (e) {
      console.error('Error saving Twilio credentials:', e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setIsCalling(true);
    setCallStatus(null);

    try {
      const res = await fetch('/api/twilio/call-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: phoneNumber,
          caller_name: callerName
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="bg-[#161617] border border-white/[0.12] rounded-3xl w-full max-w-lg shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden text-white flex flex-col">
        {/* Apple Style Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff]">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">Live Phone Telephony</h2>
              <p className="text-xs text-[#86868b]">Place real phone calls to or from your device</p>
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
          {/* Inbound Receptionist Number Banner */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Receptionist Inbound Number</div>
              <div className="text-sm font-semibold tracking-tight text-white mt-0.5">
                {config?.twilio_phone_number && config.twilio_phone_number !== '+1 (Not configured)'
                  ? config.twilio_phone_number
                  : '+1 (Twilio Pending)'}
              </div>
              <p className="text-[11px] text-[#86868b] mt-0.5">Call this number from your phone to talk to Gemma</p>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-xs font-medium text-white transition flex items-center space-x-1.5"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#86868b]" />
              <span>Settings</span>
            </button>
          </div>

          {/* Twilio Settings Drawer */}
          {showConfig && (
            <form onSubmit={handleSaveConfig} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-white">
                <Key className="w-4 h-4 text-[#2997ff]" />
                <span>Twilio Telephony Credentials</span>
              </div>
              <div>
                <label className="text-[11px] text-[#86868b] block mb-1">Twilio Account SID</label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#86868b] block mb-1">Twilio Auth Token</label>
                <input
                  type="password"
                  placeholder="Auth Token"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#86868b] block mb-1">Twilio Phone Number</label>
                <input
                  type="text"
                  placeholder="+1234567890"
                  value={twilioNumber}
                  onChange={(e) => setTwilioNumber(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071e3]"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="w-full py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold transition"
              >
                {isSavingConfig ? 'Saving...' : 'Save Twilio Configuration'}
              </button>
            </form>
          )}

          {/* Outbound "Call My Phone" Form */}
          <form onSubmit={handleTriggerCall} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#d2d2d7] block mb-1.5">
                Your Phone Number (Mobile or Landline)
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
                Caller Label / Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Mercer"
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
                  <span>Connecting Telephone Network...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Call My Phone Now</span>
                </>
              )}
            </button>
          </form>

          {/* Feedback Status Alert */}
          {callStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs ${
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
                    {callStatus.success ? 'Call Dispatched!' : 'Call Request Notice'}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#d2d2d7]">
                    {callStatus.message || callStatus.error}
                  </p>
                  {callStatus.needs_credentials && (
                    <button
                      onClick={() => setShowConfig(true)}
                      className="mt-2 text-[11px] text-[#2997ff] underline font-medium block"
                    >
                      Click here to enter Twilio Account SID & Token
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
