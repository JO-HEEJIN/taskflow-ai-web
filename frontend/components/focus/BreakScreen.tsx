'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Zap, ArrowRight } from 'lucide-react';

interface BreakScreenProps {
  isOpen: boolean;
  onTakeBreak: () => void;
  onContinue: () => void;
  xpEarned?: number;
}

/**
 * Full-screen break screen shown when timer completes
 * Features: Confetti, XP display, break options
 */
export function BreakScreen({
  isOpen,
  onTakeBreak,
  onContinue,
  xpEarned = 50,
}: BreakScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti when screen opens
  useEffect(() => {
    if (isOpen && !showConfetti) {
      setShowConfetti(true);
      triggerConfetti();
    }

    if (!isOpen) {
      setShowConfetti(false);
    }
  }, [isOpen, showConfetti]);

  /**
   * Trigger confetti animation
   */
  const triggerConfetti = () => {
    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#c084fc', '#e879f9', '#fbbf24', '#60a5fa'],
    });

    // Secondary burst after delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#c084fc', '#e879f9', '#fbbf24', '#60a5fa'],
      });
    }, 250);

    // Side cannons
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#c084fc', '#e879f9'],
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#fbbf24', '#60a5fa'],
      });
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(30, 15, 50, 0.98) 0%, rgba(10, 5, 20, 0.98) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative max-w-2xl w-full mx-4"
          >
            {/* Success message */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-block mb-4"
              >
                <div className="text-8xl">🎉</div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-6xl font-bold text-white mb-4"
                style={{ textShadow: '0 4px 20px rgba(192, 132, 252, 0.5)' }}
              >
                Timer Complete!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-purple-200"
              >
                Great work! You stayed focused.
              </motion.p>
            </div>

            {/* XP Earned */}
            {xpEarned > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-3 mb-8"
              >
                <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <span className="text-2xl font-bold text-white">
                    +{xpEarned} XP
                  </span>
                </div>
              </motion.div>
            )}

            {/* Continue button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center"
            >
              <button
                onClick={onContinue}
                className="group relative flex items-center justify-center gap-3 px-10 py-5 text-xl font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #c084fc 0%, #e879f9 100%)',
                  boxShadow: '0 0 30px rgba(192, 132, 252, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.1)',
                }}
              >
                <span className="text-white">Continue</span>
                <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />

                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    style={{ transform: 'translateX(-100%)', animation: 'shine 1.5s infinite' }}
                  />
                </div>
              </button>
            </motion.div>
          </motion.div>

          {/* Background stars */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
