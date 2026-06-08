'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Book { id: string; title: string; pageCount: number }

function ownerRef(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userId') || localStorage.getItem('guest_id') || '';
}

export function StudyHome() {
  const [books, setBooks] = useState<Book[]>([]);
  const [entitled, setEntitled] = useState(false);
  const [premium, setPremium] = useState(false);
  const [config, setConfig] = useState<{ storeSlug: string; variantBooks: string; variantPremium: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [restoreEmail, setRestoreEmail] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const headers = useCallback(() => ({ 'x-user-id': ownerRef() }), []);

  const refresh = useCallback(async () => {
    const [b, e] = await Promise.all([
      fetch(`${API}/api/study/books`, { headers: headers() }).then((r) => r.json()).catch(() => ({ books: [] })),
      fetch(`${API}/api/study/entitlements`, { headers: headers() }).then((r) => r.json()).catch(() => ({ books: false, premium: false })),
    ]);
    setBooks(b.books || []);
    setEntitled(!!e.books);
    setPremium(!!e.premium);
  }, [headers]);

  useEffect(() => {
    if (!document.getElementById('lemon-js')) {
      const s = document.createElement('script');
      s.id = 'lemon-js';
      s.src = 'https://app.lemonsqueezy.com/js/lemon.js';
      s.defer = true;
      s.onload = () => (window as any).createLemonSqueezy?.();
      document.body.appendChild(s);
    }
    fetch(`${API}/api/study/checkout-config`).then((r) => r.json()).then(setConfig).catch(() => {});
    refresh();
  }, [refresh]);

  const openCheckout = (variant: string) => {
    if (!config?.storeSlug || !variant) {
      setMessage('This is coming soon.');
      return;
    }
    const url =
      `https://${config.storeSlug}.lemonsqueezy.com/buy/${variant}` +
      `?embed=1&media=0&logo=0&checkout[custom][owner_ref]=${encodeURIComponent(ownerRef())}`;
    const ls = (window as any).LemonSqueezy;
    if (ls?.Url?.Open) {
      ls.Setup?.({
        eventHandler: (e: any) => {
          if (e?.event === 'Checkout.Success') {
            setMessage('Purchase complete. Unlocking...');
            setTimeout(refresh, 2500);
          }
        },
      });
      ls.Url.Open(url);
    } else {
      window.open(url.replace('embed=1', 'embed=0'), '_blank');
    }
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch(`${API}/api/study/books`, { method: 'POST', headers: headers(), body: fd });
      if (res.status === 402) {
        setMessage('The first book is free. Unlock more books to add this one.');
        openCheckout(config?.variantBooks || '');
        return;
      }
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setMessage('Book processed.');
      await refresh();
    } catch (e: any) {
      setMessage(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const restore = async () => {
    if (!restoreEmail.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/api/study/entitlements/restore`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: restoreEmail.trim() }),
      });
      const data = await res.json();
      setMessage(data.restored ? 'Purchase restored. Books unlocked.' : 'No purchase found for that email.');
      if (data.restored) await refresh();
    } catch {
      setMessage('Could not restore right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-8 text-white max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>Study</h1>
      <p className="text-sm text-blue-200/70 mb-6">
        Upload a textbook PDF to study it with active recall. The first book is free.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-medium">Add a book</div>
            <div className="text-xs text-blue-200/60">
              {entitled ? 'Books unlocked' : books.length === 0 ? 'Your first book is free' : 'Unlock more books to add another'}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            data-upload
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="text-sm text-blue-100 file:mr-3 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-purple-500/50 file:to-pink-500/40 file:px-4 file:py-2 file:text-white file:cursor-pointer"
          />
        </div>
        {!entitled && books.length >= 1 && (
          <button
            data-action="unlock"
            onClick={() => openCheckout(config?.variantBooks || '')}
            className="mt-4 px-5 py-2.5 rounded-full text-sm font-semibold text-white border border-purple-400/50 bg-gradient-to-r from-purple-500/50 to-pink-500/40 transition-all hover:scale-105 active:scale-95"
          >
            Unlock more books
          </button>
        )}
        {message && <p className="mt-3 text-sm text-blue-100/90">{message}</p>}
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-medium text-amber-200">Past-exam mapping</div>
            <div className="text-xs text-amber-100/60">
              Premium. Rank importance by real past-exam frequency, not just structure.
            </div>
          </div>
          {premium ? (
            <span className="text-xs text-emerald-300">Unlocked — coming soon</span>
          ) : (
            <button
              data-action="premium"
              onClick={() => openCheckout(config?.variantPremium || '')}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-white border border-amber-400/50 bg-gradient-to-r from-amber-500/40 to-orange-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Unlock premium
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-blue-200/70 mb-2">Your books</div>
        {books.length === 0 ? (
          <p className="text-sm text-blue-100/50">No books yet.</p>
        ) : (
          <div className="grid gap-2">
            {books.map((b) => (
              <Link
                key={b.id}
                href={`/study/${b.id}`}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 transition-colors flex items-center justify-between"
              >
                <span className="truncate">{b.title}</span>
                <span className="text-xs text-blue-200/50">{b.pageCount} pages</span>
              </Link>
            ))}
          </div>
        )}
        {books.length > 0 && (
          <Link href="/study/review" className="inline-block mt-3 text-sm text-purple-300 hover:text-purple-200">
            Start a review session
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-blue-200/70">
        <div className="font-medium text-blue-100 mb-1">Already purchased?</div>
        <p className="mb-3 text-xs">
          Entitlements are stored on this device. Restore a purchase on a new device with your order email.
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            value={restoreEmail}
            onChange={(e) => setRestoreEmail(e.target.value)}
            placeholder="order email"
            className="flex-1 min-w-[200px] rounded-full bg-black/30 border border-white/10 px-4 py-2 text-white text-sm outline-none focus:border-purple-400/50"
          />
          <button
            onClick={restore}
            disabled={busy}
            className="px-4 py-2 rounded-full text-sm border border-white/15 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
