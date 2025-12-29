'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { TaskList } from '@/components/TaskList';
import { TaskForm } from '@/components/TaskForm';
import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { GalaxyFocusView } from '@/components/focus/GalaxyFocusView';
import { EmergencyButton } from '@/components/focus/EmergencyButton';
import { subscribeToPushNotifications, getNotificationPermissionStatus } from '@/lib/notifications';
import { setUserId } from '@/lib/api';
import { migrateGuestDataIfNeeded, initializeGuestMode } from '@/lib/migration';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { tasks, toggleSubtask } = useTaskStore();
  const { isFocusMode, activeTaskId, activeSubtaskIndex, completeCurrentSubtask, skipCurrentSubtask, exitFocusMode } = useCoachStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : undefined;

  // Focus mode data
  const activeTask = isFocusMode && activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;
  const currentSubtask = activeTask?.subtasks[activeSubtaskIndex];

  // Handle subtask completion in focus mode
  const handleCompleteSubtask = async () => {
    if (!activeTask || !currentSubtask) return;

    // Mark subtask as completed
    await toggleSubtask(activeTask.id, currentSubtask.id);

    // Move to next subtask or exit focus mode
    if (activeSubtaskIndex < activeTask.subtasks.length - 1) {
      completeCurrentSubtask();
    } else {
      // All subtasks completed!
      exitFocusMode();
    }
  };

  const handleSkipSubtask = () => {
    if (!activeTask) return;

    if (activeSubtaskIndex < activeTask.subtasks.length - 1) {
      skipCurrentSubtask();
    } else {
      exitFocusMode();
    }
  };

  // Handle authentication state and guest mode
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // User is authenticated
      setUserId(session.user.id);
      console.log('✅ User ID stored:', session.user.id);

      // Trigger guest data migration if needed
      migrateGuestDataIfNeeded(session.user.id).catch((error) => {
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
      // Use session.user.id directly instead of localStorage to avoid race condition
      const userId = session?.user?.id;
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

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden relative">
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

      {/* Emergency Button (always visible) */}
      <EmergencyButton />

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

      {/* Full screen task graph - click/tap background to create new task */}
      <TaskList
        onBackgroundClick={() => setShowTaskForm(true)}
        onEditTask={(taskId) => setEditingTaskId(taskId)}
      />
    </main>
  );
}
