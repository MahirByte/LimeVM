import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Minimize, MousePointer2, RefreshCw } from 'lucide-react';

interface LimeScreenProps {
  socket: Socket | null;
  isActive: boolean;
  onLog: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export default function LimeScreen({ socket, isActive, onLog }: LimeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!socket || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });

    socket.on('frame', (data: ArrayBuffer) => {
      const blob = new Blob([data], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      
      img.onload = () => {
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          frameCountRef.current++;
          
          const now = performance.now();
          if (now - lastTimeRef.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastTimeRef.current = now;
          }
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

    return () => {
      socket.off('frame');
    };
  }, [socket]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isLocked || !socket) return;
    
    // In pointer lock, we get movementX/Y
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMousePos(prev => {
      const newX = Math.max(0, Math.min(1280, prev.x + (e as any).movementX));
      const newY = Math.max(0, Math.min(720, prev.y + (e as any).movementY));
      
      socket.emit('mouse-move', { x: newX, y: newY });
      return { x: newX, y: newY };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isLocked) {
      containerRef.current?.requestPointerLock();
      onLog("LimeScreen: Pointer Lock Engaged", "info");
      return;
    }
    if (e.button === 0 && socket) {
      setIsMouseDown(true);
      socket.emit('mouse-down', { x: mousePos.x, y: mousePos.y, button: 'left' });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isLocked || !socket) return;
    if (e.button === 0) {
      setIsMouseDown(false);
      socket.emit('mouse-up', { x: mousePos.x, y: mousePos.y, button: 'left' });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isLocked || !socket) return;
    socket.emit('mouse-wheel', { 
      deltaX: e.deltaX, 
      deltaY: e.deltaY 
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isLocked) return;
    e.preventDefault(); // Prevent local context menu
    if (socket) {
      socket.emit('mouse-right-click', { x: mousePos.x, y: mousePos.y });
      onLog(`LimeAPI: Emulated physical right-click at [${mousePos.x}, ${mousePos.y}]`, "info");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLocked || !socket) return;
      
      // Prevent browser shortcuts when "inside" the VM
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab', 'Backspace'].includes(e.key)) {
        e.preventDefault();
      }

      socket.emit('keyboard-press', { key: e.key });
      onLog(`LimeAPI: Emulated physical key press [${e.key}]`, "info");
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, socket, onLog]);

  useEffect(() => {
    const lockChange = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };
    document.addEventListener('pointerlockchange', lockChange);
    return () => document.removeEventListener('pointerlockchange', lockChange);
  }, []);

  return (
    <div id="lime-vm-container" className="relative flex-1 bg-black rounded-sm overflow-hidden border border-lime-border group shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)]">
      {/* OS Header - Replaced by design's internal screen elements if needed, but keeping for utility */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-lime-item/90 backdrop-blur border-b border-lime-border flex items-center justify-between px-3 z-20">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-lime-primary/30" />
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-lime-primary font-bold">
            Lime_Screen: [Regenerating_Pixels]
          </span>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-bold text-lime-muted">
          <span>{fps.toFixed(1)} FPS</span>
          <span>1280x720</span>
          <span className="text-lime-primary opacity-50">SYNC_OK</span>
        </div>
      </div>

      {/* Main Screen */}
      <div 
        ref={containerRef}
        id="lime-canvas-wrapper"
        className={`relative w-full h-full pt-8 ${isLocked ? 'custom-cursor-none' : ''} lime-grid overflow-hidden`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        {/* Virtual Coordinate Space */}
        <div className="relative w-full h-full">
          <canvas 
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain"
          />

          {/* Mouse Emulator (Overlay) */}
          {isLocked && (
            <div 
              className={`absolute pointer-events-none z-50 rounded-full border border-white bg-black shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-transform duration-75 ${isMouseDown ? 'scale-75 opacity-80' : 'scale-100'}`}
              style={{ 
                left: `${(mousePos.x / 1280) * 100}%`, 
                top: `${(mousePos.y / 720) * 100}%`,
                width: '16px',
                height: '16px',
                transform: 'translate(-50%, -50%)'
              }}
            />
          )}
        </div>

        {/* Interaction Overlay */}
        {!isActive && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm transition-all duration-700">
            <div className="relative mb-8">
              <RefreshCw className="w-16 h-16 text-lime-primary animate-spin opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-lime-primary rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-lime-primary font-bold text-xs tracking-[0.3em] uppercase">Attempting Cluster Sync...</p>
            <p className="text-lime-muted text-[10px] mt-4 tracking-widest font-bold">NODE_14 // PROXY_MODE_[THOUSAND]</p>
          </div>
        )}

        {/* Lock Prompt */}
        {!isLocked && isActive && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none group-hover:bg-black/10 transition-all">
            <div className="bg-lime-primary text-black px-6 py-3 font-bold text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300 pointer-events-auto cursor-pointer flex items-center gap-3">
              <MousePointer2 className="w-4 h-4" />
              Engage Circle_ID_881
            </div>
          </div>
        )}
      </div>

      {/* UI Controls - Design specific overlay elements */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="p-4 bg-lime-surface/80 backdrop-blur border border-lime-border-light rounded-sm">
           <div className="text-[9px] text-lime-muted mb-2 uppercase font-bold tracking-widest">Emulated Audio</div>
           <div className="flex gap-1.5 h-10 items-end">
             {[0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.4].map((op, i) => (
               <div 
                key={i}
                className="w-1 bg-lime-primary animate-pulse" 
                style={{ height: `${op * 100}%`, opacity: op }} 
               />
             ))}
           </div>
         </div>
      </div>
    </div>
  );
}
