'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';

interface LevelUpModalProps {
  isOpen: boolean;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ isOpen, newLevel, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Epic confetti celebration
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#c084fc', '#e879f9', '#fbbf24'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#c084fc', '#e879f9', '#fbbf24'],
        });
      }, 250);

      // Auto-close after 4 seconds
      const timeout = setTimeout(() => {
        onClose();
      }, 4000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              rotateY: { duration: 0.6 }
            }}
            className="relative max-w-md w-full p-8 rounded-3xl"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(192, 132, 252, 0.3) 0%, rgba(0, 0, 0, 0.95) 70%)',
              border: '2px solid rgba(192, 132, 252, 0.5)',
              boxShadow: '0 0 60px rgba(192, 132, 252, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="text-center">
              {/* Animated stars */}
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="text-6xl mb-4"
              >
                ⭐
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #c084fc 0%, #e879f9 50%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(192, 132, 252, 0.5)',
                }}
              >
                LEVEL UP!
              </motion.h2>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="text-7xl font-bold mb-4"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))',
                }}
              >
                {newLevel}
              </motion.div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-blue-200 mb-6"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                You are getting stronger!
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 text-purple-300 text-sm"
              >
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span>Keep up the amazing work!</span>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
