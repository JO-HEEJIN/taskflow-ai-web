import { useEffect, useCallback, useRef } from 'react';
import { useCoachStore } from '@/store/useCoachStore';

interface TimerSyncMessage {
  type: 'TIMER_START' | 'TIMER_PAUSE' | 'TIMER_RESUME' | 'TIMER_STOP' | 'TIMER_TICK';
  payload: {
    endTime?: number;
    timeLeft?: number;
    isPaused?: boolean;
    taskId?: string;
    subtaskId?: string;
  };
}

const STORAGE_KEY = 'taskflow-timer-state';
const CHANNEL_NAME = 'taskflow-timer';

export function useTimerSync() {
  const {
    isTimerRunning,
    currentTimeLeft,
    activeTaskId,
    setTimerState
  } = useCoachStore();

  // BroadcastChannel for cross-tab communication - use ref to persist across renders
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Track recent completion to prevent PiP from overwriting state
  const recentCompletionRef = useRef<number>(0);

  // Load timer state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const { endTime, isPaused, taskId } = JSON.parse(savedState);

        // Only restore if timer hasn't expired AND we're in focus mode
        const { isFocusMode } = useCoachStore.getState();
        if (endTime && endTime > Date.now() && isFocusMode) {
          const timeLeft = Math.floor((endTime - Date.now()) / 1000);

          useCoachStore.setState({
            currentTimeLeft: timeLeft,
            isTimerRunning: !isPaused,
            endTime,
          });
        } else {
          // Clear expired or invalid timer
          localStorage.removeItem(STORAGE_KEY);
          useCoachStore.setState({
            isTimerRunning: false,
            currentTimeLeft: 0,
            endTime: undefined,
          });
        }
      } catch (error) {
        console.error('Failed to restore timer state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Broadcast timer events to other tabs
  const broadcastTimerEvent = useCallback((type: TimerSyncMessage['type'], payload: TimerSyncMessage['payload']) => {
    if (!channelRef.current) return;

    try {
      const message: TimerSyncMessage = { type, payload };
      channelRef.current.postMessage(message);
    } catch (error) {
      // Channel might be closed, ignore silently
      console.warn('Failed to broadcast timer event:', error);
    }

    // Also save to localStorage for persistence
    if (type === 'TIMER_START' || type === 'TIMER_PAUSE' || type === 'TIMER_RESUME') {
      const state = {
        endTime: payload.endTime,
        isPaused: type === 'TIMER_PAUSE',
        taskId: payload.taskId,
        subtaskId: payload.subtaskId,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else if (type === 'TIMER_STOP') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Initialize channel and listen for messages from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create channel
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    const handleMessage = (event: MessageEvent<TimerSyncMessage>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'TIMER_START':
          if (payload.endTime) {
            const timeLeft = Math.floor((payload.endTime - Date.now()) / 1000);
            useCoachStore.setState({
              isTimerRunning: true,
              currentTimeLeft: timeLeft,
              endTime: payload.endTime,
            });
          }
          break;

        case 'TIMER_PAUSE':
          useCoachStore.setState({
            isTimerRunning: false,
          });
          break;

        case 'TIMER_RESUME':
          if (payload.endTime) {
            const timeLeft = Math.floor((payload.endTime - Date.now()) / 1000);
            useCoachStore.setState({
              isTimerRunning: true,
              currentTimeLeft: timeLeft,
              endTime: payload.endTime,
            });
          }
          break;

        case 'TIMER_STOP':
          // Mark completion timestamp to prevent stale TIMER_TICK from overwriting
          recentCompletionRef.current = Date.now();

          useCoachStore.setState({
            isTimerRunning: false,
            currentTimeLeft: 0,
            endTime: undefined,
          });
          break;

        case 'TIMER_TICK':
          // CRITICAL: Ignore TIMER_TICK if we just completed (within 2 seconds)
          // This prevents PiP's stale "1 second left" from reverting the completion
          const timeSinceCompletion = Date.now() - recentCompletionRef.current;
          if (timeSinceCompletion < 2000) {
            console.log('⏭️  Ignoring stale TIMER_TICK (just completed)');
            break;
          }

          if (payload.timeLeft !== undefined) {
            useCoachStore.setState({
              currentTimeLeft: payload.timeLeft,
            });
          }
          break;
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);

  return {
    broadcastTimerEvent,
  };
}
