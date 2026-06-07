'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FractionBox { x: number; y: number; width: number; height: number; }
interface Region { id: string; pageIndex: number; type: string; bbox: FractionBox; content: string; tier?: number; }
interface ReviewItem { id: string; bookId: string; kind: string; }
interface DueEntry { item: ReviewItem; region: Region | null; retention?: number; daysUntilHalf?: number }
interface Streak { currentStreak: number; longestStreak: number; freezesAvailable: number; weeklyGoal: number; weekReviewCount: number }

// Blue (safe) to red (urgent), interpolated by retention. Mirrors the PiP timer treatment.
function retentionColor(r: number): string {
  const clamped = Math.max(0, Math.min(1, r));
  const red = Math.round(239 + (96 - 239) * clamped); // 0 -> 239, 1 -> 96
  const green = Math.round(68 + (165 - 68) * clamped);
  const blue = Math.round(68 + (250 - 68) * clamped);
  return `rgb(${red},${green},${blue})`;
}

// Honest, decay-based message. No fake countdown.
function retentionMessage(r: number, days: number): string {
  const pct = Math.round(r * 100);
  if (days <= 1) return `Memory about ${pct}%. This slips below 50% within a day. Lock it in now.`;
  return `Memory about ${pct}%. Slips below 50% in about ${Math.round(days)} days.`;
}

const GRADES: { label: string; quality: number; tone: string }[] = [
  { label: 'Again', quality: 1, tone: 'from-red-500/40 to-red-400/20 border-red-400/50' },
  { label: 'Hard', quality: 3, tone: 'from-amber-500/40 to-amber-400/20 border-amber-400/50' },
  { label: 'Good', quality: 4, tone: 'from-purple-500/40 to-pink-500/30 border-purple-400/50' },
  { label: 'Easy', quality: 5, tone: 'from-emerald-500/40 to-emerald-400/20 border-emerald-400/50' },
];

function ownerRef(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userId') || localStorage.getItem('guest_id') || '';
}

