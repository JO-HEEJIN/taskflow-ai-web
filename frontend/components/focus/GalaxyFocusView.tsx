'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Task, Subtask } from '@/types';
import { OrbitTimer } from './OrbitTimer';
import { useCoachStore } from '@/store/useCoachStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, ChevronRight, SkipForward } from 'lucide-react';

interface GalaxyFocusViewProps {
  task: Task;
  currentSubtask: Subtask;
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function GalaxyFocusView({
  task,
  currentSubtask,
  onComplete,
  onSkip,
  onClose,
}: GalaxyFocusViewProps) {
  const { isTimerRunning, startTimer, pauseTimer, currentTimeLeft } = useCoachStore();
  const { addXp } = useGamificationStore();

  const estimatedMinutes = currentSubtask.estimatedMinutes || 5;

  // Initialize timer when subtask changes
  useEffect(() => {
    if (currentTimeLeft === 0) {
      startTimer(estimatedMinutes);
    }
  }, [currentSubtask.id]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      if (currentTimeLeft === 0) {
        startTimer(estimatedMinutes);
      } else {
        useCoachStore.setState({ isTimerRunning: true });
      }
    }
  };

  const handleComplete = async () => {
    // Supernova confetti effect!
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#c084fc', '#e879f9', '#fbbf24'],
      ticks: 200,
    });

    // Add XP reward
    addXp(50);

    // Brief delay for visual feedback
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleTimerComplete = () => {
    // Auto-complete when timer runs out (optional behavior)
    console.log('⏰ Timer completed!');
  };

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Calculate progress
  const completedSubtasks = task.subtasks.filter(st => st.isCompleted).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercentage = (completedSubtasks / totalSubtasks) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-4"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(30, 15, 50, 1) 0%, rgba(10, 5, 20, 1) 100%)',
      }}
    >
      {/* Starry background overlay */}
      <div className="absolute inset-0 opacity-50 mix-blend-screen pointer-events-none">
        {/* Simple twinkling stars */}
        {[...Array(100)].map((_, i) => (
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

      {/* Close button (top-right) */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 text-white/70 hover:text-white transition-colors group z-10"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all">
          <X className="w-5 h-5" />
          <span className="text-sm font-medium hidden md:inline">Abort Mission (ESC)</span>
        </div>
      </motion.button>

      {/* Progress indicator (top-center) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10"
      >
        <div className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-purple-500/30">
          <span className="text-white text-sm font-medium" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {completedSubtasks}/{totalSubtasks} completed • {Math.round(progressPercentage)}%
          </span>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full">
        {/* Mission title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl md:text-2xl font-light text-blue-200 mb-4 text-center tracking-wide"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
        >
          Mission: <span className="font-bold text-white">{currentSubtask.title}</span>
        </motion.h2>

        {/* Subtask type badge */}
        {currentSubtask.stepType && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 px-4 py-1 rounded-full text-xs font-medium uppercase tracking-wider"
            style={{
              background: currentSubtask.stepType === 'physical'
                ? 'rgba(34, 197, 94, 0.2)'
                : currentSubtask.stepType === 'creative'
                ? 'rgba(251, 191, 36, 0.2)'
                : 'rgba(167, 139, 250, 0.2)',
              color: currentSubtask.stepType === 'physical'
                ? '#86efac'
                : currentSubtask.stepType === 'creative'
                ? '#fcd34d'
                : '#c4b5fd',
              border: `1px solid ${currentSubtask.stepType === 'physical'
                ? 'rgba(34, 197, 94, 0.3)'
                : currentSubtask.stepType === 'creative'
                ? 'rgba(251, 191, 36, 0.3)'
                : 'rgba(167, 139, 250, 0.3)'}`,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {currentSubtask.stepType} action
          </motion.div>
        )}

        {/* OrbitTimer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-8"
        >
          <OrbitTimer
            duration={estimatedMinutes}
            isPlaying={isTimerRunning}
            onComplete={handleTimerComplete}
            onToggle={handleToggleTimer}
          />
        </motion.div>

        {/* Mission Control panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-lg p-6 rounded-2xl mb-6"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            boxShadow: '0 0 30px rgba(167, 139, 250, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400 mt-2 animate-pulse" />
            <p className="text-blue-100 text-base md:text-lg leading-relaxed" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              <strong className="text-white">Mission Control:</strong> Focus on this one task.
              {isTimerRunning
                ? " You're doing great! Keep going."
                : " Click the timer to begin your mission."}
              {` Estimated time: ${estimatedMinutes} minutes.`}
            </p>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-lg"
        >
          {/* Complete button */}
          <button
            onClick={handleComplete}
            className="flex-1 py-4 px-6 text-lg font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.1)',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            <span>✅</span>
            <span className="text-white">I DID IT!</span>
          </button>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="sm:flex-none py-4 px-6 text-sm font-medium text-white/70 hover:text-white rounded-2xl transition-all hover:bg-white/10 border border-white/20 flex items-center justify-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            <span>Skip</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
