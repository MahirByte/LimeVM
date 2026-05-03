import React, { useState } from 'react';
import { Globe, Terminal, Cpu, Activity, Link as LinkIcon, Send } from 'lucide-react';
import { LogEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ControlPanelProps {
  logs: LogEntry[];
  onStartVM: (url: string) => void;
  onEmulateType: () => void;
  onImport: () => void;
  isConnecting: boolean;
}

export default function ControlPanel({ logs, onStartVM, onEmulateType, onImport, isConnecting }: ControlPanelProps) {
  const [url, setUrl] = useState("https://www.google.com");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartVM(url);
  };

  return (
    <div id="control-panel-container" className="flex flex-col gap-6">
      {/* Navigation Control */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] text-lime-muted uppercase tracking-[0.2em] font-bold">Navigation Control</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lime-primary text-xs">{">"}</span>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter Remote URL..."
              className="w-full bg-black border border-lime-border-light px-8 py-2.5 text-[11px] font-mono text-lime-primary tracking-tighter focus:outline-none focus:border-lime-primary/50 transition-all shadow-inner"
            />
          </div>
          <button 
            disabled={isConnecting}
            className="w-full h-10 bg-lime-primary text-black font-bold uppercase tracking-widest text-[10px] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isConnecting ? 'BOOTING_NODE...' : 'BOOT_SITE_CLUSTER'}
            {!isConnecting && <Send className="w-3 h-3" />}
          </button>
        </form>
      </div>

      {/* System Actions */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] text-lime-muted uppercase tracking-[0.2em] font-bold">System Emulators</h3>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={onEmulateType}
            className="h-10 bg-lime-item border border-lime-border-light text-[10px] font-bold text-lime-muted hover:border-lime-primary hover:text-white transition-all uppercase tracking-widest"
          >
            Emulate Type
          </button>
          <button 
            onClick={onImport}
            className="h-10 bg-lime-item border border-lime-border-light text-[10px] font-bold text-lime-muted hover:border-lime-primary hover:text-white transition-all uppercase tracking-widest"
          >
            Import
          </button>
        </div>
      </div>

      {/* Cluster Status Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-lime-item border border-lime-border-light p-3">
          <div className="text-[8px] text-lime-muted uppercase tracking-widest mb-1">Node Clusters</div>
          <div className="text-sm font-bold text-lime-primary">14 <span className="text-[9px] text-[#444444] font-normal uppercase tracking-tighter">Active</span></div>
        </div>
        <div className="bg-lime-item border border-lime-border-light p-3">
          <div className="text-[8px] text-lime-muted uppercase tracking-widest mb-1">GPU_ENG_STT</div>
          <div className="text-sm font-bold text-lime-primary">ACCEL <span className="text-[9px] text-lime-primary/50 font-normal uppercase tracking-tighter">Enabled</span></div>
        </div>
      </div>

      {/* V-Commands System Stats Info */}
      <div className="bg-lime-item border border-lime-border-light p-4 rounded-sm">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-3 h-3 text-lime-primary opacity-50" />
          <span className="text-[9px] text-lime-muted uppercase font-bold tracking-widest">Proxy_Sync_Status</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center bg-black/40 px-2 py-1.5 border-l border-lime-primary">
            <span className="text-[9px] text-lime-muted uppercase">Latency</span>
            <span className="text-[10px] text-white font-bold">14ms</span>
          </div>
          <div className="flex justify-between items-center bg-black/40 px-2 py-1.5 border-l border-blue-500">
            <span className="text-[9px] text-lime-muted uppercase">Sync_Loss</span>
            <span className="text-[10px] text-white font-bold">0.02%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
