import { create } from 'zustand';
import { Subtask } from '@/types';
import { useGamificationStore } from './useGamificationStore'; // ✅ NEW: Import gamification store

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

// ✅ NEW: Helper to find atomic children of a parent subtask
const findAtomicChildren = (subtasks: Subtask[], parentSubtaskId: string): Subtask[] => {
  return subtasks.filter(st =>
    st.parentSubtaskId === parentSubtaskId &&
    st.title.startsWith('Atomic: ')
  );
};

// ✅ NEW: Helper to find first incomplete atomic task or regular subtask
const findFirstIncompleteAtomicOrSubtask = (subtasks: Subtask[]): number => {
  // First, look for incomplete atomic tasks
  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    if (subtask.isCompleted) continue;

    // If this is a composite subtask (has atomic children), find first incomplete atomic child
    if (subtask.isComposite) {
      const atomicChildren = findAtomicChildren(subtasks, subtask.id);
      const incompleteAtomic = atomicChildren.find(child => !child.isCompleted);
      if (incompleteAtomic) {
        return subtasks.indexOf(incompleteAtomic);
      }
    }

    // If this is an atomic task, return it
    if (subtask.title.startsWith('Atomic: ')) {
      return i;
    }

    // If this is a regular subtask (not composite, not atomic), return it
    if (!subtask.isComposite && !subtask.parentSubtaskId) {
      return i;
    }
  }

  return -1;
};

// ✅ NEW: Helper to find next subtask after completing current atomic/subtask
const findNextAfterCompletion = (subtasks: Subtask[], currentIndex: number): number => {
  const currentSubtask = subtasks[currentIndex];

  // If current is an atomic task, find next atomic sibling or parent
  if (currentSubtask.parentSubtaskId && currentSubtask.title.startsWith('Atomic: ')) {
    const parentId = currentSubtask.parentSubtaskId;
    const atomicSiblings = findAtomicChildren(subtasks, parentId);
    const currentAtomicIndex = atomicSiblings.indexOf(currentSubtask);

    // Find next incomplete atomic sibling
    for (let i = currentAtomicIndex + 1; i < atomicSiblings.length; i++) {
      if (!atomicSiblings[i].isCompleted) {
        return subtasks.indexOf(atomicSiblings[i]);
      }
    }

    // All atomic siblings completed, return parent subtask
    const parentIndex = subtasks.findIndex(st => st.id === parentId);
    if (parentIndex !== -1 && !subtasks[parentIndex].isCompleted) {
      return parentIndex;
    }
  }

  // Otherwise, find next incomplete task using original logic
  return findFirstIncompleteAtomicOrSubtask(subtasks);
};

interface CoachState {
  isFocusMode: boolean;
  activeTaskId: string | null;
  activeSubtaskIndex: number;
  isTimerRunning: boolean;
  currentTimeLeft: number; // seconds
  endTime?: number; // Unix timestamp in ms
  isPiPActive: boolean; // Picture-in-Picture window active
  showBreakScreen: boolean; // Show full-screen break screen after timer completion
  messages: Message[];
  accumulatedFocusTime: number; // ✅ NEW: Total focused minutes (for level up)
  isParentSubtaskView: boolean; // ✅ NEW: True when showing parent after atomic tasks complete

  // Actions
  enterFocusMode: (taskId: string, subtasks: Subtask[]) => void;
  exitFocusMode: () => void;
  startTimer: (durationMinutes: number) => void;
  pauseTimer: () => void;
  tickTimer: () => void;
  resetTimer: () => void;
  setTimerState: (state: Partial<Pick<CoachState, 'isTimerRunning' | 'currentTimeLeft' | 'endTime'>>) => void;
  setIsPiPActive: (isActive: boolean) => void;
  setShowBreakScreen: (show: boolean) => void;
  completeCurrentSubtask: (subtasks: Subtask[], focusedMinutes: number) => void; // ✅ UPDATED: Add focusedMinutes param
  skipCurrentSubtask: (subtasks: Subtask[]) => void;
  addMessage: (role: 'ai' | 'user', content: string) => void;
  clearMessages: () => void;
  addFocusTime: (minutes: number) => void; // ✅ NEW: Track accumulated focus time
}

