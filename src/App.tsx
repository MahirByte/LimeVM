import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import LimeScreen from './components/LimeScreen';
import FileManager from './components/FileManager';
import ControlPanel from './components/ControlPanel';
import { VirtualFile, LogEntry } from './types';
import { Shield, Zap, Box, Layers, Type, FolderUp, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVMActive, setIsVMActive] = useState(false);
  
  // Emulation States
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [inputText, setInputText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    };
    setLogs(prev => [...prev, newLog].slice(-100));
  }, []);

  useEffect(() => {
    const newSocket = io({
      transports: ['websocket'],
      upgrade: false
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      addLog("LimeNode: Successfully connected to Cluster_Sync_Primary", "success");
      newSocket.emit('get-files');
    });

    newSocket.on('files-list', (fileList: VirtualFile[]) => {
      setFiles(fileList);
    });

    newSocket.on('connect_error', (err) => {
      addLog(`LimeAPI Connection Error: ${err.message}`, "error");
      // Fallback if websocket transport is blocked
      if (newSocket.io.opts.transports?.[0] === 'websocket') {
        newSocket.io.opts.transports = ['polling', 'websocket'];
      }
    });

    newSocket.on('error', (err) => {
      addLog(`LimeAPI Error: ${err}`, "error");
    });

    return () => {
      newSocket.close();
    };
  }, [addLog]);

  const startVM = (url: string) => {
    if (!socket) return;
    setIsConnecting(true);
    addLog(`LimeVM: Initiating Boot Sequence for ${url}...`, "info");
    addLog("Lime_Screen: Regenerating Pixel Buffer", "info");
    addLog("Lime_API_Sync: Attempting_Cluster_Sync_Node_14", "info");
    
    socket.emit('start-vm', url);
    
    // Simulate successful boot for UI responsiveness
    setTimeout(() => {
      setIsConnecting(false);
      setIsVMActive(true);
      addLog("LimeVM: OS Fully Booted. 60 FPS Sync Active.", "success");
    }, 2000);
  };

  const deleteFile = (id: string) => {
    socket?.emit('delete-file', id);
    addLog(`Disk: File purged from sector.`, "warning");
  };

  const renameFile = (id: string, newName: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const importFile = (name: string, content: string, type: string, size: number) => {
    const newFile: VirtualFile = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      content,
      size,
      type
    };
    setFiles(prev => [newFile, ...prev]);
    socket?.emit('get-files'); // Refresh list if backend managed
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    Array.from(fileList).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        importFile(file.name, content, file.type, file.size);
        addLog(`Disk: Successfully emulated import of ${file.name} [${file.size} bytes]`, "success");
      };
      reader.readAsText(file);
    });
  };

  const sendEmulatedText = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && inputText) {
      socket.emit('keyboard-type', { text: inputText });
      addLog(`LimeAPI: Emulating keypress sequence [${inputText.length} chars]`, "success");
      setInputText("");
      setShowTypeModal(false);
    }
  };

  const captureScreen = () => {
    if (!isVMActive) return;
    const name = `capture_${Date.now()}.png`;
    importFile(name, "PIXEL_BUFFER_DUMP_0x0001", "image/png", 1024);
    addLog(`Lime_Screen: Snapshot captured and written to disk: ${name}`, "success");
  };

  return (
    <div className="flex flex-col h-screen bg-lime-dark select-none font-mono">
      {/* Hidden Inputs for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        multiple 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={folderInputRef} 
        onChange={handleFileImport} 
        webkitdirectory="" 
        {...({ directory: "" } as any)}
        className="hidden" 
      />

      {/* Global Header */}
      <header className="h-12 bg-lime-surface border-b border-lime-border flex items-center px-4 justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-lime-primary rounded-full shadow-[0_0_8px_#CCFF00]" />
            <span className="font-bold tracking-tighter text-lime-primary uppercase">Lime_VM</span>
          </div>
          <div className="h-6 w-px bg-lime-border-light mx-2" />
          <div className="bg-lime-item px-3 py-1 rounded border border-lime-border-light flex items-center gap-3">
            <span className="text-[10px] text-lime-muted uppercase tracking-widest">Target URL</span>
            <span className="text-xs text-lime-primary opacity-80 max-w-[200px] truncate">
              {isVMActive ? "https://cloud.engine.api/v1/cluster_sync" : "AWAITING_BOOT..."}
            </span>
          </div>
        </div>

        <div className="flex gap-6 text-[10px] tracking-widest text-lime-muted uppercase font-bold">
          <span>FPS: <b className="text-lime-primary">60.0</b></span>
          <span>Node: <b className="text-lime-primary">Cluster_14</b></span>
          <span>Mode: <b className="text-white">Proxy_Thousand</b></span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Component Canvas */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <LimeScreen 
            socket={socket} 
            isActive={isVMActive} 
            onLog={addLog}
          />
          
          <div className="h-40 bg-[#0F0F0F] border border-lime-border flex flex-col rounded-sm overflow-hidden shadow-2xl">
            <div className="px-3 py-1 bg-lime-item border-b border-lime-border text-[9px] text-lime-muted flex justify-between uppercase tracking-widest">
              <span>System_Diagnostics_Log</span>
              <span className="text-lime-primary">Auto_Recovery: ON</span>
            </div>
            <div className="flex-1 p-3 text-[11px] leading-relaxed overflow-y-auto custom-scrollbar font-mono">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2 mb-0.5">
                  <span className="text-lime-primary whitespace-nowrap">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-500' : ''}
                    ${log.type === 'success' ? 'text-white' : ''}
                    ${log.type === 'warning' ? 'text-yellow-500' : ''}
                    ${log.type === 'info' ? 'text-lime-muted' : ''}
                    break-all
                  `}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Aside: File System & Commands */}
        <aside className="w-80 bg-lime-aside border-l border-lime-border flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            <div className="p-4">
              <ControlPanel 
                logs={[]} // Logs are now handled in the main diagnostic area
                onStartVM={startVM} 
                onEmulateType={() => setShowTypeModal(true)}
                onImport={() => fileInputRef.current?.click()}
                isConnecting={isConnecting}
              />
            </div>
            
            <div className="p-4 border-t border-lime-border">
              <FileManager 
                files={files} 
                onDelete={deleteFile} 
                onRename={renameFile}
                onImport={(name, content, type) => importFile(name, content, type, content.length)}
                onLog={addLog}
              />
            </div>
          </div>

          <div className="p-4 bg-lime-surface border-t border-lime-border mt-auto">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] text-lime-muted uppercase tracking-widest">Direct Command Hub</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  className="py-2 bg-lime-item border border-lime-border-light text-lime-muted text-[10px] font-bold uppercase tracking-widest hover:border-lime-primary hover:text-white transition-all rounded-sm flex items-center justify-center gap-2"
                >
                  <FolderUp className="w-3 h-3" />
                  Import Folder
                </button>
                <button 
                  onClick={captureScreen}
                  className="py-2 bg-lime-primary text-black text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all rounded-sm"
                >
                  Capture
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Emulate Type Modal */}
      <AnimatePresence>
        {showTypeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-lime-surface border border-lime-primary/30 p-8 rounded-sm w-full max-w-md shadow-[0_0_50px_rgba(204,255,0,0.15)]"
            >
              <div className="flex items-center gap-3 mb-6 text-lime-primary">
                <Type className="w-6 h-6" />
                <h3 className="font-mono font-bold uppercase tracking-[0.3em] text-sm">Remote_Input_Sync</h3>
              </div>
              <form onSubmit={sendEmulatedText}>
                <textarea 
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter characters to transmit to cluster..."
                  className="w-full h-32 bg-black border border-lime-border-light p-4 text-lime-primary font-mono text-xs focus:outline-none focus:border-lime-primary transition-colors mb-6 resize-none custom-scrollbar"
                />
                <div className="flex justify-end gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowTypeModal(false)}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-lime-muted hover:text-white transition-colors"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-lime-primary text-black font-bold uppercase tracking-widest text-[11px] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                  >
                    Transmit to Output
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Status Footer */}
      <footer className="h-6 bg-lime-primary text-black flex items-center px-4 justify-between text-[9px] font-bold uppercase tracking-tighter shrink-0 z-50">
        <div className="flex gap-6">
          <span>Status: <span className={isVMActive ? "text-black" : "animate-pulse"}>{isVMActive ? "OPERATIONAL" : "BOOTING"}</span></span>
          <span className="opacity-50">|</span>
          <span>Engine: <span className="bg-black text-lime-primary px-1">ACCEL_ON</span></span>
          <span className="opacity-50">|</span>
          <span>Buffer: SYNCED</span>
        </div>
        <div className="flex gap-4">
          <span>MEM: 1.4GB / 4.0GB</span>
          <span>SYSTEM_STABLE</span>
          <span>© 2026 LIME_VM</span>
        </div>
      </footer>
    </div>
  );
}
