import { get, set, clear } from 'idb-keyval';
import { VirtualPage } from '../store/usePdfStore';

const STORAGE_KEY_PAGES = 'pdf-studio-pages';
const STORAGE_KEY_FILES = 'pdf-studio-files';

export async function saveWorkspaceState(pages: VirtualPage[], sourceFiles: Record<string, File>) {
  try {
    await set(STORAGE_KEY_PAGES, pages);
    
    // Save files as ArrayBuffers
    const filesRecord: Record<string, ArrayBuffer> = {};
    for (const [id, file] of Object.entries(sourceFiles)) {
      filesRecord[id] = await file.arrayBuffer();
    }
    await set(STORAGE_KEY_FILES, filesRecord);
  } catch (e) {
    console.error("Failed to save workspace state", e);
  }
}

export async function loadWorkspaceState(): Promise<{ pages: VirtualPage[], sourceFiles: Record<string, File> } | null> {
  try {
    const pages = await get<VirtualPage[]>(STORAGE_KEY_PAGES);
    const filesRecord = await get<Record<string, ArrayBuffer>>(STORAGE_KEY_FILES);
    
    if (pages && filesRecord) {
      const sourceFiles: Record<string, File> = {};
      for (const [id, buffer] of Object.entries(filesRecord)) {
        // create a File from the ArrayBuffer
        sourceFiles[id] = new File([buffer], `document_${id}.pdf`, { type: 'application/pdf' });
      }
      return { pages, sourceFiles };
    }
  } catch (e) {
    console.error("Failed to load workspace state", e);
  }
  return null;
}

export async function clearWorkspaceState() {
  await clear();
}
