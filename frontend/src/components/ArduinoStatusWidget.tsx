import React, { useState } from 'react';
import { Cpu, Check, Flame, RefreshCw, Usb, Radio } from 'lucide-react';
import { HardwareState } from '../types';

interface Props {
  hardwareState: HardwareState;
  onRefresh: () => void;
}

export const ArduinoStatusWidget: React.FC<Props> = ({ hardwareState, onRefresh }) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleButtonAction = async (action: 'ACKNOWLEDGE' | 'ESCALATE') => {
    setLoadingAction(action);
    try {
      await fetch('/api/hardware/button', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      onRefresh();
    } catch (e) {
      console.error('Error triggering hardware button:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  const getLedClass = (color: string) => {
    switch (color) {
      case 'BLUE':
        return 'bg-[#2997ff] led-blue';
      case 'GREEN':
        return 'bg-[#34c759] led-green';
      case 'AMBER':
        return 'bg-[#ff9f0a] led-amber';
      case 'RED':
        return 'bg-[#ff453a] led-red';
      default:
        return 'bg-[#86868b]';
    }
  };

  return (
    <div className="apple-card p-5 flex flex-col justify-between">
      <div>
        {/* Apple Style Accessory Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white tracking-tight flex items-center space-x-2">
                <span>Arduino UNO Q</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
              </div>
              <span className="text-[11px] text-[#86868b]">Physical Call Indicator</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <div className="flex items-center space-x-1 text-[11px] font-mono text-[#86868b] bg-white/[0.04] px-2 py-1 rounded-full border border-white/[0.06]">
              <Usb className="w-3 h-3 text-[#2997ff]" />
              <span>{hardwareState.is_hardware_detected ? hardwareState.port : 'USB Virtual'}</span>
            </div>
            <button
              onClick={onRefresh}
              className="p-1.5 text-[#86868b] hover:text-white rounded-full hover:bg-white/[0.08] transition"
              title="Refresh device state"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Status Indicator Surface */}
        <div className="my-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium block">
              Device State
            </span>
            <div className="text-base font-semibold text-white tracking-tight mt-0.5">
              {hardwareState.status}
            </div>
            <p className="text-[11px] text-[#86868b] mt-0.5">
              {hardwareState.description}
            </p>
          </div>

          {/* LED Pill */}
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full transition-all duration-300 ${getLedClass(hardwareState.color)}`} />
            <span className="text-[10px] font-mono text-[#86868b] mt-1.5 uppercase font-medium">
              {hardwareState.color}
            </span>
          </div>
        </div>
      </div>

      {/* Apple-style Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          onClick={() => handleButtonAction('ACKNOWLEDGE')}
          disabled={loadingAction !== null}
          className="py-2.5 px-3 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] border border-white/[0.08] text-white rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1.5 disabled:opacity-40"
        >
          <Check className="w-3.5 h-3.5 text-[#34c759]" />
          <span>Acknowledge</span>
        </button>

        <button
          onClick={() => handleButtonAction('ESCALATE')}
          disabled={loadingAction !== null}
          className="py-2.5 px-3 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] border border-white/[0.08] text-white rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1.5 disabled:opacity-40"
        >
          <Flame className="w-3.5 h-3.5 text-[#ff453a]" />
          <span>Escalate</span>
        </button>
      </div>
    </div>
  );
};
