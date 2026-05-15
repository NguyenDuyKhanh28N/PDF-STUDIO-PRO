import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { usePdfStore } from '../store/usePdfStore';
import { SidebarItem } from './SidebarItem';
import React from 'react';

export function Sidebar() {
  const pages = usePdfStore(s => s.pages);
  const reorderPages = usePdfStore(s => s.reorderPages);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderPages(active.id as string, over.id as string);
    }
  };

  return (
    <aside className="w-60 bg-[#161618] border-r border-[#2A2A2E] flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-[#2A2A2E] flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Pages ({pages.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={pages.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col items-center gap-4">
              {pages.map((page, index) => (
                <SidebarItem key={page.id} page={page} pageNumber={index + 1} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}
