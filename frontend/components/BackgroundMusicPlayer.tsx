'use client';

import { useEffect, useRef } from 'react';
import { useCoachStore } from '@/store/useCoachStore';

export function BackgroundMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isFocusMode } = useCoachStore();

  useEffect(() => {
    // Check if continuous music is enabled
    const continuousMusicEnabled = localStorage.getItem('continuousMusicEnabled');
    if (continuousMusicEnabled !== 'true') {
      return;
    }

    // Create audio instance
    const audio = new Audio('/sounds/TaskFlow_Theme.mp3');
    audio.loop = true;
    audio.volume = 0.3; // Lower volume for ambient music
    audioRef.current = audio;

    // Start playing
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log('Background music autoplay prevented:', error);
      });
    }

    // Listen for toggle events
    const handleToggle = (event: CustomEvent) => {
      if (event.detail.enabled) {
        audio.play().catch(console.error);
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    };

    window.addEventListener('continuousMusicToggle', handleToggle as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('continuousMusicToggle', handleToggle as EventListener);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Pause music during Focus Mode
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

  return null; // This component doesn't render anything
}
