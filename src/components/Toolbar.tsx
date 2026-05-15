import { 
  Download, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  Split, 
  Undo2, 
  Redo2, 
  Plus, 
  ZoomIn, 
  ZoomOut,
  Moon,
  Sun
} from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { generateNewPdf, downloadPdf } from '../lib/pdfCore';
import React, { useRef } from 'react';

export function Toolbar() {
  const store = usePdfStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (store.pages.length === 0) return;
    store.setIsProcessing(true, 0);
    try {
      const data = await generateNewPdf(store.pages, store.sourceFiles, (p) => store.setIsProcessing(true, p));
      downloadPdf(data, "Exported_Document.pdf");
    } catch (e) {
      console.error("Failed to export", e);
      alert("Failed to export PDF.");
    } finally {
      store.setIsProcessing(false, 0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await store.addFiles(Array.from(e.target.files));
    }
    e.target.value = ''; // Reset input
  };

  const canUndo = store.currentIndex > 0;
  const canRedo = store.currentIndex < store.history.length - 1;

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-[#1A1A1C] border-b border-[#2A2A2E] shadow-lg shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-white uppercase">PDF STUDIO PRO</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-widest">Document Editor</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-[#2A2A2E] rounded-md p-1 mr-4">
          <button 
            onClick={store.undo} 
            disabled={!canUndo} 
            className="disabled:opacity-30 px-3 py-1 text-xs hover:bg-[#3A3A40] rounded text-gray-300 transition-colors"
          >
            Undo (Ctrl+Z)
          </button>
          <button 
            onClick={store.redo} 
            disabled={!canRedo} 
            className="disabled:opacity-30 px-3 py-1 text-xs hover:bg-[#3A3A40] rounded text-gray-300 transition-colors"
          >
            Redo (Ctrl+Y)
          </button>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="application/pdf"
          multiple 
          onChange={handleFileChange}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#2A2A2E] border border-[#3A3A40] rounded text-sm font-medium hover:bg-[#323238] transition-colors text-white"
        >
          <Plus size={14} />
          Insert PDF
        </button>
        
        <button 
          onClick={handleExport}
          disabled={store.pages.length === 0 || store.isProcessing}
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 rounded text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {store.isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
              {store.progress}%
            </span>
          ) : (
            <>
              <Download size={14} />
              Export Project
            </>
          )}
        </button>
      </div>
    </header>
  );
}