export const useCoachStore = create<CoachState>((set, get) => ({
  isFocusMode: false,
  activeTaskId: null,
  activeSubtaskIndex: 0,
  isTimerRunning: false,
  currentTimeLeft: 0,
  endTime: undefined,
  isPiPActive: false,
  showBreakScreen: false,
  messages: [],
  accumulatedFocusTime: 0, // ✅ NEW
  isParentSubtaskView: false, // ✅ NEW

  enterFocusMode: (taskId: string, subtasks: Subtask[]) => {
    // ✅ UPDATED: Find first incomplete atomic task or regular subtask
    const firstIncompleteIndex = findFirstIncompleteAtomicOrSubtask(subtasks);

    if (firstIncompleteIndex === -1) {
      console.log('All subtasks already completed');
      return;
    }

    const firstSubtask = subtasks[firstIncompleteIndex];
    console.log(`🎯 [Focus Mode] Starting with: ${firstSubtask.title} (${firstSubtask.estimatedMinutes || 5}min)`);

    set({
      isFocusMode: true,
      activeTaskId: taskId,
      activeSubtaskIndex: firstIncompleteIndex,
      isTimerRunning: false,
      currentTimeLeft: 0,
      messages: [],
      isParentSubtaskView: false, // Start with atomic/regular task, not parent
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
      accumulatedFocusTime: 0, // ✅ Reset on exit
      isParentSubtaskView: false, // ✅ Reset on exit
    });
  },

  startTimer: (durationMinutes: number) => {
    const seconds = Math.floor(durationMinutes * 60);
    const endTime = Date.now() + (seconds * 1000);
    set({
      isTimerRunning: true,
      currentTimeLeft: seconds,
      endTime,
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
      endTime: undefined,
    });
  },

  setTimerState: (state) => {
    set(state);
  },

  setIsPiPActive: (isActive: boolean) => {
    set({ isPiPActive: isActive });
  },

  setShowBreakScreen: (show: boolean) => {
    set({ showBreakScreen: show });
  },

  completeCurrentSubtask: (subtasks: Subtask[], focusedMinutes: number = 0) => {
    const { activeSubtaskIndex, accumulatedFocusTime } = get();
    const currentSubtask = subtasks[activeSubtaskIndex];

    // ✅ Track accumulated focus time
    const newAccumulatedTime = accumulatedFocusTime + focusedMinutes;
    console.log(`⏱️  [Focus Time] Completed ${currentSubtask.title}: +${focusedMinutes}min (Total: ${newAccumulatedTime}min)`);

    // ✅ Call addFocusTime to check for level up
    get().addFocusTime(focusedMinutes);

    // ✅ Find next subtask using new logic
    const nextIndex = findNextAfterCompletion(subtasks, activeSubtaskIndex);

    if (nextIndex === -1) {
      console.log('✅ All tasks completed! Exiting focus mode.');
      get().exitFocusMode();
      return;
    }

    const nextSubtask = subtasks[nextIndex];

    // ✅ Check if next subtask is a parent (after completing all atomic children)
    const isParent = nextSubtask.isComposite &&
      findAtomicChildren(subtasks, nextSubtask.id).every(child => child.isCompleted);

    console.log(`➡️  [Next] ${nextSubtask.title} (${isParent ? 'PARENT - Show confirmation' : 'Continue'})`);

    set({
      activeSubtaskIndex: nextIndex,
      isTimerRunning: false,
      currentTimeLeft: 0,
      isParentSubtaskView: isParent, // ✅ Flag for UI to show "Next Subtask" button
      accumulatedFocusTime: newAccumulatedTime,
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

  addFocusTime: (minutes: number) => {
    // ✅ Call gamification store to check for level up
    const { addFocusTime: gamificationAddFocusTime } = useGamificationStore.getState();
    gamificationAddFocusTime(minutes);
    console.log(`📊 [Coach Store] Added ${minutes} minutes of focus time → Checking for level up`);
  },
}));
