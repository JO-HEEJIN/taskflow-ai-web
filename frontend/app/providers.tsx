'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { FloatingTimerWidget } from '@/components/focus/FloatingTimerWidget';
import { useTimerSync } from '@/hooks/useTimerSync';
import { useTimerWebSocket } from '@/hooks/useTimerWebSocket';
import { initSounds } from '@/lib/sounds';
import { useEffect } from 'react';

function TimerSyncProvider({ children }: { children: React.ReactNode }) {
  // Initialize timer sync (Phase 1 - BroadcastChannel)
  useTimerSync();

  // Initialize WebSocket timer sync (Phase 3 - Cross-device)
  useTimerWebSocket();

  // Initialize sound preloading (Phase 5 - Completion Actions)
  useEffect(() => {
    initSounds().catch((error) => {
      console.warn('Sound preloading failed (will use fallback):', error);
    });
  }, []);

  return (
    <>
      <FloatingTimerWidget />
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <TimerSyncProvider>{children}</TimerSyncProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
