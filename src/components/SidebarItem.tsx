import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RotateCw, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createThumbnail, pdfjsCache } from '../lib/pdfCache';
import { cn } from '../lib/utils';
import { usePdfStore, VirtualPage } from '../store/usePdfStore';

interface SidebarItemProps {
  page: VirtualPage;
  pageNumber: number; // 1-based index in the current workspace
}

export function SidebarItem({ page, pageNumber }: SidebarItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const togglePageSelection = usePdfStore(s => s.togglePageSelection);
  const selectedPageIds = usePdfStore(s => s.selectedPageIds);
  const activePageId = usePdfStore(s => s.activePageId);
  const rotateSelected = usePdfStore(s => s.rotateSelected);
  const deleteSelected = usePdfStore(s => s.deleteSelected);
  
  const isSelected = selectedPageIds.includes(page.id);
  const isActive = activePageId === page.id;

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadThumbnail = async () => {
      try {
        const doc = pdfjsCache.get(page.fileId);
        if (doc) {
          const url = await createThumbnail(doc, page.pageIndex, 200);
          if (active) setThumbnailUrl(url);
        }
      } catch (e) {
        console.error("Failed to load thumbnail", e);
      }
    };
    loadThumbnail();
    return () => { active = false; };
  }, [page.fileId, page.pageIndex]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePageSelection(page.id, e.ctrlKey || e.metaKey || e.shiftKey);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleSelect}
      className={cn(
        "relative flex flex-col items-center gap-2 transition-opacity select-none group",
        isSelected ? "opacity-100" : "opacity-70 hover:opacity-100",
        isDragging && "opacity-50"
      )}
    >
      <div className={cn(
        "w-40 h-52 bg-white rounded shadow transition-colors overflow-hidden flex flex-col items-center relative cursor-grab",
        isSelected ? "border-4 border-blue-500 shadow-xl" : "border border-[#3A3A40] hover:border-gray-400"
      )}>
        {/* Action buttons (rotate, delete) overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
          <button 
            className="w-6 h-6 rounded bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) togglePageSelection(page.id, false);
              setTimeout(() => rotateSelected(90), 0);
            }}
            title="Rotate Right"
          >
            <RotateCw size={12} />
          </button>
          <button 
            className="w-6 h-6 rounded bg-red-500/80 hover:bg-red-600 flex items-center justify-center text-white backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) togglePageSelection(page.id, false);
              setTimeout(() => deleteSelected(), 0);
            }}
            title="Delete page"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div 
          className="w-full h-full flex items-center justify-center bg-white overflow-hidden relative" 
          {...attributes} 
          {...listeners}
        >
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={`Page ${pageNumber}`} 
              style={{ transform: `rotate(${page.rotation}deg)` }}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
               <span className="text-xs text-gray-400">Loading...</span>
            </div>
          )}
        </div>
      </div>
      <span className={cn("text-xs", isSelected ? "text-blue-400 font-medium" : "text-gray-500")}>
        Page {pageNumber}
      </span>
    </div>
  );
}
