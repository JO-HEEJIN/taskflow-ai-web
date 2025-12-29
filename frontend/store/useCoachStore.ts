import { create } from 'zustand';
import { Subtask } from '@/types';

interface Message {
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

// Helper function to find next incomplete subtask
const findNextIncompleteIndex = (subtasks: Subtask[], startFrom: number = 0): number => {
  for (let i = startFrom; i < subtasks.length; i++) {
    if (!subtasks[i].isCompleted) {
      return i;
    }
  }
  return -1;
};

interface CoachState {
  isFocusMode: boolean;
  activeTaskId: string | null;
  activeSubtaskIndex: number;
  isTimerRunning: boolean;
  currentTimeLeft: number; // seconds
  messages: Message[];

  // Actions
  enterFocusMode: (taskId: string, subtasks: Subtask[]) => void;
  exitFocusMode: () => void;
  startTimer: (durationMinutes: number) => void;
  pauseTimer: () => void;
  tickTimer: () => void;
  resetTimer: () => void;
  completeCurrentSubtask: (subtasks: Subtask[]) => void;
  skipCurrentSubtask: (subtasks: Subtask[]) => void;
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

  enterFocusMode: (taskId: string, subtasks: Subtask[]) => {
    const firstIncompleteIndex = findNextIncompleteIndex(subtasks, 0);

    if (firstIncompleteIndex === -1) {
      console.log('All subtasks already completed');
      return;
    }

    set({
      isFocusMode: true,
      activeTaskId: taskId,
      activeSubtaskIndex: firstIncompleteIndex,
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

  completeCurrentSubtask: (subtasks: Subtask[]) => {
    const { activeSubtaskIndex } = get();
    const nextIncompleteIndex = findNextIncompleteIndex(subtasks, activeSubtaskIndex + 1);

    if (nextIncompleteIndex === -1) {
      get().exitFocusMode();
      return;
    }

    set({
      activeSubtaskIndex: nextIncompleteIndex,
      isTimerRunning: false,
      currentTimeLeft: 0,
    });
  },

  skipCurrentSubtask: (subtasks: Subtask[]) => {
    const { activeSubtaskIndex } = get();
    const nextIncompleteIndex = findNextIncompleteIndex(subtasks, activeSubtaskIndex + 1);

    if (nextIncompleteIndex === -1) {
      get().exitFocusMode();
      return;
    }

    set({
      activeSubtaskIndex: nextIncompleteIndex,
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
