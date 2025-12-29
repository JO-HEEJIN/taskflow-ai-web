import { create } from 'zustand';

interface Message {
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface CoachState {
  isFocusMode: boolean;
  activeTaskId: string | null;
  activeSubtaskIndex: number;
  isTimerRunning: boolean;
  currentTimeLeft: number; // seconds
  messages: Message[];

  // Actions
  enterFocusMode: (taskId: string) => void;
  exitFocusMode: () => void;
  startTimer: (durationMinutes: number) => void;
  pauseTimer: () => void;
  tickTimer: () => void;
  resetTimer: () => void;
  completeCurrentSubtask: () => void;
  skipCurrentSubtask: () => void;
  addMessage: (role: 'ai' | 'user', content: string) => void;
  clearMessages: () => void;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  isFocusMode: false,
  activeTaskId: null,
  activeSubtaskIndex: 0,
  isTimerRunning: false,
  currentTimeLeft: 0,
  messages: [],

  enterFocusMode: (taskId: string) => {
    set({
      isFocusMode: true,
      activeTaskId: taskId,
      activeSubtaskIndex: 0,
      isTimerRunning: false,
      currentTimeLeft: 0,
      messages: [],
    });
  },

  exitFocusMode: () => {
    set({
      isFocusMode: false,
      activeTaskId: null,
      activeSubtaskIndex: 0,
      isTimerRunning: false,
      currentTimeLeft: 0,
      messages: [],
    });
  },

  startTimer: (durationMinutes: number) => {
    const seconds = Math.floor(durationMinutes * 60);
    set({
      isTimerRunning: true,
      currentTimeLeft: seconds,
    });
  },

  pauseTimer: () => {
    set({ isTimerRunning: false });
  },

  tickTimer: () => {
    const { currentTimeLeft } = get();
    if (currentTimeLeft > 0) {
      set({ currentTimeLeft: currentTimeLeft - 1 });
    }

    // Auto-pause when timer reaches 0
    if (currentTimeLeft - 1 <= 0) {
      set({ isTimerRunning: false });
    }
  },

  resetTimer: () => {
    set({
      isTimerRunning: false,
      currentTimeLeft: 0,
    });
  },

  completeCurrentSubtask: () => {
    const { activeSubtaskIndex } = get();
    set({
      activeSubtaskIndex: activeSubtaskIndex + 1,
      isTimerRunning: false,
      currentTimeLeft: 0,
    });
  },

  skipCurrentSubtask: () => {
    const { activeSubtaskIndex } = get();
    set({
      activeSubtaskIndex: activeSubtaskIndex + 1,
      isTimerRunning: false,
      currentTimeLeft: 0,
    });
  },

  addMessage: (role: 'ai' | 'user', content: string) => {
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
