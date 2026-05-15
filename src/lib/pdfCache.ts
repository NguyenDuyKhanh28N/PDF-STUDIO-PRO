import * as pdfjs from 'pdfjs-dist';

// Configure worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const pdfjsCache = new Map<string, pdfjs.PDFDocumentProxy>();
export const thumbnailCache = new Map<string, string>(); // VirtualPage ID -> base64 data url

export async function loadPdfJsDocument(file: File, id: string): Promise<pdfjs.PDFDocumentProxy> {
  if (pdfjsCache.has(id)) {
    return pdfjsCache.get(id)!;
  }
  const arrayBuffer = await file.arrayBuffer();
  // Using arrayBuffer instead of object URL avoids some resource leak issues with blob URLs
  // and works well with pdfjs-dist
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  pdfjsCache.set(id, doc);
  return doc;
}

export function clearPdfCache(id: string) {
  const doc = pdfjsCache.get(id);
  if (doc) {
    doc.destroy();
    pdfjsCache.delete(id);
  }
}

export async function createThumbnail(doc: pdfjs.PDFDocumentProxy, pageIndex: number, width: number = 200): Promise<string> {
  const page = await doc.getPage(pageIndex + 1); // 1-based index
  const viewport = page.getViewport({ scale: 1 });
  const scale = width / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error("Could not create canvas context");

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const renderContext = {
    canvasContext: context,
    viewport: scaledViewport,
  };

  await page.render(renderContext).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}
