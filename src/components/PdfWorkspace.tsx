import React, { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePdfStore } from '../store/usePdfStore';
import { Sidebar } from './Sidebar';
import { MainPreview } from './MainPreview';
import { Toolbar } from './Toolbar';
import { generateNewPdf, downloadPdf } from '../lib/pdfCore';
import { saveWorkspaceState, loadWorkspaceState } from '../lib/storage';

// NOTE FOR EXPANSION:
// If you want to add an explicit "Save" feature instead of auto-saving,
// or if you want to support Cloud Sync (e.g. Firebase, Google Drive),
// you can inject that logic into the sync effect below.

export function PdfWorkspace() {
  const deleteSelected = usePdfStore(s => s.deleteSelected);
  const undo = usePdfStore(s => s.undo);
  const redo = usePdfStore(s => s.redo);
  const selectAll = usePdfStore(s => s.selectAll);
  const clearSelection = usePdfStore(s => s.clearSelection);
  const addFiles = usePdfStore(s => s.addFiles);
  const store = usePdfStore(); // for export
  
  const [isInitializing, setIsInitializing] = useState(true);

  // Load state on mount
  useEffect(() => {
    async function load() {
      try {
        const state = await loadWorkspaceState();
        if (state && state.pages.length > 0) {
          usePdfStore.setState({
            sourceFiles: state.sourceFiles,
            pages: state.pages,
            history: [state.pages],
            currentIndex: 0,
            activePageId: state.pages[0].id
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsInitializing(false);
      }
    }
    load();
  }, []);

  // Save state on change
  useEffect(() => {
    if (!isInitializing) {
      const timeout = setTimeout(() => {
        saveWorkspaceState(store.pages, store.sourceFiles);
      }, 1000); // debounce saving
      return () => clearTimeout(timeout);
    }
  }, [store.pages, store.sourceFiles, isInitializing]);

  // Keyboard shortcuts
  useHotkeys('delete, backspace', (e) => {
    // Only delete if we are not typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    deleteSelected();
  }, [deleteSelected]);

  useHotkeys('mod+z', (e) => {
    e.preventDefault();
    undo();
  }, [undo]);

  useHotkeys('mod+y, mod+shift+z', (e) => {
    e.preventDefault();
    redo();
  }, [redo]);

  useHotkeys('mod+a', (e) => {
    e.preventDefault();
    selectAll();
  }, [selectAll]);

  useHotkeys('escape', () => {
    clearSelection();
  }, [clearSelection]);

  useHotkeys('mod+s', async (e) => {
    e.preventDefault();
    if (store.pages.length === 0) return;
    store.setIsProcessing(true, 0);
    try {
      const data = await generateNewPdf(store.pages, store.sourceFiles, (p) => store.setIsProcessing(true, p));
      downloadPdf(data, "Exported_Document.pdf");
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      store.setIsProcessing(false, 0);
    }
  }, [store]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F10] text-[#E0E0E0] font-sans overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainPreview />
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-[#1A1A1C] border-t border-[#2A2A2E] flex items-center justify-between px-4 text-[10px] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Ready</span>
          </div>
          <span className="text-[#4A4A4E]">|</span>
          <span className="text-gray-400">{store.selectedPageIds.length} Page(s) Selected</span>
          <span className="text-[#4A4A4E]">|</span>
          <span className="text-gray-400 italic">Local State Saved</span>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
           <span>{store.pages.length} Total Pages</span>
           {store.isProcessing && (
             <div className="w-32 h-1.5 bg-[#2A2A2E] rounded-full overflow-hidden">
               <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${store.progress}%` }}></div>
             </div>
           )}
        </div>
      </footer>
    </div>
  );
}
