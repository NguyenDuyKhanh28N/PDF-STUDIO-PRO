import { PDFDocument, degrees } from 'pdf-lib';
import { VirtualPage } from '../store/usePdfStore';

// NOTE FOR EXPANSION:
// If you want to add watermarking, text extraction, page splitting into ZIP archives,
// or compressions, you can add those features here using the pdf-lib library.

export async function generateNewPdf(pages: VirtualPage[], sourceFiles: Record<string, File>, onProgress?: (progress: number) => void): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const pdfLibCache = new Map<string, PDFDocument>();

  for (let i = 0; i < pages.length; i++) {
    const vPage = pages[i];
    
    let sourceDoc = pdfLibCache.get(vPage.fileId);
    if (!sourceDoc) {
      const file = sourceFiles[vPage.fileId];
      if (!file) {
        console.warn(`File with id ${vPage.fileId} not found.`);
        continue;
      }
      const arrayBuffer = await file.arrayBuffer();
      // Use ignoreEncryption to load even if there are slight restrictions, if possible
      sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      pdfLibCache.set(vPage.fileId, sourceDoc);
    }

    try {
      const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [vPage.pageIndex]);
      
      if (vPage.rotation !== 0) {
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(currentRotation + vPage.rotation));
      }

      mergedPdf.addPage(copiedPage);
    } catch (e) {
      console.error(`Failed to copy page ${vPage.pageIndex} from ${vPage.fileId}`, e);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / pages.length) * 100));
    }
  }

  return await mergedPdf.save();
}

export function downloadPdf(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
