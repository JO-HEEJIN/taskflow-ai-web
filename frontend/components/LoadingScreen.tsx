'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function LoadingScreen() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioAttemptedRef = useRef(false);

  // Unlock audio and play music
  const unlockAudio = async () => {
    if (audioAttemptedRef.current || audioUnlocked) return;
    audioAttemptedRef.current = true;

    // Check if music is enabled in settings
    const musicEnabled = localStorage.getItem('musicEnabled');
    if (musicEnabled === 'false') {
      console.log('Background music disabled by user settings');
      return;
    }

    setAudioUnlocked(true);

    // Create and play background music
    const audio = new Audio('/sounds/TaskFlow_Theme.mp3');
    audio.loop = true;
    audio.volume = 0.6;
    audioRef.current = audio;

    // Start playing
    try {
      await audio.play();
      console.log('Audio unlocked and playing');
    } catch (error) {
      console.log('Audio play failed (browser policy):', error);
    }
  };

  useEffect(() => {
    // Cleanup on unmount - fade out and stop
    return () => {
      if (audioRef.current) {
        fadeOutAndStop(audioRef.current);
      }
    };
  }, []);

  const fadeOutAndStop = (audio: HTMLAudioElement) => {
    setIsFadingOut(true);

    // Stop loop immediately
    audio.loop = false;

    const fadeOutDuration = 1000; // 1 second fade out
    const fadeOutSteps = 20;
    const stepDuration = fadeOutDuration / fadeOutSteps;
    const volumeDecrement = audio.volume / fadeOutSteps;

    const fadeInterval = setInterval(() => {
      if (audio.volume > volumeDecrement) {
        audio.volume = Math.max(0, audio.volume - volumeDecrement);
      } else {
        audio.volume = 0;
        audio.pause();
        audio.currentTime = 0; // Reset to beginning
        audio.src = ''; // Clear source to free memory
        clearInterval(fadeInterval);
      }
    }, stepDuration);
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black cursor-pointer"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={unlockAudio}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo or icon */}
        <motion.div
          className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: '0 0 40px rgba(192, 132, 252, 0.6)',
          }}
        />

        {/* Loading text */}
        <motion.div
          className="text-white text-xl font-medium"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            textShadow: '0 0 20px rgba(192, 132, 252, 0.8)',
          }}
        >
          Loading TaskFlow...
        </motion.div>

        {/* Music indicator - shows when audio is playing */}
        {!isFadingOut && audioUnlocked && (
          <motion.div
            className="flex items-center gap-2 text-purple-300 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="w-1 h-3 bg-purple-400 rounded-full"
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-1 h-3 bg-purple-400 rounded-full"
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div
              className="w-1 h-3 bg-purple-400 rounded-full"
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
            />
          </motion.div>
        )}

        {/* Hint to click - shows when audio not yet unlocked */}
        {!audioUnlocked && (
          <motion.p
            className="text-purple-300/60 text-sm mt-4"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Click anywhere to start
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
