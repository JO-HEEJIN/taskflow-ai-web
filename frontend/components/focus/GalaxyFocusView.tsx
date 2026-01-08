'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Task, Subtask, ConfidenceLevel } from '@/types';
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
import { X, ChevronRight, SkipForward, MessageCircle, Maximize, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { soundManager } from '@/lib/SoundManager';
import { showTimerCompletedNotification } from '@/lib/notifications';
import { useTaskStore } from '@/store/taskStore';

// Emergency quests for calming down when timer is >= 100 minutes
const EMERGENCY_QUESTS = [
  { title: "Stretch your arms", duration: 1, icon: "🙆" },
  { title: "Drink a glass of water", duration: 2, icon: "💧" },
  { title: "Take 3 deep breaths", duration: 1, icon: "🌬️" },
  { title: "Jump 10 times in place", duration: 1, icon: "🦘" },
  { title: "Close eyes and meditate for 10 seconds", duration: 1, icon: "🧘" },
];

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
  const {
    setIsPiPActive,
    showBreakScreen,
    setShowBreakScreen,
    isParentSubtaskView,
    // Learning Engine state
    isLearningMode,
    currentLearningStrategy,
    showInterleavePopup,
    checkInterleaveBreak,
    dismissInterleavePopup,
  } = useCoachStore();
  const { addXp } = useGamificationStore();
  const { isSupported: isPiPSupported, isPiPOpen, openPiP, updatePiP, closePiP } = usePictureInPicture();
  const [encouragementMessage, setEncouragementMessage] = useState<string>('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  // Emergency popup state for 100+ min tasks
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  const [currentEmergencyQuest, setCurrentEmergencyQuest] = useState(EMERGENCY_QUESTS[0]);
  const [emergencyQuestCompleted, setEmergencyQuestCompleted] = useState(false);

  // Note: We use api.addSubtasks directly for server persistence
  const estimatedMinutes = currentSubtask.estimatedMinutes || 5;
  const canBreakDown = estimatedMinutes >= 10 && !currentSubtask.children?.length;

  // Auto-show emergency popup when timer >= 100 minutes
  useEffect(() => {
    if (estimatedMinutes >= 100) {
      // Pick random quest
      const randomQuest = EMERGENCY_QUESTS[Math.floor(Math.random() * EMERGENCY_QUESTS.length)];
      setCurrentEmergencyQuest(randomQuest);
      setEmergencyQuestCompleted(false);
      setShowEmergencyPopup(true);
    }
  }, [currentSubtask.id]); // Only trigger on subtask change

  // Check for interleaving break every minute (for learning tasks)
  useEffect(() => {
    if (!isLearningMode) return;

    const interval = setInterval(() => {
      checkInterleaveBreak();
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [isLearningMode, checkInterleaveBreak]);

  // Handle emergency quest completion
  const handleEmergencyQuestComplete = () => {
    // Micro confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#22c55e', '#86efac', '#fbbf24'],
    });

    // Add XP
    addXp(10);
    setEmergencyQuestCompleted(true);

    // Auto-close after showing success
    setTimeout(() => {
      setShowEmergencyPopup(false);
    }, 1500);
  };

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

  // Handle confidence-based completion for learning tasks (SRS - Spaced Repetition)
  const handleConfidenceComplete = async (confidence: ConfidenceLevel) => {
    // Supernova confetti effect with color based on confidence
    const confettiColors = {
      red: ['#ef4444', '#f87171', '#fca5a5'],
      yellow: ['#eab308', '#facc15', '#fde047'],
      green: ['#22c55e', '#4ade80', '#86efac'],
    };

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors: confettiColors[confidence],
      ticks: 180,
    });

    // Add XP based on confidence
    const xpReward = confidence === 'green' ? 100 : confidence === 'yellow' ? 50 : 25;
    addXp(xpReward);

    try {
      // Complete with confidence rating via API
      await api.completeWithConfidence(task.id, currentSubtask.id, confidence);

      // Get encouragement message
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

      // Auto-hide and proceed
      setTimeout(() => {
        setShowEncouragement(false);
        setTimeout(() => {
          onComplete();
        }, 300);
      }, 3000);
    } catch (error) {
      console.error('Failed to complete with confidence:', error);
      // Proceed anyway
      setTimeout(() => {
        onComplete();
      }, 600);
    }
  };

  // Check if current subtask is a learning task (has strategyTag)
  const isLearningTask = !!currentSubtask.strategyTag;

  // Break down current subtask into smaller atomic tasks
  const handleBreakDownFurther = async () => {
    console.log('🔘 Break Down Further button clicked!');
    console.log(`  - isBreakingDown: ${isBreakingDown}`);
    console.log(`  - canBreakDown: ${canBreakDown}`);
    console.log(`  - currentSubtask.id: ${currentSubtask.id}`);
    console.log(`  - estimatedMinutes: ${estimatedMinutes}`);

    if (isBreakingDown) {
      console.log('⏳ Already breaking down, ignoring click');
      return;
    }
    if (!canBreakDown) {
      console.log('❌ Cannot break down (condition not met)');
      return;
    }

    setIsBreakingDown(true);
    try {
      console.log(`🔄 Breaking down subtask: "${currentSubtask.title}" (${estimatedMinutes}min)`);

      // Step 1: Call AI to get atomic breakdown
      const result = await api.breakdownSubtask(
        task.id,
        currentSubtask.id,
        currentSubtask.title,
        estimatedMinutes
      );

      console.log('📥 AI Response:', result);

      if (result.children && result.children.length > 0) {
        // Step 2: Format children WITH parentSubtaskId for server persistence
        // Get current max order in task subtasks
        const maxOrder = Math.max(...task.subtasks.map(st => st.order), -1);

        const childrenForServer = result.children.map((child: any, index: number) => ({
          title: child.title,
          estimatedMinutes: child.estimatedMinutes || 5,
          stepType: child.stepType || 'mental',
          parentSubtaskId: currentSubtask.id, // ✅ Link to parent for hierarchy
          order: maxOrder + 1 + index, // Place after existing subtasks
          isComposite: false,
          depth: (currentSubtask.depth || 0) + 1, // Increment depth for nesting
        }));

        console.log('📝 Saving children to server with parentSubtaskId:', currentSubtask.id);
        console.log('📝 Children data being sent:', JSON.stringify(childrenForServer, null, 2));

        // Step 3: Persist children to server via API
        const apiResult = await api.addSubtasks(task.id, childrenForServer);
        console.log('📝 API addSubtasks result:', apiResult);

        const updatedTask = apiResult?.task;
        if (!updatedTask) {
          console.error('❌ api.addSubtasks returned null task!');
          return;
        }
        console.log('✅ Server saved children. Updated task has', updatedTask.subtasks.length, 'subtasks');

        // Log all subtasks to see their parentSubtaskId values
        console.log('📝 All subtasks after save:');
        updatedTask.subtasks.forEach((st: Subtask, i: number) => {
          console.log(`  [${i}] ${st.title.substring(0, 30)} | parentSubtaskId: ${st.parentSubtaskId || 'none'}`);
        });

        // Step 4: Update store with server response
        const { fetchTasks } = useTaskStore.getState();
        // Update the specific task in store
        useTaskStore.setState((state) => ({
          tasks: state.tasks.map((t) => (t.id === task.id ? updatedTask : t)),
        }));

        // Step 5: Find the newly added children (they have parentSubtaskId matching current subtask)
        console.log('📝 Looking for children with parentSubtaskId:', currentSubtask.id);
        const newChildren = updatedTask.subtasks.filter(
          (st: Subtask) => st.parentSubtaskId === currentSubtask.id && !st.isCompleted
        ).sort((a: Subtask, b: Subtask) => a.order - b.order);

        console.log('📝 Found', newChildren.length, 'new children from server');
        if (newChildren.length === 0) {
          console.error('❌ No children found! Check if parentSubtaskId was saved correctly.');
        }

        // Step 6: Build focus queue with children + parent for confirmation
        // Find the updated parent subtask (marked as composite by server)
        const updatedParent = updatedTask.subtasks.find((st: Subtask) => st.id === currentSubtask.id);

        const focusQueueWithParent: Subtask[] = [
          ...newChildren.map((child: Subtask, index: number) => ({
            ...child,
            order: index, // Reset order for focus queue navigation
          })),
          // Parent at the end for confirmation screen
          {
            ...(updatedParent || currentSubtask),
            isComposite: true,
            children: newChildren,
            order: newChildren.length, // Ensure parent comes last
          },
        ];

        console.log('📝 Focus queue:', focusQueueWithParent.length, 'items');
        console.log('📝 Queue:', focusQueueWithParent.map(s => ({
          title: s.title.substring(0, 25),
          order: s.order,
          id: s.id.substring(0, 15),
          isComposite: s.isComposite
        })));

        // Step 7: Enter focus mode with persisted children
        const { enterFocusMode } = useCoachStore.getState();
        console.log('🎯 Entering focus mode with', newChildren.length, 'children + parent');
        enterFocusMode(task.id, focusQueueWithParent);

        console.log(`✅ Added ${result.children.length} children to server, now focusing on first one`);
      } else {
        console.log('⚠️ AI returned no children');
      }
    } catch (error: any) {
      console.error('❌ Failed to break down subtask:', error);
      console.error('  Error message:', error?.message);
      console.error('  Error stack:', error?.stack);
    } finally {
      setIsBreakingDown(false);
    }
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
            <div className="text-8xl mb-6">✅</div>

            {/* Parent Subtask Title */}
            <h2 className="text-3xl font-bold text-white mb-3 text-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
              {currentSubtask.title}
            </h2>
            <p className="text-lg text-green-300 mb-8 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
              All steps completed! Ready for next subtask.
            </p>
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
                      <span className="text-xs text-purple-300 mt-1">Click &quot;Next Subtask&quot; to continue your journey.</span>
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

        {/* Break Down Further button - Only show if task >= 10min and has no children yet */}
        {canBreakDown && !isParentSubtaskView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="w-full max-w-md px-4 mb-4"
          >
            <button
              onClick={handleBreakDownFurther}
              disabled={isBreakingDown}
              className="w-full py-3 px-6 text-sm font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(167, 139, 250, 0.3) 100%)',
                border: '1px solid rgba(167, 139, 250, 0.5)',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
              }}
            >
              {isBreakingDown ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-purple-400 border-r-transparent" />
                  <span className="text-purple-200">Breaking down into smaller steps...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  <span className="text-purple-200">
                    Too big? Break Down Further ({estimatedMinutes}min → smaller chunks)
                  </span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md px-4"
        >
          {/* Traffic Light Confidence Buttons - For learning tasks (SRS) */}
          {isLearningTask && !isParentSubtaskView ? (
            <div className="flex-1 flex gap-2">
              {/* Red - Didn't get it */}
              <button
                onClick={() => handleConfidenceComplete('red')}
                className="flex-1 py-3 md:py-4 px-3 text-sm md:text-base font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-lg">🔴</span>
                <span className="text-white text-xs">Didn't get it</span>
                <span className="text-white/60 text-[10px]">20 min</span>
              </button>

              {/* Yellow - Kind of get it */}
              <button
                onClick={() => handleConfidenceComplete('yellow')}
                className="flex-1 py-3 md:py-4 px-3 text-sm md:text-base font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1"
                style={{
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  boxShadow: '0 0 20px rgba(234, 179, 8, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-lg">🟡</span>
                <span className="text-white text-xs">Kind of get it</span>
                <span className="text-white/60 text-[10px]">Tomorrow</span>
              </button>

              {/* Green - Nailed it */}
              <button
                onClick={() => handleConfidenceComplete('green')}
                className="flex-1 py-3 md:py-4 px-3 text-sm md:text-base font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-lg">🟢</span>
                <span className="text-white text-xs">Nailed it!</span>
                <span className="text-white/60 text-[10px]">3 days</span>
              </button>
            </div>
          ) : (
            /* Standard Complete button - For non-learning tasks */
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
          )}

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
                background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.95) 0%, rgba(34, 197, 94, 0.95) 100%)',
                border: '3px solid rgba(134, 239, 172, 0.4)',
                boxShadow: '0 0 60px rgba(34, 197, 94, 0.5), 0 0 100px rgba(139, 92, 246, 0.4), inset 0 0 60px rgba(255, 255, 255, 0.08)',
              }}
            >
              <motion.div
                className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-4 relative"
                animate={{
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Multiple glow layers for bloom effect */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                    transform: 'scale(1.5)',
                  }}
                />
                <img
                  src="/icons/tick_network_icon.png"
                  alt="Success"
                  className="w-full h-full object-contain relative z-10"
                  style={{
                    filter: 'drop-shadow(0 0 15px rgba(134, 239, 172, 1)) drop-shadow(0 0 30px rgba(34, 197, 94, 0.9)) drop-shadow(0 0 50px rgba(139, 92, 246, 0.7)) drop-shadow(0 0 80px rgba(34, 197, 94, 0.5))',
                  }}
                />
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

      {/* Emergency "Don't Freak Out" Popup - Shows when timer >= 100 minutes */}
      <AnimatePresence>
        {showEmergencyPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => !emergencyQuestCompleted && setShowEmergencyPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative max-w-md w-full p-8 rounded-3xl"
              style={{
                background: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.05)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              {!emergencyQuestCompleted && (
                <button
                  onClick={() => setShowEmergencyPopup(false)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {emergencyQuestCompleted ? (
                // Success state
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-white mb-2">You got this!</h3>
                  <p className="text-blue-200 text-lg">+10 XP earned!</p>
                </motion.div>
              ) : (
                // Calming message + Quest
                <>
                  {/* "Don't Freak Out!" Header */}
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-6xl mb-4"
                    >
                      🧘
                    </motion.div>
                    <h3
                      className="text-3xl font-bold text-white mb-3"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
                    >
                      Don&apos;t Freak Out!
                    </h3>
                    <p className="text-blue-200 text-sm leading-relaxed">
                      This task is {estimatedMinutes} minutes long. That&apos;s okay!
                      <br />
                      <span className="text-purple-300">Let&apos;s take a quick calming break first.</span>
                    </p>
                  </div>

                  {/* Quest Card */}
                  <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                    <div className="text-4xl mb-3 text-center">{currentEmergencyQuest.icon}</div>
                    <h4 className="text-xl font-semibold text-white mb-2 text-center">
                      {currentEmergencyQuest.title}
                    </h4>
                    <p className="text-blue-200 text-center text-sm">
                      Takes about {currentEmergencyQuest.duration} min
                    </p>
                  </div>

                  {/* Complete button */}
                  <button
                    onClick={handleEmergencyQuestComplete}
                    className="w-full py-4 px-6 text-lg font-bold text-white rounded-2xl transition-all transform hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    ✅ Done! I&apos;m Ready
                  </button>

                  {/* Skip option */}
                  <button
                    onClick={() => setShowEmergencyPopup(false)}
                    className="w-full mt-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    Skip, I&apos;m fine
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interleaving Popup - Suggests switching topics after 25+ min on same topic */}
      <AnimatePresence>
        {showInterleavePopup && isLearningMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => dismissInterleavePopup()}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative max-w-md w-full p-8 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.5)',
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.05)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => dismissInterleavePopup()}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Interleave message */}
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  🔄
                </motion.div>
                <h3
                  className="text-2xl font-bold text-white mb-3"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
                >
                  Time to Interleave!
                </h3>
                <p className="text-purple-200 text-sm leading-relaxed mb-6">
                  You've been on this topic for 25+ minutes. Switching topics can actually improve your retention - it's called interleaving!
                </p>

                {/* Suggestion */}
                <div
                  className="p-4 rounded-xl mb-6"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <p className="text-white text-sm">
                    💡 <strong>Pro tip:</strong> After this subtask, consider working on a different topic for 10-15 minutes, then come back!
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => dismissInterleavePopup()}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-white transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    Got it, keep going
                  </button>
                </div>

                {/* Dismiss hint */}
                <p className="text-white/40 text-xs mt-4">
                  Timer will reset after 25 more minutes
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
