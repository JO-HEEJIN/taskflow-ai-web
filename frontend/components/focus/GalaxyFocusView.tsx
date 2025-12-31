'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Task, Subtask } from '@/types';
import { OrbitTimer } from './OrbitTimer';
import { CoachView } from './CoachView';
import { PiPTimer } from './PiPTimer';
import { BreakScreen } from './BreakScreen';
import { useCoachStore } from '@/store/useCoachStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { useTimerSync } from '@/hooks/useTimerSync';
import { useTimerWebSocket } from '@/hooks/useTimerWebSocket';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';
import { useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { X, ChevronRight, SkipForward, MessageCircle, Maximize } from 'lucide-react';
import { api } from '@/lib/api';
import { playTimerCompletionSound } from '@/lib/sounds';
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
  const { isTimerRunning, startTimer, pauseTimer, currentTimeLeft, endTime, activeSubtaskIndex, setIsPiPActive, showBreakScreen, setShowBreakScreen } = useCoachStore();
  const { addXp } = useGamificationStore();
  const { broadcastTimerEvent } = useTimerSync();
  const { startTimerWS, pauseTimerWS, resumeTimerWS, stopTimerWS } = useTimerWebSocket();
  const { isSupported: isPiPSupported, isPiPOpen, openPiP, updatePiP, closePiP } = usePictureInPicture();
  const [encouragementMessage, setEncouragementMessage] = useState<string>('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const estimatedMinutes = currentSubtask.estimatedMinutes || 5;

  // Initialize timer when subtask changes
  useEffect(() => {
    // Start timer via WebSocket (server-managed)
    startTimerWS(task.id, currentSubtask.id, estimatedMinutes);

    // Also broadcast to Phase 1 BroadcastChannel for backward compatibility
    const newEndTime = Date.now() + (estimatedMinutes * 60 * 1000);
    broadcastTimerEvent('TIMER_START', {
      endTime: newEndTime,
      timeLeft: estimatedMinutes * 60,
      taskId: task.id,
      subtaskId: currentSubtask.id,
    });
  }, [currentSubtask.id, estimatedMinutes, startTimerWS, broadcastTimerEvent, task.id]);

  // Cleanup: stop timer when component unmounts
  useEffect(() => {
    return () => {
      stopTimerWS();
      broadcastTimerEvent('TIMER_STOP', {});
    };
  }, [stopTimerWS, broadcastTimerEvent]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      // Pause via WebSocket
      pauseTimerWS();
      broadcastTimerEvent('TIMER_PAUSE', { isPaused: true });
    } else {
      if (currentTimeLeft === 0) {
        // Restart via WebSocket
        startTimerWS(task.id, currentSubtask.id, estimatedMinutes);
        const newEndTime = Date.now() + (estimatedMinutes * 60 * 1000);
        broadcastTimerEvent('TIMER_START', {
          endTime: newEndTime,
          timeLeft: estimatedMinutes * 60,
          taskId: task.id,
          subtaskId: currentSubtask.id,
        });
      } else {
        // Resume via WebSocket
        resumeTimerWS();
        broadcastTimerEvent('TIMER_RESUME', {
          endTime,
          timeLeft: currentTimeLeft,
        });
      }
    }
  };

  // Handle closing Picture-in-Picture (defined before use)
  const handleClosePiP = useCallback(() => {
    closePiP();
    setIsPiPActive(false);
  }, [closePiP]);

  // Handle opening Picture-in-Picture
  const handleOpenPiP = async () => {
    if (!isPiPSupported) {
      console.warn('Picture-in-Picture is not supported in this browser');
      return;
    }

    await openPiP(
      <PiPTimer
        taskTitle={task.title}
        subtaskTitle={currentSubtask.title}
        currentTimeLeft={currentTimeLeft}
        isTimerRunning={isTimerRunning}
        initialDuration={estimatedMinutes * 60}
        onClose={handleClosePiP}
        onToggleTimer={handleToggleTimer}
      />,
      { width: 320, height: 220 }
    );

    setIsPiPActive(true);
  };

  // Update PiP when timer state changes
  useEffect(() => {
    if (!isPiPOpen) return;

    // Update PiP content with latest props
    updatePiP(
      <PiPTimer
        taskTitle={task.title}
        subtaskTitle={currentSubtask.title}
        currentTimeLeft={currentTimeLeft}
        isTimerRunning={isTimerRunning}
        initialDuration={estimatedMinutes * 60}
        onClose={handleClosePiP}
        onToggleTimer={handleToggleTimer}
      />
    );
  }, [currentTimeLeft, isTimerRunning, isPiPOpen, task.title, currentSubtask.title, estimatedMinutes, handleClosePiP, handleToggleTimer, updatePiP]);

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

  const handleTimerComplete = async () => {
    console.log('⏰ Timer completed!');

    // PHASE 5: Completion Actions

    // 1. Play completion sound
    try {
      await playTimerCompletionSound();
      console.log('🔊 Completion sound played');
    } catch (error) {
      console.error('❌ Failed to play completion sound:', error);
    }

    // 2. Force window focus
    if (typeof window !== 'undefined') {
      try {
        window.focus();
        console.log('🎯 Window focused');
      } catch (error) {
        console.error('❌ Failed to focus window:', error);
      }
    }

    // 3. Vibrate on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
        console.log('📳 Vibration triggered');
      } catch (error) {
        console.error('❌ Failed to vibrate:', error);
      }
    }

    // 4. Show full-screen break screen
    useCoachStore.setState({ showBreakScreen: true });
    console.log('🎉 Break screen shown');

    // 5. Show notification
    showTimerCompletedNotification();
  };

  // Break screen handlers
  const handleTakeBreak = () => {
    console.log('☕ Taking a 5-minute break');
    setShowBreakScreen(false);
    // Start 5-minute break timer
    startTimerWS(task.id, currentSubtask.id, 5);
    broadcastTimerEvent('TIMER_START', {
      endTime: Date.now() + (5 * 60 * 1000),
      timeLeft: 5 * 60,
    });
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
      className="fixed inset-0 z-[9999] overflow-y-auto flex flex-col items-center justify-start px-4 py-20"
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

      {/* Progress indicator (top-right, below close button) - Hidden on mobile */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="hidden md:block absolute top-16 md:top-20 right-4 md:right-8 z-10"
      >
        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-purple-500/30">
          <span className="text-white text-xs md:text-sm font-medium" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {completedSubtasks}/{totalSubtasks}
          </span>
        </div>
      </motion.div>

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

        {/* AI Coaching Button - Repositioned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6 relative"
        >
          {/* Arrow Hint */}
          <motion.div
            className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none"
            animate={{
              y: [0, 8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.p
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-white/90 text-xs mb-1 font-medium"
            >
              Need help?
            </motion.p>
            <motion.div className="text-2xl">↓</motion.div>
          </motion.div>

          <button
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
          </button>
        </motion.div>

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
                  <strong className="text-white">Mission Control:</strong> Focus on this one task.
                  {isTimerRunning
                    ? " You're doing great! Keep going."
                    : " Click the timer to begin your mission."}
                  {` Estimated time: ${estimatedMinutes} minutes.`}
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
          {/* Complete button */}
          <button
            onClick={handleComplete}
            className="flex-1 py-3 md:py-4 px-6 text-base md:text-lg font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
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
