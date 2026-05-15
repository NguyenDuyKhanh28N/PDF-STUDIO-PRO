import React, { useEffect, useRef } from 'react';
import { usePdfStore } from '../store/usePdfStore';
import { pdfjsCache } from '../lib/pdfCache';
import { FileUp, RotateCcw, RotateCw, Trash2, Split, ZoomIn, ZoomOut, Expand } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export function MainPreview() {
  const store = usePdfStore();
  const activePageId = store.activePageId;
  const pages = store.pages;
  const zoomLevel = store.zoomLevel;
  const activePage = pages.find(p => p.id === activePageId);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: (acceptedFiles) => {
      store.addFiles(acceptedFiles);
    },
    noClick: pages.length > 0, // only allow click to upload if no pages
  });

  useEffect(() => {
    let renderTask: any = null;
    let active = true;

    const renderPage = async () => {
      if (!activePage || !canvasRef.current) return;
      
      const doc = pdfjsCache.get(activePage.fileId);
      if (!doc) return;

      try {
        const page = await doc.getPage(activePage.pageIndex + 1);
        const viewport = page.getViewport({ scale: zoomLevel / 100 });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
      } catch (e) {
        if (active) {
          console.error("Render failed", e);
        }
      }
    };

    if (activePage) {
      renderPage();
    }

    return () => {
      active = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [activePage, zoomLevel]);

  const hasSelection = store.selectedPageIds.length > 0;

  return (
    <main className="flex-1 bg-[#0F0F10] relative flex flex-col items-center" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Editor Toolbar */}
      <div className="w-full h-12 bg-[#1A1A1C] border-b border-[#2A2A2E] flex items-center justify-center gap-6 px-4 shrink-0 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 bg-[#2A2A2E] rounded-md p-0.5">
           <button 
             disabled={!hasSelection}
             onClick={() => store.rotateSelected(-90)}
             className="disabled:opacity-50 px-3 py-1 text-xs font-medium hover:bg-[#3A3A40] rounded text-gray-200 flex items-center gap-2 transition-colors"
           >
             <RotateCcw size={14} />
             Rotate Left
           </button>
           <button 
             disabled={!hasSelection}
             onClick={() => store.rotateSelected(90)}
             className="disabled:opacity-50 px-3 py-1 text-xs font-medium hover:bg-[#3A3A40] rounded text-gray-200 flex items-center gap-2 border-l border-[#3A3A40] transition-colors"
           >
             <RotateCw size={14} />
             Rotate Right
           </button>
        </div>

        <div className="flex items-center gap-1 bg-[#2A2A2E] rounded-md p-0.5">
           <button 
             disabled={!hasSelection}
             onClick={store.splitSelected}
             className="disabled:opacity-50 px-3 py-1 text-xs font-medium hover:bg-[#3A3A40] rounded text-gray-200 flex items-center gap-2 transition-colors border-r border-[#3A3A40]"
           >
             <Split size={14} />
             Extract Selected
           </button>
           <button 
             disabled={!hasSelection}
             onClick={store.deleteSelected}
             className="disabled:opacity-50 px-3 py-1 text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded flex items-center gap-2 transition-colors"
           >
             <Trash2 size={14} />
             Delete Page (Del)
           </button>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button 
              disabled={pages.length === 0}
              onClick={() => store.setZoom(Math.max(20, store.zoomLevel - 20))}
              className="w-6 h-6 flex items-center justify-center bg-[#2A2A2E] rounded hover:text-white disabled:opacity-50"
            >
              -
            </button>
            <span className="w-10 text-center font-mono">{store.zoomLevel}%</span>
            <button 
              disabled={pages.length === 0}
              onClick={() => store.setZoom(Math.min(300, store.zoomLevel + 20))}
              className="w-6 h-6 flex items-center justify-center bg-[#2A2A2E] rounded hover:text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
          <button 
            disabled={pages.length === 0}
            onClick={() => store.setZoom(100)}
            className="p-1.5 hover:bg-[#2A2A2E] rounded text-gray-400 disabled:opacity-50"
          >
             <Expand size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full p-10 flex items-start justify-center overflow-auto outline-none relative">
        {isDragActive && (
          <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500 m-4 rounded-xl flex items-center justify-center">
            <div className="bg-[#1A1A1C] border border-[#2A2A2E] p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
              <FileUp size={48} className="text-blue-500 animate-bounce" />
              <h3 className="text-xl font-semibold text-[#E0E0E0]">Drop PDF here to import</h3>
            </div>
          </div>
        )}

        {activePage ? (
          <div 
            className="bg-white shadow-2xl transition-transform duration-200"
            style={{ transform: `rotate(${activePage.rotation}deg)` }}
          >
            <canvas ref={canvasRef} className="max-w-full drop-shadow-md" />
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-gray-500 pointer-events-none">
            <FileUp size={64} className="opacity-50" />
            <p className="text-lg">Drag & Drop PDF files here or click Add PDF</p>
          </div>
        )}
      </div>
    </main>
  );
}
