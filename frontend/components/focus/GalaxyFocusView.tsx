'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Task, Subtask } from '@/types';
import { OrbitTimer } from './OrbitTimer';
import { CoachView } from './CoachView';
import { PiPTimer } from './PiPTimer';
import { BreakScreen } from './BreakScreen';
import { NetworkBackground } from './NetworkBackground';
import { useCoachStore } from '@/store/useCoachStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { useReliableTimer } from '@/hooks/useReliableTimer';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';
import { useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { X, ChevronRight, SkipForward, MessageCircle, Maximize } from 'lucide-react';
import { api } from '@/lib/api';
import { soundManager } from '@/lib/SoundManager';
import { showTimerCompletedNotification } from '@/lib/notifications';

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
  const { setIsPiPActive, showBreakScreen, setShowBreakScreen, isParentSubtaskView } = useCoachStore(); // ✅ Get isParentSubtaskView
  const { addXp } = useGamificationStore();
  const { isSupported: isPiPSupported, isPiPOpen, openPiP, updatePiP, closePiP } = usePictureInPicture();
  const [encouragementMessage, setEncouragementMessage] = useState<string>('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const estimatedMinutes = currentSubtask.estimatedMinutes || 5;

  // Callback for timer completion - defined before hook usage
  const handleTimerComplete = useCallback(() => {
    console.log('⏰ Timer completed!');

    // 1. Force window focus
    if (typeof window !== 'undefined') {
      try {
        window.focus();
        console.log('🎯 Window focused');
      } catch (error) {
        console.error('❌ Failed to focus window:', error);
      }
    }

    // 2. Show full-screen break screen
    setShowBreakScreen(true);
    console.log('🎉 Break screen shown');

    // 3. Show notification
    showTimerCompletedNotification();

    // NOTE: Sound and vibration are already handled by useReliableTimer hook
  }, [setShowBreakScreen]);

  // 신뢰할 수 있는 타이머 훅 사용 (타임스탬프 기반)
  const { timeLeft, isRunning, startTimer, pauseTimer, toggleTimer } = useReliableTimer({
    durationMinutes: estimatedMinutes,
    subtaskId: currentSubtask.id,
    taskId: task.id,
    onComplete: handleTimerComplete
  });

  // Handle timer toggle with PiP auto-open
  const handleToggleTimer = useCallback(() => {
    toggleTimer(); // Use the hook's toggle function

    // PiP Auto-Open when starting timer (Desktop only, valid user gesture)
    if (!isRunning && isPiPSupported && !isPiPOpen) {
      handleOpenPiP();
    }
  }, [toggleTimer, isRunning, isPiPSupported, isPiPOpen]);

  // Handle closing Picture-in-Picture (defined before use)
  const handleClosePiP = useCallback(() => {
    closePiP();
    setIsPiPActive(false);
  }, [closePiP]);

  // Handle opening Picture-in-Picture
  const handleOpenPiP = useCallback(async () => {
    if (!isPiPSupported) {
      console.warn('Picture-in-Picture is not supported in this browser');
      return;
    }

    await openPiP(
      <PiPTimer
        taskTitle={task.title}
        subtaskTitle={currentSubtask.title}
        currentTimeLeft={timeLeft}
        isTimerRunning={isRunning}
        initialDuration={estimatedMinutes * 60}
        onClose={handleClosePiP}
        onToggleTimer={handleToggleTimer}
      />,
      { width: 320, height: 175 }
    );

    setIsPiPActive(true);
  }, [isPiPSupported, openPiP, task.title, currentSubtask.title, timeLeft, isRunning, estimatedMinutes, handleClosePiP, handleToggleTimer]);

  // Update PiP when timer state changes
  useEffect(() => {
    if (!isPiPOpen) return;

    // Update PiP content with latest props
    updatePiP(
      <PiPTimer
        taskTitle={task.title}
        subtaskTitle={currentSubtask.title}
        currentTimeLeft={timeLeft}
        isTimerRunning={isRunning}
        initialDuration={estimatedMinutes * 60}
        onClose={handleClosePiP}
        onToggleTimer={handleToggleTimer}
      />
    );
  }, [timeLeft, isRunning, isPiPOpen, task.title, currentSubtask.title, estimatedMinutes, handleClosePiP, handleToggleTimer, updatePiP]);

  // Sync PiP state with store
  useEffect(() => {
    setIsPiPActive(isPiPOpen);
  }, [isPiPOpen, setIsPiPActive]);

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

    // Get AI encouragement
    try {
      // Calculate current subtask index
      const activeSubtaskIndex = task.subtasks.findIndex(st => st.id === currentSubtask.id);
      const completedSubtasks = activeSubtaskIndex + 1;
      const totalSubtasks = task.subtasks.length;
      const nextSubtaskIndex = activeSubtaskIndex + 1;
      const nextSubtask = nextSubtaskIndex < totalSubtasks ? task.subtasks[nextSubtaskIndex] : null;

      const result = await api.generateEncouragement(
        { title: currentSubtask.title, estimatedMinutes: currentSubtask.estimatedMinutes },
        nextSubtask ? { title: nextSubtask.title, estimatedMinutes: nextSubtask.estimatedMinutes } : null,
        { completed: completedSubtasks, total: totalSubtasks }
      );

      setEncouragementMessage(result.message);
      setShowEncouragement(true);

      // Auto-hide and proceed after 3 seconds
      setTimeout(() => {
        setShowEncouragement(false);
        setTimeout(() => {
          onComplete();
        }, 300);
      }, 3000);
    } catch (error) {
      console.error('Failed to get encouragement:', error);
      // Proceed anyway
      setTimeout(() => {
        onComplete();
      }, 600);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Break screen handlers
  const handleTakeBreak = () => {
    console.log('☕ Taking a 5-minute break');
    setShowBreakScreen(false);
    // Timer management is handled by the useReliableTimer hook
    // For now, just close the break screen
    // TODO: Implement break timer if needed
  };

  const handleContinueWorking = () => {
    console.log('💪 Continuing work');
    setShowBreakScreen(false);
    // Just close the break screen, don't start a new timer
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
      className="fixed inset-0 z-[9999] overflow-y-auto flex flex-col items-center justify-start px-4 py-12 md:py-20 bg-[#2E1044] relative"
    >
      {/* Aurora Gradient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Blue aurora blob */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            top: '10%',
            left: '20%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Purple aurora blob */}
        <div
          className="absolute w-[900px] h-[900px] rounded-full opacity-25"
          style={{
            top: '40%',
            right: '10%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.7) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
        {/* Indigo aurora blob */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-15"
          style={{
            bottom: '15%',
            left: '30%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
      </div>

      {/* Network Background - Canvas-based golden network pattern */}
      <NetworkBackground />

      {/* Close button (top-right) */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={onClose}
        onTouchEnd={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="absolute top-4 right-4 md:top-8 md:right-8 text-white/70 hover:text-white transition-colors group z-[100]"
      >
        <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all">
          <X className="w-6 h-6" />
          <span className="text-sm font-medium hidden md:inline">Abort Mission (ESC)</span>
        </div>
      </motion.button>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full">
        {/* Mission title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 text-center px-4"
        >
          <p className="text-sm md:text-base font-light text-blue-200 mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            Mission:
          </p>
          <h2 className="text-base md:text-lg font-bold text-white leading-snug" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            {currentSubtask.title}
          </h2>
        </motion.div>

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

        {/* AI Coaching Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <motion.button
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="px-6 py-3 rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
            style={{
              background: isChatOpen
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
            }}
          >
            {isChatOpen ? (
              <>
                <X className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-medium">Close AI Coach</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-medium">AI Coaching</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Parent Confirmation View or Regular Timer */}
        {isParentSubtaskView ? (
          /* Parent Confirmation Screen - After completing all atomic children */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center mb-8 w-full max-w-md"
          >
            {/* Celebration Icon */}
            <div className="text-8xl mb-6 animate-bounce">🎉</div>

            {/* Parent Subtask Title */}
            <h2 className="text-3xl font-bold text-white mb-3 text-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
              {currentSubtask.title}
            </h2>
            <p className="text-lg text-blue-200 mb-8 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
              All steps completed! 🌟
            </p>

            {/* Timer at 0:00 (no countdown) */}
            <div className="text-7xl font-mono font-bold text-white mb-12" style={{ textShadow: '0 4px 16px rgba(0,0,0,0.9)' }}>
              0:00
            </div>

            {/* "You did well!" Button */}
            <motion.button
              onClick={onComplete}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-2xl shadow-2xl hover:shadow-green-500/50 transition-all"
            >
              You did well! Continue →
            </motion.button>
          </motion.div>
        ) : (
          /* Regular Timer View */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-8"
          >
            <OrbitTimer
              duration={estimatedMinutes}
              timeLeft={timeLeft}
              isPlaying={isRunning}
              onComplete={handleTimerComplete}
              onToggle={handleToggleTimer}
            />
          </motion.div>
        )}

        {/* Pop Out to Window button - Only show if PiP is supported and not already open */}
        {isPiPSupported && !isPiPOpen && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={handleOpenPiP}
            className="mb-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 hover:text-white rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
            title="Open timer in always-on-top window"
          >
            <Maximize className="w-4 h-4" />
            <span>Pop Out Timer</span>
          </motion.button>
        )}

        {/* Mission Control panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md px-4 mb-6"
        >
          <div
            className="p-4 md:p-6 rounded-2xl"
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              boxShadow: '0 0 30px rgba(167, 139, 250, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400 mt-1.5 animate-pulse" />
              <div className="flex-1">
                <p className="text-blue-100 text-sm md:text-base leading-relaxed" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  <strong className="text-white">Mission Control:</strong>{' '}
                  {isParentSubtaskView ? (
                    <>
                      🎉 All atomic tasks completed! Ready to move to the next subtask?
                      <br />
                      <span className="text-xs text-purple-300 mt-1">Click "Next Subtask" to continue your journey.</span>
                    </>
                  ) : currentSubtask.title.startsWith('Atomic: ') ? (
                    <>
                      ⚛️ Atomic task - Focus on this one small step.
                      {isRunning
                        ? " You're crushing it! Keep that momentum."
                        : " Click the timer to begin this micro-mission."}
                      {` Estimated time: ${estimatedMinutes} minutes.`}
                    </>
                  ) : (
                    <>
                      Focus on this one task.
                      {isRunning
                        ? " You're doing great! Keep going."
                        : " Click the timer to begin your mission."}
                      {` Estimated time: ${estimatedMinutes} minutes.`}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md px-4"
        >
          {/* Complete button - Changes based on isParentSubtaskView */}
          <button
            onClick={handleComplete}
            className="flex-1 py-3 md:py-4 px-6 text-base md:text-lg font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: isParentSubtaskView
                ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'  // Purple for parent confirmation
                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', // Green for atomic tasks
              boxShadow: isParentSubtaskView
                ? '0 0 30px rgba(139, 92, 246, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.1)'
                : '0 0 30px rgba(34, 197, 94, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.1)',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            <span>{isParentSubtaskView ? '➡️' : '✅'}</span>
            <span className="text-white">
              {isParentSubtaskView ? 'Next Subtask' : 'I DID IT!'}
            </span>
          </button>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="sm:flex-none py-3 md:py-4 px-6 text-sm font-medium text-white/70 hover:text-white rounded-2xl transition-all hover:bg-white/10 border border-white/20 flex items-center justify-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            <span>Skip</span>
          </button>
        </motion.div>
      </div>

      {/* AI Encouragement Overlay - Centered Popup */}
      <AnimatePresence>
        {showEncouragement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-0 flex items-center justify-center z-[10000] px-4"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              className="p-8 md:p-10 rounded-3xl text-center max-w-md md:max-w-lg w-full"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.98) 0%, rgba(16, 185, 129, 0.98) 100%)',
                border: '3px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 0 60px rgba(34, 197, 94, 0.8), inset 0 0 60px rgba(255, 255, 255, 0.15)',
              }}
            >
              <motion.div
                className="text-6xl md:text-7xl mb-4"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              >
                🎉
              </motion.div>
              <p
                className="text-white text-xl md:text-2xl font-bold leading-relaxed"
                style={{ textShadow: '0 3px 6px rgba(0,0,0,0.6)' }}
              >
                {encouragementMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coach Chat Panel */}
      <CoachView
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentTask={task}
        currentSubtask={currentSubtask}
      />

      {/* Break Screen */}
      <BreakScreen
        isOpen={showBreakScreen}
        onTakeBreak={handleTakeBreak}
        onContinue={handleContinueWorking}
        xpEarned={50}
      />
    </motion.div>
  );
}
