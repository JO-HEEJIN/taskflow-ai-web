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
      className="min-h-screen flex items-center justify-center cursor-pointer"
      style={{
        background: 'linear-gradient(180deg, #0a0118 0%, #1a0a2e 50%, #0f0620 100%)',
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={unlockAudio}
    >
      {/* Subtle stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.4,
              animation: `twinkle ${2 + Math.random() * 3}s infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-6 relative z-10">
        {/* Animated tick network icon with glow */}
        <motion.div
          className="w-28 h-28 md:w-32 md:h-32 relative"
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <img
            src="/icons/tick_network_icon.png"
            alt="TaskFlow"
            className="w-full h-full object-contain"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(139, 92, 246, 0.8)) drop-shadow(0 0 60px rgba(167, 139, 250, 0.5))',
            }}
          />
        </motion.div>

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

      </div>
    </motion.div>
  );
}
