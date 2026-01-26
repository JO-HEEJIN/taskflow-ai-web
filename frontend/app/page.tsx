'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { TaskList } from '@/components/TaskList';
import { MobileTaskView } from '@/components/mobile/MobileTaskView';
import { TaskForm } from '@/components/TaskForm';
import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { GalaxyFocusView } from '@/components/focus/GalaxyFocusView';
import { LevelUpModal } from '@/components/rewards/LevelUpModal';
import { ProfileButton } from '@/components/profile/ProfileButton';
import { LoadingScreen } from '@/components/LoadingScreen';
import { BackgroundMusicPlayer } from '@/components/BackgroundMusicPlayer';
import { AudioPermissionScreen } from '@/components/onboarding/AudioPermissionScreen';
import { subscribeToPushNotifications, getNotificationPermissionStatus } from '@/lib/notifications';
import { setUserId } from '@/lib/api';
import { migrateGuestDataIfNeeded, initializeGuestMode } from '@/lib/migration';
import { unlockAudioForMobile } from '@/lib/sounds';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { tasks, toggleSubtask } = useTaskStore();
  const { isFocusMode, activeTaskId, activeSubtaskIndex, focusQueue, completeCurrentSubtask, skipCurrentSubtask, exitFocusMode } = useCoachStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('audioPermissionGranted') === 'true';
    }
    return false;
  });

  // Handle audio permission
  const handleAllowAudio = () => {
    // Enable background music by default
    localStorage.setItem('continuousMusicEnabled', 'true');

    // Transition to onboarding
    localStorage.setItem('audioPermissionGranted', 'true');
    setAudioPermissionGranted(true);
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Unlock audio on first user interaction (mobile requirement)
  useEffect(() => {
    const handleFirstInteraction = async () => {
      await unlockAudioForMobile();
    };

    // Listen for first interaction
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : undefined;

  // Focus mode data
  const activeTask = isFocusMode && activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;
  // Use focusQueue if available (for children), otherwise fallback to subtasks
  const currentSubtask = focusQueue.length > 0
    ? focusQueue[activeSubtaskIndex]
    : activeTask?.subtasks[activeSubtaskIndex];

  // Handle subtask completion in focus mode
  const handleCompleteSubtask = async () => {
    if (!activeTask || !currentSubtask) return;

    // ✅ Calculate focused minutes (estimated time for this subtask)
    const focusedMinutes = currentSubtask.estimatedMinutes || 5;
    console.log(`✅ [Page] Completing subtask: ${currentSubtask.title} (${focusedMinutes}min focused)`);

    // Mark subtask as completed via server API
    // All subtasks (including children from Break Down Further) are now persisted
    if (currentSubtask.id) {
      await toggleSubtask(activeTask.id, currentSubtask.id);
      console.log(`🔄 [Page] Toggled subtask via server: ${currentSubtask.id}`);

      // ✅ Check if this was a child and all siblings are now complete
      // If so, we need to auto-complete the parent subtask
      if (currentSubtask.parentSubtaskId) {
        const parentId = currentSubtask.parentSubtaskId;
        // Get fresh task data after toggle
        const freshTask = useTaskStore.getState().tasks.find(t => t.id === activeTask.id);
        if (freshTask) {
          const siblings = freshTask.subtasks.filter(st => st.parentSubtaskId === parentId);
          const allSiblingsCompleted = siblings.every(st => st.isCompleted || st.id === currentSubtask.id);

          console.log(`📊 [Page] Parent ${parentId}: ${siblings.filter(s => s.isCompleted || s.id === currentSubtask.id).length}/${siblings.length} children completed`);

          if (allSiblingsCompleted && siblings.length > 0) {
            console.log(`✅ [Page] All children completed! Auto-completing parent: ${parentId}`);
            await toggleSubtask(activeTask.id, parentId);
          }
        }
      }
    }

    // Use focusQueue for navigation
    const queueToUse = focusQueue.length > 0 ? focusQueue : activeTask.subtasks;

    // ✅ Move to next incomplete subtask with focused time tracking
    completeCurrentSubtask(queueToUse, focusedMinutes);
  };

  const handleSkipSubtask = () => {
    if (!activeTask) return;

    // Use focusQueue for navigation
    const queueToUse = focusQueue.length > 0 ? focusQueue : activeTask.subtasks;

    // Skip to next incomplete subtask (or exit if none left)
    skipCurrentSubtask(queueToUse);
  };

  // Handle authentication state and guest mode
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      // User is authenticated - use email as consistent identifier across devices
      setUserId(session.user.email);
      console.log('✅ User ID stored (email):', session.user.email);

      // Trigger guest data migration if needed
      migrateGuestDataIfNeeded(session.user.email).catch((error) => {
        console.error('Migration error:', error);
      });
    } else if (status === 'unauthenticated') {
      // Initialize guest mode
      initializeGuestMode();
      console.log('👤 Guest mode active');
    }
  }, [status, session]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    const initNotifications = async () => {
      // Use session.user.email directly instead of localStorage to avoid race condition
      const userId = session?.user?.email;
      if (!userId) {
        console.log('No user ID found, notifications not initialized');
        return;
      }

      const status = getNotificationPermissionStatus();
      setNotificationStatus(status);

      if (status === 'default') {
        // Automatically request permission and subscribe
        const success = await subscribeToPushNotifications(userId);
        if (success) {
          setNotificationStatus('granted');
          console.log('✅ Push notifications enabled');
        }
      } else if (status === 'granted') {
        // Already granted, ensure subscription is active
        await subscribeToPushNotifications(userId);
        console.log('✅ Push notifications already enabled');
      }
    };

    // Only initialize notifications when user is authenticated
    if (status === 'authenticated' && session?.user?.id) {
      initNotifications();
    }
  }, [status, session]);

  // Listen for level-up events
  useEffect(() => {
    const handleLevelUp = (event: CustomEvent) => {
      setNewLevel(event.detail.newLevel);
      setShowLevelUp(true);
    };

    window.addEventListener('levelup', handleLevelUp as EventListener);
    return () => window.removeEventListener('levelup', handleLevelUp as EventListener);
  }, []);

  // Show loading while checking authentication
  if (status === 'loading') {
    return <LoadingScreen />;
  }

  // Show audio permission screen first
  if (!audioPermissionGranted) {
    return <AudioPermissionScreen onAllow={handleAllowAudio} />;
  }

  return (
    <main className="min-h-screen relative">
      {/* Background Music Player */}
      <BackgroundMusicPlayer />

      {/* Profile Button - always available, but button only shows on desktop */}
      {!isMobile && <ProfileButton />}

      {/* Profile Modal for mobile (controlled by Settings button) */}
      {isMobile && (
        <ProfileButton isOpen={showProfile} onOpenChange={setShowProfile} />
      )}

      {/* Galaxy Focus Mode Overlay */}
      <AnimatePresence>
        {isFocusMode && activeTask && currentSubtask && (
          <GalaxyFocusView
            task={activeTask}
            currentSubtask={currentSubtask}
            onComplete={handleCompleteSubtask}
            onSkip={handleSkipSubtask}
            onClose={exitFocusMode}
          />
        )}
      </AnimatePresence>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => setShowTaskForm(false)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setShowTaskForm(false);
          }}
        >
          <div
            className="rounded-2xl max-w-2xl w-full p-8 backdrop-blur-md"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              boxShadow: '0 0 40px rgba(167, 139, 250, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.03)',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white" style={{ textShadow: '0 0 20px rgba(167, 139, 250, 0.5)' }}>
                Create New Task
              </h2>
              <button
                onClick={() => setShowTaskForm(false)}
                className="text-gray-400 hover:text-purple-300 text-2xl transition-colors"
                style={{ textShadow: '0 0 10px rgba(167, 139, 250, 0.5)' }}
              >
                ✕
              </button>
            </div>
            <TaskForm onClose={() => setShowTaskForm(false)} />
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTaskId && editingTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => setEditingTaskId(null)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setEditingTaskId(null);
          }}
        >
          <div
            className="rounded-2xl max-w-2xl w-full p-8 backdrop-blur-md"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              boxShadow: '0 0 40px rgba(167, 139, 250, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.03)',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white" style={{ textShadow: '0 0 20px rgba(167, 139, 250, 0.5)' }}>
                Edit Task
              </h2>
              <button
                onClick={() => setEditingTaskId(null)}
                className="text-gray-400 hover:text-purple-300 text-2xl transition-colors"
                style={{ textShadow: '0 0 10px rgba(167, 139, 250, 0.5)' }}
              >
                ✕
              </button>
            </div>
            <TaskForm task={editingTask} onClose={() => setEditingTaskId(null)} />
          </div>
        </div>
      )}

      {/* Conditional rendering: Mobile vs Desktop (hidden when in focus mode) */}
      {!isFocusMode && (
        <>
          {isMobile ? (
            <MobileTaskView
              onSettingsClick={() => setShowProfile(true)}
              onTaskSelect={(taskId) => {/* TODO: Handle task selection */}}
            />
          ) : (
            <TaskList
              onBackgroundClick={() => setShowTaskForm(true)}
              onEditTask={(taskId) => setEditingTaskId(taskId)}
            />
          )}
        </>
      )}

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={showLevelUp}
        newLevel={newLevel}
        onClose={() => setShowLevelUp(false)}
      />
    </main>
  );
}
