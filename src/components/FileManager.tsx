import React, { useState } from 'react';
import { FileText, Download, Trash2, Edit3, Plus, FileUp, FolderUp } from 'lucide-react';
import { VirtualFile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface FileManagerProps {
  files: VirtualFile[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onImport: (name: string, content: string, type: string) => void;
  onLog: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export default function FileManager({ files, onDelete, onRename, onImport, onLog }: FileManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleDownload = (file: VirtualFile) => {
    const blob = new Blob([file.content], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    onLog(`Disk: Exported ${file.name} to host machine [${file.size} bytes]`, "success");
  };

  const startRename = (file: VirtualFile) => {
    setEditingId(file.id);
    setEditName(file.name);
  };

  const submitRename = (id: string) => {
    onRename(id, editName);
    setEditingId(null);
    onLog(`Disk: Renamed file to ${editName}`, "info");
  };

  const simulateImport = () => {
    // Mocking file input for demo
    const name = `import_${Math.floor(Math.random()*1000)}.bin`;
    onImport(name, "EMULATED_DATA_BLOB", "application/octet-stream");
    onLog(`Disk: Inbound stream detected, writing ${name}`, "success");
  };

  return (
    <div id="file-manager-container" className="flex flex-col h-full bg-lime-aside">
      <div className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] text-lime-muted uppercase tracking-[0.2em] font-bold">Virtual File System</h3>
          <button 
            onClick={simulateImport}
            className="p-1 px-2 border border-lime-border-light hover:bg-lime-primary hover:text-black rounded text-[9px] text-lime-muted font-bold transition-all uppercase"
          >
            Import_File
          </button>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <motion.div 
                key={file.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-2 bg-lime-item border border-lime-border-light flex items-center justify-between group hover:border-lime-primary transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-4 h-4 opacity-20 shrink-0 ${file.type.includes('image') ? 'bg-lime-primary' : file.type.includes('audio') ? 'bg-blue-500' : 'bg-orange-500'}`} />
                  <div className="flex flex-col min-w-0">
                    {editingId === file.id ? (
                      <input 
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => submitRename(file.id)}
                        onKeyDown={(e) => e.key === 'Enter' && submitRename(file.id)}
                        className="bg-black border border-lime-primary px-1 text-[10px] text-lime-primary outline-none"
                      />
                    ) : (
                      <span className="text-[11px] truncate text-lime-text leading-none mb-1 font-bold">{file.name}</span>
                    )}
                    <span className="text-[8px] text-lime-muted uppercase tracking-tighter">{file.size} bytes // disk_A</span>
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDownload(file)} className="p-1 text-lime-muted hover:text-lime-primary transition-colors">
                    <Download className="w-3 h-3" />
                  </button>
                  <button onClick={() => startRename(file)} className="p-1 text-lime-muted hover:text-white transition-colors">
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button onClick={() => onDelete(file.id)} className="p-1 text-lime-muted hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-lime-border grid grid-cols-2 gap-2">
        <button className="h-10 bg-lime-item border border-lime-border-light text-[9px] font-bold text-lime-muted hover:border-lime-primary hover:text-white transition-all uppercase tracking-widest">Rename</button>
        <button className="h-10 bg-lime-item border border-lime-border-light text-[9px] font-bold text-lime-muted hover:border-lime-primary hover:text-white transition-all uppercase tracking-widest">Edit</button>
        <button className="h-10 bg-lime-item border border-lime-border-light text-[9px] font-bold text-lime-muted hover:border-red-500 hover:text-red-500 transition-all uppercase tracking-widest">Purge</button>
        <button className="h-10 bg-lime-primary text-black text-[9px] font-bold hover:opacity-90 transition-all uppercase tracking-widest">Download</button>
      </div>
    </div>
  );
}
