'use client';

import { useEffect, useRef } from 'react';
import { useCoachStore } from '@/store/useCoachStore';

export function BackgroundMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isFocusMode } = useCoachStore();

  useEffect(() => {
    // 음악 설정 확인
    const continuousMusicEnabled = localStorage.getItem('continuousMusicEnabled');
    if (continuousMusicEnabled !== 'true') {
      return;
    }

    // 오디오 인스턴스 생성
    const audio = new Audio('/sounds/TaskFlow_Theme.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // First interaction audio unlock
    const attemptPlay = async () => {
      try {
        await audio.play();
        // Remove all listeners after successful play
        document.removeEventListener('touchstart', attemptPlay);
        document.removeEventListener('click', attemptPlay);
        document.removeEventListener('keydown', attemptPlay);
        console.log('BGM started');
      } catch (error) {
        console.log('Waiting for user interaction to play BGM');
      }
    };

    // Try playing immediately (works on desktop/Android)
    attemptPlay();

    // Listen for first user interaction (iOS requirement)
    document.addEventListener('touchstart', attemptPlay, { capture: true, once: true });
    document.addEventListener('click', attemptPlay, { capture: true, once: true });
    document.addEventListener('keydown', attemptPlay, { capture: true, once: true });

    // Toggle event listener
    const handleToggle = (event: CustomEvent) => {
      if (event.detail.enabled) {
        audio.play().catch(console.error);
        // Re-attach listeners if toggled back on
        document.addEventListener('touchstart', attemptPlay, { capture: true, once: true });
        document.addEventListener('click', attemptPlay, { capture: true, once: true });
        document.addEventListener('keydown', attemptPlay, { capture: true, once: true });
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    };

    window.addEventListener('continuousMusicToggle', handleToggle as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('continuousMusicToggle', handleToggle as EventListener);
      document.removeEventListener('touchstart', attemptPlay);
      document.removeEventListener('click', attemptPlay);
      document.removeEventListener('keydown', attemptPlay);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // 포커스 모드 시 일시정지 로직
  useEffect(() => {
    if (!audioRef.current) return;

    if (isFocusMode) {
      audioRef.current.pause();
    } else {
      const continuousMusicEnabled = localStorage.getItem('continuousMusicEnabled');
      if (continuousMusicEnabled === 'true') {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [isFocusMode]);

  return null;
}
