'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// pdfjs-dist is imported dynamically inside the effect (client only): importing it
// at module scope runs its top-level code during SSR, where Node 20 lacks
// Promise.withResolvers and crashes the render.

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Mode = 'all' | 'hide' | 'anchors' | 'reveal';

const REVEAL_MAX_STAGE = 3;
function isRevealed(type: string, tier: number, stage: number): boolean {
  if (stage >= REVEAL_MAX_STAGE) return true;
  if (tier === 1) return true;
  if (tier === 2) return stage >= 1;
  if (type === 'figure' || type === 'table') return false;
  return stage >= 2;
}

interface FractionBox { x: number; y: number; width: number; height: number; }
interface Region { id: string; pageIndex: number; type: string; bbox: FractionBox; tier?: 1 | 2 | 3; }

const TIER_RGB: Record<number, string> = { 1: '239,68,68', 2: '245,158,11', 3: '96,165,250' };

function ownerRef(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userId') || localStorage.getItem('guest_id') || '';
}

export function StudyViewer({ bookId }: { bookId: string }) {
  const [title, setTitle] = useState<string>('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [renderedSizes, setRenderedSizes] = useState<Record<number, { w: number; h: number }>>({});
  const [mode, setMode] = useState<Mode>('all');
  const [revealStage, setRevealStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = { 'x-user-id': ownerRef() };
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
          disableRange: true,
          disableStream: true,
        }).promise;
        if (!cancelled) setNumPages(doc.numPages);

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const baseVp = page.getViewport({ scale: 1 });
          const scale = Math.min(900 / baseVp.width, 2);
          const viewport = page.getViewport({ scale });
          const canvas = canvasRefs.current[i - 1];
          if (!canvas) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          setRenderedSizes((prev) => ({ ...prev, [i - 1]: { w: viewport.width, h: viewport.height } }));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load study viewer');
      }
    })();
    return () => { cancelled = true; };
  }, [bookId]);

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
        borderRadius: 3,
        pointerEvents: 'none',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      };
      if (mode === 'all') return { ...base, background: `rgba(${rgb},0.26)`, border: `1px solid rgba(${rgb},0.7)` };
      if (mode === 'hide') return { ...base, background: `rgb(${rgb})` };
      if (mode === 'reveal') {
        if (isRevealed(r.type, tier, revealStage)) {
          return tier === 1 ? { ...base, border: `1px solid rgba(${rgb},0.6)` } : null;
        }
        return { ...base, background: 'rgba(12,8,32,0.96)', border: '1px solid rgba(167,139,250,0.25)' };
      }
      if (tier === 1) return { ...base, border: `1px solid rgba(${rgb},0.8)` };
      return { ...base, background: 'rgba(12,8,32,0.96)' };
    },
    [mode, revealStage]
  );

  const modeButton = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      data-mode={m}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all transform active:scale-95 ${
        mode === m
          ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/30 border-purple-400/60 text-white shadow-[0_0_18px_rgba(167,139,250,0.35)]'
          : 'bg-white/5 border-white/10 text-blue-100 hover:bg-white/10 hover:border-purple-400/40'
      }`}
    >
      {label}
    </button>
  );

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 text-white">
      <h1 className="text-xl md:text-2xl font-semibold mb-1" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
        {title || 'Study'}
      </h1>
      <p className="text-sm text-blue-200/70 mb-5">Tier 1 anchors, tier 2 supporting, tier 3 full content.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {modeButton('all', 'Show all')}
        {modeButton('hide', 'Hide overlay regions')}
        {modeButton('anchors', 'Show only anchors')}
        {modeButton('reveal', 'Progressive reveal')}
      </div>

      {mode === 'reveal' && (
        <div className="flex items-center gap-3 mb-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 w-fit">
          <button
            data-reveal="prev"
            onClick={() => setRevealStage((s) => Math.max(0, s - 1))}
            disabled={revealStage === 0}
            className="px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 text-blue-100 transition-all active:scale-95 disabled:opacity-40 hover:bg-white/10"
          >
            Back
          </button>
          <span data-reveal-stage={revealStage} className="text-sm text-blue-100 min-w-[88px] text-center">
            Stage {revealStage} / {REVEAL_MAX_STAGE}
          </span>
          <button
            data-reveal="next"
            onClick={() => setRevealStage((s) => Math.min(REVEAL_MAX_STAGE, s + 1))}
            disabled={revealStage === REVEAL_MAX_STAGE}
            className="px-4 py-2 rounded-full text-sm font-medium border border-purple-400/50 bg-gradient-to-r from-purple-500/40 to-pink-500/30 text-white transition-all active:scale-95 disabled:opacity-40 hover:scale-105"
          >
            Reveal next
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-6">
        {Array.from({ length: Math.max(pageCount, numPages) }).map((_, pageIndex) => {
          const size = renderedSizes[pageIndex];
          const pageRegions = regions.filter((r) => r.pageIndex === pageIndex);
          return (
            <div
              key={pageIndex}
              className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(167,139,250,0.15)]"
              style={{ width: size?.w, height: size?.h }}
            >
              <canvas ref={(el) => { canvasRefs.current[pageIndex] = el; }} className="block" />
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
