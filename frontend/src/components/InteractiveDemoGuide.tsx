import React, { useState } from 'react';
import { Play, CheckCircle2, ChevronRight, PhoneCall, Brain, CalendarCheck, Zap, Award, Sparkles } from 'lucide-react';

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
      const res = await fetch(`/api/demo/run-scene/${num}`, { method: 'POST' });
      const data = await res.json();
      setSceneOutput(data);
      onSceneTriggered();
    } catch (e) {
      console.error(`Error running Scene ${num}:`, e);
    } finally {
      setIsRunning(false);
    }
  };

  const runFullSequence = async () => {
    for (let i = 1; i <= 5; i++) {
      await runScene(i);
      await new Promise((r) => setTimeout(r, 2200));
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-slate-100 text-sm">Guided Demo Scenario (Scenes 1 – 5)</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
                2:00 min Walkthrough
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Trigger each scene individually or auto-play the entire end-to-end evaluation story
            </p>
          </div>
        </div>

        <button
          onClick={runFullSequence}
          disabled={isRunning}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Auto-Play Full 5-Scene Demo</span>
        </button>
      </div>

      {/* 5 Scene Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 mb-4">
        {scenes.map((s) => {
          const Icon = s.icon;
          const isActive = activeScene === s.num;

          return (
            <button
              key={s.num}
              onClick={() => runScene(s.num)}
              disabled={isRunning}
              className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 border-blue-500 shadow-md shadow-blue-500/10'
                  : 'bg-[#090d16] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`p-1.5 rounded-md bg-slate-800 ${s.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{s.time}</span>
                </div>
                <div className="font-semibold text-xs text-slate-200 mb-1">{s.title}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className={isActive ? 'text-blue-400 font-bold' : 'text-slate-500'}>
                  {isActive ? '● ACTIVE' : 'Trigger'}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Scene Output Card */}
      {sceneOutput && (
        <div className="bg-[#090d16] border border-slate-800 rounded-lg p-3.5 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-blue-400 font-mono">
              Result of {sceneOutput.title} ({scenes[sceneOutput.scene - 1]?.time}):
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Verified
            </span>
          </div>
          <p className="text-slate-300 mb-2">{sceneOutput.description}</p>
          {sceneOutput.caller_utterance && (
            <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] text-slate-300 font-mono mb-2">
              Caller: "{sceneOutput.caller_utterance}"
            </div>
          )}
          {sceneOutput.result?.response_text && (
            <div className="bg-blue-950/40 p-2 rounded border border-blue-900/60 text-[11px] text-blue-200 font-mono">
              Receptionist: "{sceneOutput.result.response_text}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
