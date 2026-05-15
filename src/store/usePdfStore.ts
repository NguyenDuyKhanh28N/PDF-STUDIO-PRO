import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid or just use crypto.randomUUID()

export interface VirtualPage {
  id: string; // unique identifier for dnd
  fileId: string;
  pageIndex: number; // 0-based
  rotation: number; // relative rotation: 0, 90, 180, 270
}

interface PdfState {
  // Data
  sourceFiles: Record<string, File>;
  pages: VirtualPage[];
  
  // Undo/Redo history
  history: VirtualPage[][];
  currentIndex: number;

  // UI state
  selectedPageIds: string[];
  activePageId: string | null; // For large preview
  zoomLevel: number;
  isProcessing: boolean;
  progress: number;
}

interface PdfActions {
  addFiles: (files: File[]) => Promise<void>;
  splitSelected: () => void; // Removes unselected pages
  deleteSelected: () => void;
  rotateSelected: (degrees: number) => void;
  reorderPages: (activeId: string, overId: string) => void;
  togglePageSelection: (id: string, multiSelect: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setActivePage: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setIsProcessing: (isProcessing: boolean, progress?: number) => void;
  undo: () => void;
  redo: () => void;
  clearWorkspace: () => void;
  pushHistory: (newPages: VirtualPage[]) => void;
}

export const usePdfStore = create<PdfState & PdfActions>((set, get) => ({
  sourceFiles: {},
  pages: [],
  history: [[]],
  currentIndex: 0,
  selectedPageIds: [],
  activePageId: null,
  zoomLevel: 100,
  isProcessing: false,
  progress: 0,

  pushHistory: (newPages: VirtualPage[]) => {
    const { history, currentIndex } = get();
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newPages);
    set({
      pages: newPages,
      history: newHistory,
      currentIndex: newHistory.length - 1,
    });
  },

  addFiles: async (files: File[]) => {
    set({ isProcessing: true, progress: 0 });
    const { sourceFiles, pages, pushHistory } = get();
    const newSourceFiles = { ...sourceFiles };
    const newPages = [...pages];

    try {
      // Dynamic import to avoid circular dependencies if needed, or just normal import
      const { loadPdfJsDocument } = await import('../lib/pdfCache');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = crypto.randomUUID();
        newSourceFiles[fileId] = file;

        // Load document to know page count
        const doc = await loadPdfJsDocument(file, fileId);
        
        for (let j = 0; j < doc.numPages; j++) {
          newPages.push({
            id: crypto.randomUUID(),
            fileId,
            pageIndex: j,
            rotation: 0,
          });
        }
        set({ progress: Math.round(((i + 1) / files.length) * 100) });
      }

      set({ sourceFiles: newSourceFiles });
      pushHistory(newPages);
      
      // Auto-select first page for preview if none selected
      if (!get().activePageId && newPages.length > 0) {
        set({ activePageId: newPages[0].id });
      }
    } catch (e) {
      console.error("Error adding files", e);
      alert("Failed to load PDF. The file might be corrupted or password protected.");
    } finally {
      set({ isProcessing: false, progress: 0 });
    }
  },

  deleteSelected: () => {
    const { pages, selectedPageIds, pushHistory, activePageId } = get();
    if (selectedPageIds.length === 0) return;
    
    const newPages = pages.filter(p => !selectedPageIds.includes(p.id));
    pushHistory(newPages);
    
    const newActiveId = selectedPageIds.includes(activePageId || "") ? (newPages.length > 0 ? newPages[0].id : null) : activePageId;
    set({ selectedPageIds: [], activePageId: newActiveId });
  },

  splitSelected: () => {
    const { pages, selectedPageIds, pushHistory } = get();
    if (selectedPageIds.length === 0) return;
    
    // Keep only selected pages
    const newPages = pages.filter(p => selectedPageIds.includes(p.id));
    pushHistory(newPages);
    set({ selectedPageIds: [] });
  },

  rotateSelected: (degrees: number) => {
    const { pages, selectedPageIds, pushHistory } = get();
    if (selectedPageIds.length === 0) return;

    const newPages = pages.map(p => {
      if (selectedPageIds.includes(p.id)) {
        return { ...p, rotation: (p.rotation + degrees) % 360 };
      }
      return p;
    });
    pushHistory(newPages);
  },

  reorderPages: (activeId: string, overId: string) => {
    const { pages, pushHistory } = get();
    const oldIndex = pages.findIndex(p => p.id === activeId);
    const newIndex = pages.findIndex(p => p.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newPages = [...pages];
      const [movedItem] = newPages.splice(oldIndex, 1);
      newPages.splice(newIndex, 0, movedItem);
      pushHistory(newPages);
    }
  },

  togglePageSelection: (id: string, multiSelect: boolean) => {
    const { selectedPageIds } = get();
    if (multiSelect) {
      if (selectedPageIds.includes(id)) {
        set({ selectedPageIds: selectedPageIds.filter(pid => pid !== id) });
      } else {
        set({ selectedPageIds: [...selectedPageIds, id], activePageId: id });
      }
    } else {
      set({ selectedPageIds: [id], activePageId: id });
    }
  },

  selectAll: () => {
    set({ selectedPageIds: get().pages.map(p => p.id) });
  },

  clearSelection: () => {
    set({ selectedPageIds: [] });
  },

  setActivePage: (id: string | null) => {
    set({ activePageId: id });
    if (id && get().selectedPageIds.length <= 1) {
      set({ selectedPageIds: [id] });
    }
  },

  setZoom: (zoom: number) => set({ zoomLevel: zoom }),

  setIsProcessing: (isProcessing: boolean, progress: number = 0) => set({ isProcessing, progress }),

  undo: () => {
    const { history, currentIndex } = get();
    if (currentIndex > 0) {
      set({
        currentIndex: currentIndex - 1,
        pages: history[currentIndex - 1],
        selectedPageIds: []
      });
    }
  },

  redo: () => {
    const { history, currentIndex } = get();
    if (currentIndex < history.length - 1) {
      set({
        currentIndex: currentIndex + 1,
        pages: history[currentIndex + 1],
        selectedPageIds: []
      });
    }
  },

  clearWorkspace: () => {
    set({
      sourceFiles: {},
      pages: [],
      history: [[]],
      currentIndex: 0,
      selectedPageIds: [],
      activePageId: null,
      zoomLevel: 100,
    });
  }
}));
