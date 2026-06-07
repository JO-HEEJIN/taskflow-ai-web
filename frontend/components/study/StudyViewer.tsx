'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// pdfjs-dist is imported dynamically inside the effect (client only). Importing it
// at module scope runs its top-level code during SSR, where Node 20 lacks
// Promise.withResolvers and crashes the render.

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Viewer modes from the spec:
// all      - show the full page with tier-colored overlays (encode/study)
// hide     - blank every tiered region (self-test by recalling them)
// anchors  - show only tier-1 anchors; blank tier 2 and 3 (reconstruct the rest)
type Mode = 'all' | 'hide' | 'anchors';

interface FractionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Region {
  id: string;
  pageIndex: number;
  type: string;
  bbox: FractionBox;
  tier?: 1 | 2 | 3;
}

const TIER_RGB: Record<number, string> = {
  1: '239,68,68', // red, anchor
  2: '245,158,11', // amber, supporting
  3: '96,165,250', // blue, full
};

function ownerRef(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userId') || localStorage.getItem('guest_id') || '';
}

export function StudyViewer({ bookId }: { bookId: string }) {
  const [title, setTitle] = useState<string>('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [renderedSizes, setRenderedSizes] = useState<Record<number, { w: number; h: number }>>({});
  const [mode, setMode] = useState<Mode>('all');
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  // Load book detail (regions) and the PDF, then render every page to a canvas.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const owner = ownerRef();
        const headers = { 'x-user-id': owner };
        const detailRes = await fetch(`${API}/api/study/books/${bookId}`, { headers });
        if (!detailRes.ok) throw new Error(`Failed to load book (${detailRes.status})`);
        const detail = await detailRes.json();
        if (cancelled) return;
        setTitle(detail.book?.title || '');
        setRegions(detail.regions || []);
        setPageCount(detail.book?.pageCount || 0);

        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const doc = await pdfjs.getDocument({
          url: `${API}/api/study/books/${bookId}/pdf`,
          httpHeaders: headers,
          // Fetch the whole PDF in one owner-verified request; avoids Range/206 handling.
          disableRange: true,
          disableStream: true,
        }).promise;

        const sizes: Record<number, { w: number; h: number }> = {};
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(900 / baseViewport.width, 2);
          const viewport = page.getViewport({ scale });
          const canvas = canvasRefs.current[i - 1];
          if (!canvas) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          sizes[i - 1] = { w: viewport.width, h: viewport.height };
          if (cancelled) return;
          setRenderedSizes((prev) => ({ ...prev, ...sizes }));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load study viewer');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Per-region overlay style for the current mode. Returns null when the region
  // should not be drawn in this mode.
  const overlayStyle = useCallback(
    (r: Region): React.CSSProperties | null => {
      const tier = r.tier || 3;
      const rgb = TIER_RGB[tier];
      const base: React.CSSProperties = {
        position: 'absolute',
        left: `${r.bbox.x * 100}%`,
        top: `${r.bbox.y * 100}%`,
        width: `${r.bbox.width * 100}%`,
        height: `${r.bbox.height * 100}%`,
        borderRadius: 2,
        pointerEvents: 'none',
      };
      if (mode === 'all') {
        return { ...base, background: `rgba(${rgb},0.28)`, border: `1px solid rgba(${rgb},0.7)` };
      }
      if (mode === 'hide') {
        // blank every tiered region
        return { ...base, background: `rgb(${rgb})` };
      }
      // anchors: keep tier 1 visible (faint outline), blank tier 2 and 3
      if (tier === 1) {
        return { ...base, border: `1px solid rgba(${rgb},0.8)` };
      }
      return { ...base, background: 'rgb(15,10,40)' };
    },
    [mode]
  );

  const modeButton = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      data-mode={m}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid rgba(167,139,250,0.4)',
        background: mode === m ? 'rgba(167,139,250,0.35)' : 'rgba(0,0,0,0.4)',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  if (error) {
    return <div style={{ color: '#fca5a5', padding: 24 }}>{error}</div>;
  }

  return (
    <div style={{ padding: 16, color: 'white' }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>{title || 'Study'}</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {modeButton('all', 'Show all')}
        {modeButton('hide', 'Hide overlay regions')}
        {modeButton('anchors', 'Show only anchors')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {Array.from({ length: pageCount }).map((_, pageIndex) => {
          const size = renderedSizes[pageIndex];
          const pageRegions = regions.filter((r) => r.pageIndex === pageIndex);
          return (
            <div
              key={pageIndex}
              style={{ position: 'relative', width: size?.w, height: size?.h, boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }}
            >
              <canvas ref={(el) => { canvasRefs.current[pageIndex] = el; }} style={{ display: 'block' }} />
              {size &&
                pageRegions.map((r) => {
                  const style = overlayStyle(r);
                  return style ? <div key={r.id} data-region-tier={r.tier} style={style} /> : null;
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
