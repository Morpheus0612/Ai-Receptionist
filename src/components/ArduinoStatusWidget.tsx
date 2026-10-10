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
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      onRefresh();
    } catch (e) {
      console.warn('Error triggering hardware button:', e);
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
    <div className="apple-card p-5 flex flex-col justify-between h-full space-y-4">
      <div>
        {/* Accessory Header */}
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
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#86868b] hover:text-white transition"
            title="Refresh device state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* LED Glow Center */}
        <div className="py-4 flex flex-col items-center justify-center text-center space-y-2">
          <div className="relative">
            <div className={`w-8 h-8 rounded-full ${getLedClass(hardwareState.color)} transition-all duration-300`} />
            <div className={`absolute inset-0 w-8 h-8 rounded-full ${hardwareState.color === 'BLUE' ? 'animate-ping opacity-30 bg-[#2997ff]' : ''}`} />
          </div>
          <div className="text-sm font-semibold text-white tracking-tight">
            {hardwareState.color} • {hardwareState.status}
          </div>
          <p className="text-[11px] text-[#86868b] max-w-[220px] leading-relaxed">
            {hardwareState.description}
          </p>
        </div>
      </div>

      {/* Button Controls */}
      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <span className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold block px-1">
          Hardware Button Controls
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleButtonAction('ACKNOWLEDGE')}
            disabled={loadingAction !== null}
            className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.06] text-xs font-medium text-white transition flex items-center justify-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5 text-[#34c759]" />
            <span>Acknowledge</span>
          </button>
          <button
            onClick={() => handleButtonAction('ESCALATE')}
            disabled={loadingAction !== null}
            className="py-2 px-3 rounded-xl bg-[#ff453a]/10 hover:bg-[#ff453a]/20 active:scale-[0.98] border border-[#ff453a]/25 text-xs font-medium text-[#ff453a] transition flex items-center justify-center space-x-1.5"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Escalate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
