import { create } from 'zustand';
import { Subtask, NodeContext } from '@/types';
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

// ✅ NEW: Helper to find first incomplete subtask respecting order
// CRITICAL: Process subtasks in order, only drill into atomic children when parent is composite
const findFirstIncompleteAtomicOrSubtask = (subtasks: Subtask[]): number => {
  // Process subtasks in order (by order field)
  const sortedSubtasks = [...subtasks].sort((a, b) => a.order - b.order);

  for (const subtask of sortedSubtasks) {
    if (subtask.isCompleted) continue;

    // Skip atomic tasks that are not yet reached (their parent hasn't been encountered)
    if (subtask.parentSubtaskId) {
      const parent = subtasks.find(st => st.id === subtask.parentSubtaskId);
      if (parent && !parent.isComposite) continue; // Parent not yet processed as composite
    }

    // If this is a composite subtask with atomic children, start with first incomplete atomic child
    if (subtask.isComposite) {
      const atomicChildren = findAtomicChildren(subtasks, subtask.id);
      const incompleteAtomic = atomicChildren
        .sort((a, b) => a.order - b.order)
        .find(child => !child.isCompleted);

      if (incompleteAtomic) {
        return subtasks.indexOf(incompleteAtomic);
      }
    }

    // If this is a regular subtask (not an orphaned atomic task), return it
    if (!subtask.parentSubtaskId) {
      return subtasks.indexOf(subtask);
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

  // If current is a parent subtask (just finished confirming atomic children), find next regular subtask
  if (currentSubtask.isComposite) {
    // Sort all subtasks by order and find next incomplete non-atomic subtask
    const sorted = [...subtasks]
      .filter(st => !st.parentSubtaskId) // Only top-level subtasks (not atomic children)
      .sort((a, b) => a.order - b.order);

    const currentOrderIndex = sorted.findIndex(st => st.id === currentSubtask.id);

    // Find next incomplete subtask after current
    for (let i = currentOrderIndex + 1; i < sorted.length; i++) {
      if (!sorted[i].isCompleted) {
        const nextSubtask = sorted[i];

        // If next subtask is composite, start with its first atomic child
        if (nextSubtask.isComposite) {
          const atomicChildren = findAtomicChildren(subtasks, nextSubtask.id);
          const firstIncomplete = atomicChildren
            .sort((a, b) => a.order - b.order)
            .find(child => !child.isCompleted);

          if (firstIncomplete) {
            return subtasks.indexOf(firstIncomplete);
          }
        }

        // Otherwise return the regular subtask
        return subtasks.indexOf(nextSubtask);
      }
    }
  }

  // Otherwise, find next incomplete task using original logic
  return findFirstIncompleteAtomicOrSubtask(subtasks);
};

interface CoachState {
  isFocusMode: boolean;
  activeTaskId: string | null;
  activeSubtaskIndex: number;
  focusQueue: Subtask[]; // The actual queue of subtasks being focused on (can be children)
  isTimerRunning: boolean;
  currentTimeLeft: number; // seconds
  endTime?: number; // Unix timestamp in ms
  isPiPActive: boolean; // Picture-in-Picture window active
  showBreakScreen: boolean; // Show full-screen break screen after timer completion
  messages: Message[];
  accumulatedFocusTime: number; // ✅ NEW: Total focused minutes (for level up)
  isParentSubtaskView: boolean; // ✅ NEW: True when showing parent after atomic tasks complete

  // Actions
  enterFocusMode: (taskId: string, subtasks: Subtask[], context?: NodeContext) => void;
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
  focusQueue: [], // The actual queue being iterated
  isTimerRunning: false,
  currentTimeLeft: 0,
  endTime: undefined,
  isPiPActive: false,
  showBreakScreen: false,
  messages: [],
  accumulatedFocusTime: 0, // ✅ NEW
  isParentSubtaskView: false, // ✅ NEW

  enterFocusMode: (taskId: string, subtasks: Subtask[], context?: NodeContext) => {
    // ✅ Filter subtasks based on click context (Orion's Belt Perspective)
    let filteredSubtasks = subtasks;

    if (context?.type === 'subtask') {
      // Only show clicked subtask + its atomics (if any)
      const target = subtasks.find(st => st.id === context.subtaskId);
      if (target) {
        if (target.children && target.children.length > 0) {
          // Start with atomic children
          filteredSubtasks = target.children;
        } else {
          // Single subtask only
          filteredSubtasks = [target];
        }
      }
    } else if (context?.type === 'atomic') {
      // Only show clicked atomic task
      const atomic = subtasks.find(st => st.id === context.atomicId);
      filteredSubtasks = atomic ? [atomic] : subtasks;
    }

    // ✅ Find first incomplete atomic task or regular subtask
    const firstIncompleteIndex = findFirstIncompleteAtomicOrSubtask(filteredSubtasks);

    if (firstIncompleteIndex === -1) {
      console.log('All subtasks already completed');
      return;
    }

    const firstSubtask = filteredSubtasks[firstIncompleteIndex];
    console.log(`🎯 [Focus Mode] Starting with: ${firstSubtask.title} (${firstSubtask.estimatedMinutes || 5}min)`);
    console.log(`📍 [Context] Type: ${context?.type || 'full'}, Filtered: ${filteredSubtasks.length}/${subtasks.length} subtasks`);

    set({
      isFocusMode: true,
      activeTaskId: taskId,
      activeSubtaskIndex: firstIncompleteIndex,
      focusQueue: filteredSubtasks, // Store the actual queue (can be children)
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
      focusQueue: [], // Reset queue
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
    const { activeSubtaskIndex, accumulatedFocusTime, focusQueue } = get();
    const currentSubtask = subtasks[activeSubtaskIndex];

    // ✅ Track accumulated focus time
    const newAccumulatedTime = accumulatedFocusTime + focusedMinutes;
    console.log(`⏱️  [Focus Time] Completed ${currentSubtask.title}: +${focusedMinutes}min (Total: ${newAccumulatedTime}min)`);

    // ✅ Call addFocusTime to check for level up
    get().addFocusTime(focusedMinutes);

    // ✅ CRITICAL: Mark current subtask as completed in the local array
    // This is needed because focusQueue is a copy that doesn't auto-update
    const updatedSubtasks = subtasks.map((st, idx) =>
      idx === activeSubtaskIndex ? { ...st, isCompleted: true } : st
    );

    // ✅ Also update focusQueue if it's being used
    const updatedFocusQueue = focusQueue.length > 0
      ? focusQueue.map((st, idx) => idx === activeSubtaskIndex ? { ...st, isCompleted: true } : st)
      : [];

    // ✅ Find next subtask using updated array
    const nextIndex = findNextAfterCompletion(updatedSubtasks, activeSubtaskIndex);

    if (nextIndex === -1) {
      console.log('✅ All tasks completed! Exiting focus mode.');
      get().exitFocusMode();
      return;
    }

    const nextSubtask = updatedSubtasks[nextIndex];

    // ✅ Check if next subtask is a parent (after completing all atomic children)
    const isParent = nextSubtask.isComposite &&
      findAtomicChildren(updatedSubtasks, nextSubtask.id).every(child => child.isCompleted);

    console.log(`➡️  [Next] ${nextSubtask.title} (${isParent ? 'PARENT - Show confirmation' : 'Continue'})`);

    set({
      activeSubtaskIndex: nextIndex,
      focusQueue: updatedFocusQueue.length > 0 ? updatedFocusQueue : focusQueue, // ✅ Persist completed state
      isTimerRunning: false,
      currentTimeLeft: 0,
      isParentSubtaskView: isParent,
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