export function ReviewSession() {
  const [queue, setQueue] = useState<DueEntry[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [renderedSize, setRenderedSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfjsRef = useRef<any>(null);
  const docCache = useRef<Map<string, any>>(new Map());

  const headers = useCallback(() => ({ 'x-user-id': ownerRef() }), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/study/review/due`, { headers: headers() });
        if (!res.ok) throw new Error(`Failed to load due items (${res.status})`);
        const data = await res.json();
        if (!cancelled) setQueue((data.due || []).filter((d: DueEntry) => d.region));
        const streakRes = await fetch(`${API}/api/study/review/streak`, { headers: headers() });
        if (streakRes.ok && !cancelled) setStreak((await streakRes.json()).streak);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [headers]);

  useEffect(() => {
    let cancelled = false;
    const entry = queue[idx];
    if (!entry || !entry.region) return;
    setRenderedSize(null);
    (async () => {
      try {
        if (!pdfjsRef.current) {
          pdfjsRef.current = await import('pdfjs-dist');
          pdfjsRef.current.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }
        const pdfjs = pdfjsRef.current;
        let doc = docCache.current.get(entry.item.bookId);
        if (!doc) {
          doc = await pdfjs.getDocument({
            url: `${API}/api/study/books/${entry.item.bookId}/pdf`,
            httpHeaders: headers(),
            disableRange: true,
            disableStream: true,
          }).promise;
          docCache.current.set(entry.item.bookId, doc);
        }
        const page = await doc.getPage(entry.region!.pageIndex + 1);
        const baseVp = page.getViewport({ scale: 1 });
        const scale = Math.min(820 / baseVp.width, 2);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setRenderedSize({ w: viewport.width, h: viewport.height });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to render page');
      }
    })();
    return () => { cancelled = true; };
  }, [queue, idx, headers]);

  const grade = async (quality: number) => {
    const entry = queue[idx];
    if (!entry) return;
    try {
      const res = await fetch(`${API}/api/study/review/${entry.item.id}/grade`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.streak) setStreak(data.streak);
      }
    } catch {
      // advance even if grading fails so the session is not stuck
    }
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  const shell = (children: React.ReactNode) => (
    <div className="max-w-2xl mx-auto mt-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-center text-white">
      {children}
    </div>
  );

  if (loading) return shell(<p className="text-blue-100">Loading your review...</p>);
  if (error) return shell(<p className="text-red-200">{error}</p>);
  if (queue.length === 0) return shell(<p className="text-blue-100">Nothing due right now. Nice work.</p>);
  if (idx >= queue.length) {
    return shell(
      <>
        <div className="text-3xl mb-2">All done</div>
        <p className="text-blue-200/80">You reviewed {queue.length} item{queue.length !== 1 ? 's' : ''}.</p>
      </>
    );
  }

  const entry = queue[idx];
  const region = entry.region!;

  return (
    <div className="px-4 py-6 text-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-widest text-purple-300">Just one at a time</span>
          <span className="text-sm text-blue-200/70">Item {idx + 1} of {queue.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${(idx / queue.length) * 100}%` }}
          />
        </div>

        {streak && (
          <div data-streak className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center mb-4 text-xs text-blue-200/80">
            <span>Streak: <span className="text-white font-semibold">{streak.currentStreak}</span> day{streak.currentStreak !== 1 ? 's' : ''}</span>
            <span>Freezes: <span className="text-white font-semibold">{streak.freezesAvailable}</span></span>
            <span>This week: <span className="text-white font-semibold">{streak.weekReviewCount}/{streak.weeklyGoal}</span></span>
          </div>
        )}

        {/* Honest, decay-based urgency. Real retention, not a fake countdown. */}
        {typeof entry.retention === 'number' && (
          <div
            data-retention
            className="mx-auto mb-4 w-fit rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ color: retentionColor(entry.retention), border: `1px solid ${retentionColor(entry.retention)}`, background: 'rgba(255,255,255,0.04)' }}
          >
            {retentionMessage(entry.retention, entry.daysUntilHalf ?? 0)}
          </div>
        )}

        <p className="text-sm text-blue-100/80 mb-4 text-center">
          {revealed ? 'How well did you recall it?' : 'Recall what is hidden, then reveal.'}
        </p>

        <div className="flex justify-center mb-6">
          <div
            className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(167,139,250,0.18)]"
            style={{ width: renderedSize?.w, height: renderedSize?.h }}
          >
            <canvas ref={canvasRef} className="block" />
            {renderedSize && (
              <div
                data-target
                data-revealed={revealed}
                className="absolute rounded transition-all duration-300"
                style={{
                  left: `${region.bbox.x * 100}%`,
                  top: `${region.bbox.y * 100}%`,
                  width: `${region.bbox.width * 100}%`,
                  height: `${region.bbox.height * 100}%`,
                  background: revealed ? 'transparent' : 'rgba(12,8,32,0.97)',
                  border: revealed ? '2px solid rgba(192,132,252,0.85)' : '1px solid rgba(192,132,252,0.5)',
                  boxShadow: revealed ? '0 0 16px rgba(192,132,252,0.4)' : 'none',
                }}
              />
            )}
          </div>
        </div>

        {!revealed ? (
          <div className="flex justify-center">
            <button
              data-action="reveal"
              onClick={() => setRevealed(true)}
              className="px-8 py-3 rounded-full text-base font-semibold text-white border border-purple-400/50 bg-gradient-to-r from-purple-500/50 to-pink-500/40 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_22px_rgba(167,139,250,0.4)]"
            >
              Reveal
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-center flex-wrap">
            {GRADES.map((g) => (
              <button
                key={g.quality}
                data-grade={g.quality}
                onClick={() => grade(g.quality)}
                className={`px-6 py-3 rounded-full text-base font-medium text-white border bg-gradient-to-r transition-all transform hover:scale-105 active:scale-95 ${g.tone}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
