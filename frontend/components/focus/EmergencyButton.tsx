'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { useGamificationStore } from '@/store/useGamificationStore';
import confetti from 'canvas-confetti';

const EMERGENCY_QUESTS = [
  { title: "Stretch your arms", duration: 1, icon: "🙆" },
  { title: "Drink a glass of water", duration: 2, icon: "💧" },
  { title: "Take 3 deep breaths", duration: 1, icon: "🌬️" },
  { title: "Jump 10 times in place", duration: 1, icon: "🦘" },
  { title: "Close eyes and meditate for 10 seconds", duration: 1, icon: "🧘" },
];

export function EmergencyButton() {
  const [showModal, setShowModal] = useState(false);
  const [currentQuest, setCurrentQuest] = useState(EMERGENCY_QUESTS[0]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);
  const { addXp } = useGamificationStore();

  // Pulse animation after 2 minutes of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldPulse(true);
    }, 120000); // 2 minutes

    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    // Pick random quest
    const randomQuest = EMERGENCY_QUESTS[Math.floor(Math.random() * EMERGENCY_QUESTS.length)];
    setCurrentQuest(randomQuest);
    setIsCompleted(false);
    setShowModal(true);
    setShouldPulse(false);
  };

  const handleComplete = () => {
    // Micro confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#ef4444', '#f472b6', '#fbbf24'],
    });

    // Add XP
    addXp(10);

    setIsCompleted(true);

    // Auto-close after showing success
    setTimeout(() => {
      setShowModal(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          ...(shouldPulse && {
            scale: [1, 1.1, 1],
            boxShadow: [
              '0 0 20px rgba(239, 68, 68, 0.5)',
              '0 0 40px rgba(239, 68, 68, 0.8)',
              '0 0 20px rgba(239, 68, 68, 0.5)',
            ],
          }),
        }}
        transition={{
          scale: shouldPulse ? { duration: 1.5, repeat: Infinity } : { duration: 0.5, delay: 0.8 },
          opacity: { duration: 0.5, delay: 0.8 },
        }}
        onClick={handleClick}
        className="fixed bottom-24 left-4 md:bottom-8 md:left-8 z-[9998] w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.6)',
        }}
      >
        <AlertCircle className="w-8 h-8 text-white" />
      </motion.button>

      {/* Quest Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => !isCompleted && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative max-w-md w-full p-8 rounded-3xl"
              style={{
                background: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                boxShadow: '0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.05)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              {!isCompleted && (
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {isCompleted ? (
                // Success state
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Amazing!</h3>
                  <p className="text-blue-200 text-lg">You earned +10 XP!</p>
                </motion.div>
              ) : (
                // Quest display
                <>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">{currentQuest.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                      Emergency Quest
                    </h3>
                    <p className="text-red-300 text-sm uppercase tracking-wider">Take a quick break</p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                    <h4 className="text-xl font-semibold text-white mb-2 text-center">
                      {currentQuest.title}
                    </h4>
                    <p className="text-blue-200 text-center text-sm">
                      Takes about {currentQuest.duration} min
                    </p>
                  </div>

                  <button
                    onClick={handleComplete}
                    className="w-full py-4 px-6 text-lg font-bold text-white rounded-2xl transition-all transform hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    ✅ Completed!
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
