import React, { useState } from 'react';
import { Play, CheckCircle2, ChevronRight, PhoneCall, Brain, CalendarCheck, Zap, Award, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  onSceneTriggered: () => void;
}

export const InteractiveDemoGuide: React.FC<Props> = ({ onSceneTriggered }) => {
  const [activeScene, setActiveScene] = useState<number>(1);
  const [isRunning, setIsRunning] = useState(false);
  const [sceneOutput, setSceneOutput] = useState<any>(null);

  const scenes = [
    {
      num: 1,
      title: 'Scene 1: The Call Arrives',
      time: '0:00–0:20',
      icon: PhoneCall,
      color: 'text-blue-400',
      description: 'Incoming call from Jordan Vance. Dashboard shows live call state, and Arduino indicator turns BLUE.'
    },
    {
      num: 2,
      title: 'Scene 2: The AI Understands',
      time: '0:20–0:45',
      icon: Brain,
      color: 'text-purple-400',
      description: 'Gemma extracts meeting request for sales next Tuesday, detects missing time & email, asks clarifying question rather than guessing.'
    },
    {
      num: 3,
      title: 'Scene 3: Real Action Succeeds',
      time: '0:45–1:05',
      icon: CalendarCheck,
      color: 'text-emerald-400',
      description: 'Caller provides 2:00 PM and email. System verifies availability and books meeting in Google/Demo Calendar.'
    },
    {
      num: 4,
      title: 'Scene 4: Learns & Prioritizes',
      time: '1:05–1:30',
      icon: Zap,
      color: 'text-amber-400',
      description: 'TabPFN classifies follow-up priority with factor attribution; compares Base Gemma vs Tinker fine-tuned model.'
    },
    {
      num: 5,
      title: 'Scene 5: Show the Result',
      time: '1:30–2:00',
      icon: Award,
      color: 'text-cyan-400',
      description: 'Call completed, summary recorded, priority follow-up logged, and Arduino indicator returns to GREEN (Available).'
    }
  ];

  const runScene = async (num: number) => {
    setIsRunning(true);
    setActiveScene(num);
    try {
      const res = await fetch(`/api/demo/run-scene/${num}`, {
        method: 'POST',
        headers: { Accept: 'application/json' }
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setSceneOutput(data);
        onSceneTriggered();
      }
    } catch (e) {
      console.warn('Error running demo scene:', e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="apple-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/[0.06] gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[#2997ff]">
            <Play className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Interactive 2-Minute Demo Flow</h3>
            <p className="text-xs text-[#86868b]">Step-by-step end-to-end evaluation scenes (1 to 5)</p>
          </div>
        </div>

        <span className="text-[11px] font-medium text-[#2997ff] bg-[#2997ff]/10 px-2.5 py-1 rounded-full border border-[#2997ff]/20">
          Scene {activeScene} of 5
        </span>
      </div>

      {/* Scene Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {scenes.map((s) => {
          const Icon = s.icon;
          const isCurrent = activeScene === s.num;

          return (
            <button
              key={s.num}
              onClick={() => runScene(s.num)}
              disabled={isRunning}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                isCurrent
                  ? 'bg-white/[0.08] border-white/[0.2] shadow-sm ring-1 ring-white/10'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] text-[#86868b] font-mono">{s.time}</span>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-white leading-tight">Scene {s.num}</div>
                <div className="text-[10px] text-[#86868b] truncate mt-0.5">{s.title.split(': ')[1]}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Scene Details */}
      {sceneOutput && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-xs space-y-2">
          <div className="flex items-center space-x-2 text-white font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
            <span>{sceneOutput.title} Triggered</span>
          </div>
          <p className="text-[11px] text-[#86868b] leading-relaxed">{sceneOutput.description}</p>
          {sceneOutput.caller_utterance && (
            <div className="bg-[#1c1c1e] rounded-xl p-2 text-[11px] font-mono text-[#d2d2d7]">
              Caller: "{sceneOutput.caller_utterance}"
            </div>
          )}
          {sceneOutput.result?.response_text && (
            <div className="bg-[#1c1c1e] rounded-xl p-2 text-[11px] font-mono text-[#34c759]">
              Receptionist: "{sceneOutput.result.response_text}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
