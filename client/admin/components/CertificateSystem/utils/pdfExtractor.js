/**
 * pdfExtractor.js
 *
 * Two utilities for the certificate validator:
 *
 * 1. extractHashFromPDF(pdfFile)
 *    Reads the PDF's metadata Keywords field (set by jsPDF setProperties)
 *    and parses the "lakshya-cert:<hash>" token.
 *    This is 100% reliable because PDF metadata is plain text — no
 *    image compression can corrupt it.
 *
 * 2. pdfPageToCanvas(pdfFile, scale)
 *    Renders page 1 to a canvas (kept for future/debug use).
 */

let _pdfjs = null;

async function getPdfJs() {
  if (_pdfjs) return _pdfjs;

  const pdfjs = await import('pdfjs-dist');

  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).href;
  } catch (_) {
    // Fallback: run pdf.js in the main thread
    pdfjs.GlobalWorkerOptions.workerSrc = '';
  }

  _pdfjs = pdfjs;
  return pdfjs;
}

// ─── Primary: extract hash from PDF metadata ──────────────────────────────────

/**
 * Extract the Lakshya certificate hash from the PDF's info-dictionary metadata.
 *
 * jsPDF embeds it as:  /Keywords  (lakshya-cert:<64-char-hex-hash>)
 * pdfjs exposes it as: metadata.info.Keywords
 *
 * @param {File|Blob} pdfFile
 * @returns {Promise<string|null>} 64-char hex hash, or null if not found
 */
export async function extractHashFromPDF(pdfFile) {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await pdfFile.arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  try {
    const meta = await pdfDoc.getMetadata();

    // pdf.js v4+ returns { info: {...}, metadata: XMPMetadata|null, ... }
    const info = meta?.info || {};

    // Our format: "lakshya-cert:<hash>"
    const keywords = info.Keywords || info.keywords || '';
    const match = keywords.match(/lakshya-cert:([0-9a-f]{64})/i);
    if (match) return match[1];

    // Also check Subject as a secondary field
    const subject = info.Subject || info.subject || '';
    const subjectMatch = subject.match(/lakshya-cert:([0-9a-f]{64})/i);
    if (subjectMatch) return subjectMatch[1];

    return null;
  } finally {
    pdfDoc.destroy();
  }
}

// ─── Secondary: render page to canvas (kept for debug/future use) ─────────────

/**
 * Render the first page of a PDF to a canvas element.
 *
 * @param {File|Blob} pdfFile
 * @param {number}    [scale=3]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function pdfPageToCanvas(pdfFile, scale = 3) {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await pdfFile.arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  try {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas;
  } finally {
    pdfDoc.destroy();
  }
}
