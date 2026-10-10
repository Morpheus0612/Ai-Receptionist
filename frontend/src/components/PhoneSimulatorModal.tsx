import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Send, Volume2, Sparkles, X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCallStateChanged: () => void;
}

export const PhoneSimulatorModal: React.FC<Props> = ({ isOpen, onClose, onCallStateChanged }) => {
  const [callActive, setCallActive] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callerName, setCallerName] = useState('Alex Mercer');
  const [company, setCompany] = useState('Acme Inc');
  const [callerNumber, setCallerNumber] = useState('+1-555-0199');
  const [callerInput, setCallerInput] = useState('');
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState(true);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setCallerInput(text);
        setIsListening(false);
        handleSendUtterance(text);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [callSid]);

  const speakText = (text: string) => {
    if (!audioFeedback || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  const handleStartCall = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/calls/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_name: callerName,
          company: company,
          caller_number: callerNumber
        })
      });
      const data = await res.json();
      setCallSid(data.call_sid);
      setCallActive(true);
      const greeting = `Thank you for calling. This is our AI receptionist powered by Google Gemma. How may I assist you today?`;
      setTranscript([{ speaker: 'receptionist', text: greeting }]);
      speakText(greeting);
      onCallStateChanged();
    } catch (e) {
      console.error('Failed to start call:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendUtterance = async (textToSend?: string) => {
    const text = textToSend || callerInput;
    if (!text.trim() || !callSid) return;

    setCallerInput('');
    setTranscript((prev) => [...prev, { speaker: 'caller', text }]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/calls/utterance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_sid: callSid,
          utterance: text
        })
      });
      const data = await res.json();
      setTranscript((prev) => [...prev, { speaker: 'receptionist', text: data.response_text }]);
      speakText(data.response_text);
      onCallStateChanged();
    } catch (e) {
      console.error('Error processing utterance:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndCall = async () => {
    if (!callSid) return;
    setIsProcessing(true);
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      await fetch('/api/calls/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_sid: callSid })
      });
      setCallActive(false);
      setCallSid(null);
      onCallStateChanged();
    } catch (e) {
      console.error('Error ending call:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your message instead.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="bg-[#161617] border border-white/[0.12] rounded-3xl w-full max-w-xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Apple Style Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white">
              <Phone className="w-4 h-4 text-[#2997ff]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white">Browser Voice Call</h2>
              <p className="text-[11px] text-[#86868b]">Simulate incoming calls directly from your browser</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAudioFeedback(!audioFeedback)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition flex items-center space-x-1 ${
                audioFeedback ? 'bg-[#0071e3]/15 border-[#0071e3]/30 text-[#2997ff]' : 'bg-white/[0.04] border-white/[0.08] text-[#86868b]'
              }`}
            >
              <Volume2 className="w-3 h-3" />
              <span>Voice {audioFeedback ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-[#86868b] hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {!callActive ? (
          <div className="p-6 space-y-5">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">Caller Persona</div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#86868b] block mb-1">Name</label>
                  <input
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#86868b] block mb-1">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#86868b] block mb-1">Number</label>
                  <input
                    type="text"
                    value={callerNumber}
                    onChange={(e) => setCallerNumber(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStartCall}
              disabled={isProcessing}
              className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.99] text-white rounded-2xl text-xs font-semibold transition shadow-lg shadow-[#0071e3]/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Phone className="w-4 h-4" />
              <span>Connect Call to Receptionist</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            {/* Call Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2997ff] animate-ping" />
                <span className="text-xs font-semibold text-white">{callerName}</span>
                <span className="text-xs text-[#86868b]">({company})</span>
              </div>
              <button
                onClick={handleEndCall}
                className="px-3 py-1 rounded-full bg-[#ff453a]/15 hover:bg-[#ff453a]/25 text-[#ff453a] border border-[#ff453a]/30 text-xs font-medium transition flex items-center space-x-1"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Hang Up</span>
              </button>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
              {transcript.map((turn, i) => (
                <div
                  key={i}
                  className={`flex ${turn.speaker === 'caller' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                      turn.speaker === 'caller'
                        ? 'bg-[#0071e3] text-white rounded-br-none'
                        : 'bg-[#1c1c1e] text-[#f5f5f7] border border-white/[0.08] rounded-bl-none'
                    }`}
                  >
                    <div className="text-[10px] opacity-70 mb-0.5 font-medium">
                      {turn.speaker === 'caller' ? 'You' : 'AI Receptionist'}
                    </div>
                    <p className="leading-relaxed">{turn.text}</p>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-2xl px-3.5 py-2 text-xs text-[#86868b] flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 text-[#2997ff] animate-spin" />
                    <span>Processing statement...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="space-y-1 mb-3">
              <span className="text-[10px] text-[#86868b] uppercase tracking-wider block">Quick Statements:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleSendUtterance("Can you arrange a meeting with the sales team next Tuesday?")}
                  className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full text-[11px] text-[#d2d2d7] transition"
                >
                  "Book meeting with sales next Tuesday"
                </button>
                <button
                  onClick={() => handleSendUtterance("Sure, 2:00 PM works best for me. My name is Alex Mercer and email is alex@acme.com.")}
                  className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full text-[11px] text-[#d2d2d7] transition"
                >
                  "2:00 PM works best, alex@acme.com"
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <div className="flex items-center space-x-2 bg-[#1c1c1e] border border-white/[0.1] rounded-2xl p-1.5">
              <button
                onClick={toggleMic}
                className={`p-2 rounded-xl transition ${
                  isListening ? 'bg-[#ff453a] text-white animate-pulse' : 'text-[#86868b] hover:text-white'
                }`}
                title="Click to speak"
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={callerInput}
                onChange={(e) => setCallerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendUtterance()}
                placeholder={isListening ? 'Listening...' : 'Type statement...'}
                className="flex-1 bg-transparent px-2 text-xs text-white focus:outline-none placeholder:text-[#86868b]"
              />

              <button
                onClick={() => handleSendUtterance()}
                disabled={!callerInput.trim() || isProcessing}
                className="p-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl transition disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
