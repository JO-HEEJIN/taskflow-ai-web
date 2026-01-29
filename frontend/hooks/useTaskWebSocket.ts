import { useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTaskStore } from '@/store/taskStore';
import { socketClient } from '@/lib/socket';
import { Task } from '@/types';

/**
 * Hook to use WebSocket-based task synchronization
 * Connects to Socket.io server and syncs task state across devices in real-time
 */
export function useTaskWebSocket() {
  const { data: session } = useSession();
  const isInitializedRef = useRef(false);

  // Get userId from session (email for consistent cross-device identification)
  const userId = session?.user?.email || null;

  /**
   * Handle task created event from other devices
   */
  const handleTaskCreated = useCallback((data: { task: Task }) => {
    console.log('📥 [WebSocket] Task created on another device:', data.task.title);

    useTaskStore.setState((state) => {
      // Prevent duplicate: check if task already exists
      if (state.tasks.find(t => t.id === data.task.id)) {
        console.log('📥 [WebSocket] Task already exists, skipping duplicate');
        return state;
      }

      return {
        tasks: [...state.tasks, data.task],
      };
    });
  }, []);

  /**
   * Handle task updated event from other devices
   */
  const handleTaskUpdated = useCallback((data: { task: Task }) => {
    console.log('📥 [WebSocket] Task updated on another device:', data.task.title);

    useTaskStore.setState((state) => ({
      tasks: state.tasks.map(t => t.id === data.task.id ? data.task : t),
    }));
  }, []);

  /**
   * Handle task deleted event from other devices
   */
  const handleTaskDeleted = useCallback((data: { taskId: string }) => {
    console.log('📥 [WebSocket] Task deleted on another device:', data.taskId);

    useTaskStore.setState((state) => ({
      tasks: state.tasks.filter(t => t.id !== data.taskId),
    }));
  }, []);

  /**
   * Handle subtask toggled event from other devices
   */
  const handleSubtaskToggled = useCallback((data: { taskId: string; subtaskId: string; task: Task }) => {
    console.log('📥 [WebSocket] Subtask toggled on another device:', data.subtaskId);

    useTaskStore.setState((state) => ({
      tasks: state.tasks.map(t => t.id === data.taskId ? data.task : t),
    }));
  }, []);

  /**
   * Connect to socket and set up event listeners
   */
  useEffect(() => {
    // Only initialize for authenticated users
    if (!userId || isInitializedRef.current) {
      return;
    }

    console.log('🔌 [WebSocket] Initializing task sync for user:', userId);

    // Connect to socket (will reuse existing connection if already connected)
    socketClient.connect(userId);

    // Set up event listeners for task sync
    socketClient.onTaskCreated(handleTaskCreated);
    socketClient.onTaskUpdated(handleTaskUpdated);
    socketClient.onTaskDeleted(handleTaskDeleted);
    socketClient.onSubtaskToggled(handleSubtaskToggled);

    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      console.log('🔌 [WebSocket] Cleaning up task sync listeners');
      socketClient.off('task:created', handleTaskCreated);
      socketClient.off('task:updated', handleTaskUpdated);
      socketClient.off('task:deleted', handleTaskDeleted);
      socketClient.off('task:subtask:toggled', handleSubtaskToggled);
      // Don't disconnect socket - it's shared with timer sync
    };
  }, [userId, handleTaskCreated, handleTaskUpdated, handleTaskDeleted, handleSubtaskToggled]);

  return {
    isConnected: socketClient.isConnected(),
    userId,
  };
}
