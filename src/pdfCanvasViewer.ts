import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfDocCacheEntry {
  promise: Promise<pdfjsLib.PDFDocumentProxy>;
}

const pdfCache = new Map<string, PdfDocCacheEntry>();

function loadPdfDocument(url: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const existing = pdfCache.get(url);
  if (existing) return existing.promise;

  const loadingTask = pdfjsLib.getDocument({
    url,
    withCredentials: false,
  });

  const promise = loadingTask.promise.catch((err) => {
    pdfCache.delete(url);
    throw err;
  });

  pdfCache.set(url, { promise });
  return promise;
}

export interface PdfViewerState {
  url: string;
  pageNumber: number;
  totalPages: number;
  zoom: number;
}

export interface PdfCanvasViewerOptions {
  host: HTMLElement;
  onStateChange?: (state: PdfViewerState) => void;
}

export interface PdfCanvasViewerController {
  open: (url: string, initialPage?: number) => Promise<void>;
  setPage: (pageNum: number) => Promise<void>;
  stepPage: (delta: number) => Promise<void>;
  setZoom: (delta: number) => Promise<void>;
  resetZoom: () => Promise<void>;
  getState: () => PdfViewerState;
  clear: () => void;
}

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.0;

export function createPdfCanvasViewer(options: PdfCanvasViewerOptions): PdfCanvasViewerController {
  const { host, onStateChange } = options;

  let currentUrl = '';
  let currentDoc: pdfjsLib.PDFDocumentProxy | null = null;
  let currentPage = 1;
  let totalPages = 0;
  let zoom = 1.0;
  let renderSeq = 0;
  let activeRenderTask: pdfjsLib.RenderTask | null = null;

  function emitState(): void {
    onStateChange?.({
      url: currentUrl,
      pageNumber: currentPage,
      totalPages,
      zoom,
    });
  }

  function showLoading(message: string): void {
    host.innerHTML = `
      <div class="w-full h-full min-h-[260px] flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-600">
        <div class="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <i class="fa-solid fa-spinner fa-spin text-base" aria-hidden="true"></i>
        </div>
        <p class="text-xs sm:text-sm font-semibold text-slate-700">${message}</p>
      </div>
    `;
  }

  function showError(url: string, message: string): void {
    const safeUrl = url.replace(/"/g, '&quot;');
    host.innerHTML = `
      <div class="w-full h-full min-h-[260px] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div class="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <i class="fa-solid fa-file-circle-exclamation text-lg" aria-hidden="true"></i>
        </div>
        <div class="space-y-1 max-w-sm">
          <p class="text-sm font-bold text-slate-900">Unable to render PDF page inline</p>
          <p class="text-xs text-slate-600">${message}</p>
        </div>
        <a href="${safeUrl}" download class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5">
          <i class="fa-solid fa-download text-[11px]" aria-hidden="true"></i>
          <span>Download Original PDF</span>
        </a>
      </div>
    `;
  }

  async function renderCurrentPage(): Promise<void> {
    if (!currentDoc) return;
    const seq = ++renderSeq;

    if (activeRenderTask) {
      try {
        activeRenderTask.cancel();
      } catch {
        // Ignore cancellation race
      }
      activeRenderTask = null;
    }

    const clamped = Math.max(1, Math.min(currentDoc.numPages, currentPage));
    currentPage = clamped;
    totalPages = currentDoc.numPages;
    emitState();

    try {
      const page = await currentDoc.getPage(clamped);
      if (seq !== renderSeq) return;

      const baseViewport = page.getViewport({ scale: 1.0 });
      const availableWidth = Math.max(280, (host.clientWidth || 720) - 32);
      const fitScale = Math.min(1.8, availableWidth / baseViewport.width);
      const effectiveScale = Math.max(0.5, fitScale * zoom);
      const viewport = page.getViewport({ scale: effectiveScale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const wrapper = document.createElement('div');
      wrapper.className = 'w-full flex flex-col items-center py-4 px-3 sm:px-4';

      const pageCard = document.createElement('div');
      pageCard.className =
        'bg-white shadow-md rounded-lg border border-slate-200 overflow-hidden inline-block';

      const canvas = document.createElement('canvas');
      canvas.setAttribute('data-pdf-page', String(clamped));
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.className = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showError(currentUrl, 'Browser canvas context unavailable.');
        return;
      }

      pageCard.appendChild(canvas);
      wrapper.appendChild(pageCard);

      const footerHint = document.createElement('div');
      footerHint.className = 'mt-3 text-[11px] font-medium text-slate-500 tabular-nums';
      footerHint.textContent = `Page ${clamped} of ${currentDoc.numPages} · ${Math.round(zoom * 100)}% zoom`;
      wrapper.appendChild(footerHint);

      host.innerHTML = '';
      host.appendChild(wrapper);

      const renderTask = page.render({
        canvas,
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      activeRenderTask = renderTask;
      await renderTask.promise;
      if (seq === renderSeq) {
        activeRenderTask = null;
        host.scrollTop = 0;
      }
    } catch (err: unknown) {
      if (seq !== renderSeq) return;
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'RenderingCancelledException') return;
      const msg = err instanceof Error ? err.message : 'Please try downloading the PDF instead.';
      showError(currentUrl, msg);
    }
  }

  async function open(url: string, initialPage = 1): Promise<void> {
    if (!url) {
      clear();
      return;
    }

    const sameDoc = url === currentUrl && currentDoc !== null;
    currentUrl = url;
    currentPage = Math.max(1, Number(initialPage) || 1);

    if (sameDoc) {
      await renderCurrentPage();
      return;
    }

    currentDoc = null;
    totalPages = 0;
    zoom = 1.0;
    const seq = ++renderSeq;
    showLoading('Loading OCR Exam Paper PDF…');
    emitState();

    try {
      const doc = await loadPdfDocument(url);
      if (seq !== renderSeq) return;
      currentDoc = doc;
      totalPages = doc.numPages;
      currentPage = Math.max(1, Math.min(doc.numPages, currentPage));
      await renderCurrentPage();
    } catch (err: unknown) {
      if (seq !== renderSeq) return;
      const msg = err instanceof Error ? err.message : 'Could not fetch PDF document.';
      showError(url, msg);
    }
  }

  async function setPage(pageNum: number): Promise<void> {
    if (!currentDoc) {
      currentPage = Math.max(1, Number(pageNum) || 1);
      return;
    }
    const target = Math.max(1, Math.min(currentDoc.numPages, Number(pageNum) || 1));
    if (target === currentPage && host.querySelector('canvas')) return;
    currentPage = target;
    await renderCurrentPage();
  }

  async function stepPage(delta: number): Promise<void> {
    if (!currentDoc) return;
    const target = Math.max(1, Math.min(currentDoc.numPages, currentPage + delta));
    if (target === currentPage) return;
    currentPage = target;
    await renderCurrentPage();
  }

  async function setZoom(delta: number): Promise<void> {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((zoom + delta) * 100) / 100));
    if (next === zoom) return;
    zoom = next;
    await renderCurrentPage();
  }

  async function resetZoom(): Promise<void> {
    if (zoom === 1.0) return;
    zoom = 1.0;
    await renderCurrentPage();
  }

  function clear(): void {
    renderSeq++;
    if (activeRenderTask) {
      try {
        activeRenderTask.cancel();
      } catch {
        // Ignore cancellation
      }
      activeRenderTask = null;
    }
    currentUrl = '';
    currentDoc = null;
    currentPage = 1;
    totalPages = 0;
    zoom = 1.0;
    host.innerHTML = '';
    emitState();
  }

  return {
    open,
    setPage,
    stepPage,
    setZoom,
    resetZoom,
    getState: () => ({
      url: currentUrl,
      pageNumber: currentPage,
      totalPages,
      zoom,
    }),
    clear,
  };
}
