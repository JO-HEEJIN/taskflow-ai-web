import { useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCoachStore } from '@/store/useCoachStore';
import { socketClient } from '@/lib/socket';
import {
  startTimerNotification,
  pauseTimerNotification,
  resumeTimerNotification,
  stopTimerNotification,
  showTimerCompletedNotification,
} from '@/lib/notifications';
import { playTimerCompletionSound } from '@/lib/sounds';

interface ClientTimerState {
  taskId: string;
  subtaskId: string;
  startTime: number;
  endTime: number;
  isPaused: boolean;
  currentTimeLeft: number;
}

/**
 * Hook to use WebSocket-based timer synchronization
 * Connects to Socket.io server and syncs timer state across devices
 */
export function useTimerWebSocket() {
  const { data: session } = useSession();
  const { setTimerState } = useCoachStore();
  const isInitializedRef = useRef(false);

  // Get userId from session
  const userId = session?.user?.email || session?.user?.id || null;

  /**
   * Handle timer state updates from server
   */
  const handleTimerState = useCallback((state: ClientTimerState) => {
    console.log('⏱️  Timer state update:', state);

    // Update Zustand store with server state
    setTimerState({
      isTimerRunning: !state.isPaused,
      currentTimeLeft: state.currentTimeLeft,
      endTime: state.endTime,
    });

    // Update notifications based on state
    if (state.isPaused) {
      pauseTimerNotification();
    } else if (state.endTime) {
      startTimerNotification(state.endTime);
    }
  }, [setTimerState]);

  /**
   * Handle timer stopped event from server
   */
  const handleTimerStopped = useCallback(() => {
    console.log('⏹️  Timer stopped');

    // Clear timer state in Zustand store
    useCoachStore.setState({
      isTimerRunning: false,
      currentTimeLeft: 0,
      endTime: undefined,
    });

    // Stop notifications
    stopTimerNotification();
  }, []);

  /**
   * Handle timer completed event from server
   */
  const handleTimerCompleted = useCallback(async (data: { taskId: string; subtaskId: string }) => {
    console.log('✅ Timer completed:', data);

    // Clear timer state
    useCoachStore.setState({
      isTimerRunning: false,
      currentTimeLeft: 0,
      endTime: undefined,
    });

    // Show completion notification with vibration
    showTimerCompletedNotification();

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

    // 3. Vibrate on mobile (pattern already in showTimerCompletedNotification)
    // Additional vibration for emphasis
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
  }, []);

  /**
   * Connect to socket and set up event listeners
   */
  useEffect(() => {
    if (!userId || isInitializedRef.current) {
      return;
    }

    console.log('🔌 Initializing WebSocket timer for user:', userId);

    // Connect to socket
    socketClient.connect(userId);

    // Set up event listeners
    socketClient.onTimerState(handleTimerState);
    socketClient.onTimerStopped(handleTimerStopped);
    socketClient.onTimerCompleted(handleTimerCompleted);

    // Request current timer state on connect
    if (socketClient.isConnected()) {
      socketClient.getTimerState();
    }

    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket timer');
      socketClient.off('timer:state', handleTimerState);
      socketClient.off('timer:stopped', handleTimerStopped);
      socketClient.off('timer:completed', handleTimerCompleted);
      // Don't disconnect here - socket should persist across component mounts
    };
  }, [userId, handleTimerState, handleTimerStopped, handleTimerCompleted]);

  /**
   * Start timer via WebSocket
   */
  const startTimerWS = useCallback((
    taskId: string,
    subtaskId: string,
    durationMinutes: number
  ) => {
    if (!userId) {
      console.error('❌ Cannot start timer: No user logged in');
      return;
    }

    console.log('▶️  Starting timer via WebSocket:', { taskId, subtaskId, durationMinutes });
    socketClient.startTimer(taskId, subtaskId, durationMinutes);
  }, [userId]);

  /**
   * Pause timer via WebSocket
   */
  const pauseTimerWS = useCallback(() => {
    console.log('⏸️  Pausing timer via WebSocket');
    socketClient.pauseTimer();
  }, []);

  /**
   * Resume timer via WebSocket
   */
  const resumeTimerWS = useCallback(() => {
    console.log('▶️  Resuming timer via WebSocket');
    socketClient.resumeTimer();
  }, []);

  /**
   * Stop timer via WebSocket
   */
  const stopTimerWS = useCallback(() => {
    console.log('⏹️  Stopping timer via WebSocket');
    socketClient.stopTimer();
  }, []);

  /**
   * Get current timer state from server
   */
  const refreshTimerState = useCallback(() => {
    console.log('🔄 Refreshing timer state');
    socketClient.getTimerState();
  }, []);

  return {
    startTimerWS,
    pauseTimerWS,
    resumeTimerWS,
    stopTimerWS,
    refreshTimerState,
    isConnected: socketClient.isConnected(),
  };
}
