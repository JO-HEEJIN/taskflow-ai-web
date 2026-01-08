import { create } from 'zustand';
import { Subtask, NodeContext, LearningStrategy } from '@/types';
import { useGamificationStore } from './useGamificationStore'; // ✅ NEW: Import gamification store
import { loadChatHistory, saveChatHistory, clearChatHistory as clearStoredChat, pruneOldChats } from '@/utils/chatStorage';

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

// ✅ Helper to find children of a parent subtask (by parentSubtaskId)
const findChildrenOfParent = (subtasks: Subtask[], parentSubtaskId: string): Subtask[] => {
  return subtasks.filter(st => st.parentSubtaskId === parentSubtaskId);
};

// Find all children of a parent (by parentSubtaskId, no title prefix requirement)
const findAtomicChildren = (subtasks: Subtask[], parentSubtaskId: string): Subtask[] => {
  return subtasks.filter(st => st.parentSubtaskId === parentSubtaskId);
};

// ✅ NEW: Helper to find first incomplete subtask respecting order
// CRITICAL: Process subtasks in order, only drill into atomic children when parent is composite
const findFirstIncompleteAtomicOrSubtask = (subtasks: Subtask[]): number => {
  // Special case: If queue only contains atomic tasks (from direct click), return first incomplete
  const hasOnlyAtomics = subtasks.every(st => st.parentSubtaskId || st.title.startsWith('Atomic:'));
  if (hasOnlyAtomics) {
    const firstIncomplete = subtasks.findIndex(st => !st.isCompleted);
    if (firstIncomplete !== -1) {
      return firstIncomplete;
    }
  }

  // Process subtasks in order (by order field)
  const sortedSubtasks = [...subtasks].sort((a, b) => a.order - b.order);

  for (const subtask of sortedSubtasks) {
    if (subtask.isCompleted) continue;

    // Skip atomic tasks that are not yet reached (their parent hasn't been encountered)
    // BUT only if parent is actually in this queue
    if (subtask.parentSubtaskId) {
      const parent = subtasks.find(st => st.id === subtask.parentSubtaskId);
      // Only skip if parent exists in queue AND is not composite
      if (parent && !parent.isComposite) continue;
      // If parent is not in queue (direct atomic click), allow this atomic
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

    // Return this subtask (either regular subtask or directly clicked atomic)
    // The condition now allows atomic tasks when clicked directly
    if (!subtask.parentSubtaskId) {
      return subtasks.indexOf(subtask);
    }

    // Also return atomic tasks that were directly selected (parent not in queue)
    const parentInQueue = subtasks.find(st => st.id === subtask.parentSubtaskId);
    if (!parentInQueue) {
      return subtasks.indexOf(subtask);
    }
  }

  return -1;
};

// ✅ NEW: Helper to find next subtask after completing current atomic/subtask
const findNextAfterCompletion = (subtasks: Subtask[], currentIndex: number): number => {
  const currentSubtask = subtasks[currentIndex];

  // If current is a child subtask (has parentSubtaskId), find next sibling or parent
  if (currentSubtask.parentSubtaskId) {
    const parentId = currentSubtask.parentSubtaskId;
    const siblings = findChildrenOfParent(subtasks, parentId)
      .sort((a, b) => a.order - b.order);
    const currentSiblingIndex = siblings.findIndex(s => s.id === currentSubtask.id);

    // Find next incomplete sibling
    for (let i = currentSiblingIndex + 1; i < siblings.length; i++) {
      if (!siblings[i].isCompleted) {
        return subtasks.indexOf(siblings[i]);
      }
    }

    // All siblings completed, return parent subtask (for confirmation screen)
    const parentIndex = subtasks.findIndex(st => st.id === parentId);
    if (parentIndex !== -1 && !subtasks[parentIndex].isCompleted) {
      return parentIndex;
    }
  }

  // If current is a parent subtask (just finished confirming children), find next regular subtask
  if (currentSubtask.isComposite) {
    // Sort all subtasks by order and find next incomplete non-child subtask
    const sorted = [...subtasks]
      .filter(st => !st.parentSubtaskId) // Only top-level subtasks (not children)
      .sort((a, b) => a.order - b.order);

    const currentOrderIndex = sorted.findIndex(st => st.id === currentSubtask.id);

    // Find next incomplete subtask after current
    for (let i = currentOrderIndex + 1; i < sorted.length; i++) {
      if (!sorted[i].isCompleted) {
        const nextSubtask = sorted[i];

        // If next subtask is composite, start with its first incomplete child
        if (nextSubtask.isComposite) {
          const children = findChildrenOfParent(subtasks, nextSubtask.id)
            .sort((a, b) => a.order - b.order);
          const firstIncomplete = children.find(child => !child.isCompleted);

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

  // Learning Engine state
  isLearningMode: boolean; // True when current task is a learning task
  currentLearningStrategy?: LearningStrategy; // Active learning strategy for current subtask
  interleaveStartTime?: number; // Unix timestamp when user started this topic
  showInterleavePopup: boolean; // Show popup suggesting topic switch

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

  // Learning Engine actions
  setLearningMode: (enabled: boolean, strategy?: LearningStrategy) => void;
  checkInterleaveBreak: () => boolean; // Returns true if 25+ min elapsed
  dismissInterleavePopup: () => void;
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

  // Learning Engine initial state
  isLearningMode: false,
  currentLearningStrategy: undefined,
  interleaveStartTime: undefined,
  showInterleavePopup: false,

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

    // ✅ Load persisted chat history from localStorage
    const persistedMessages = loadChatHistory(taskId);
    const messages = persistedMessages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp), // Convert ISO string back to Date
    }));

    if (messages.length > 0) {
      console.log(`💬 [Chat] Loaded ${messages.length} persisted messages for task ${taskId}`);
    }

    // ✅ Detect learning mode based on first subtask's strategyTag
    const isLearningTask = !!firstSubtask.strategyTag;
    if (isLearningTask) {
      console.log(`📚 [Learning Mode] Detected learning task with strategy: ${firstSubtask.strategyTag}`);
    }

    set({
      isFocusMode: true,
      activeTaskId: taskId,
      activeSubtaskIndex: firstIncompleteIndex,
      focusQueue: filteredSubtasks, // Store the actual queue (can be children)
      isTimerRunning: false,
      currentTimeLeft: 0,
      messages, // ✅ Load persisted messages instead of empty array
      isParentSubtaskView: false, // Start with atomic/regular task, not parent
      // Learning Engine state
      isLearningMode: isLearningTask,
      currentLearningStrategy: firstSubtask.strategyTag,
      interleaveStartTime: isLearningTask ? Date.now() : undefined,
      showInterleavePopup: false,
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
      // Learning Engine reset
      isLearningMode: false,
      currentLearningStrategy: undefined,
      interleaveStartTime: undefined,
      showInterleavePopup: false,
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

    // ✅ Use focusQueue from zustand (always latest) if available, otherwise use passed subtasks
    const actualSubtasks = focusQueue.length > 0 ? focusQueue : subtasks;
    const currentSubtask = actualSubtasks[activeSubtaskIndex];

    if (!currentSubtask) {
      console.error('❌ No current subtask found at index', activeSubtaskIndex);
      return;
    }

    // ✅ Track accumulated focus time
    const newAccumulatedTime = accumulatedFocusTime + focusedMinutes;
    console.log(`⏱️  [Focus Time] Completed ${currentSubtask.title}: +${focusedMinutes}min (Total: ${newAccumulatedTime}min)`);

    // ✅ Call addFocusTime to check for level up
    get().addFocusTime(focusedMinutes);

    // ✅ CRITICAL: Mark current subtask as completed in the local array
    // Use actualSubtasks (from zustand) to preserve previous completion states
    const updatedSubtasks = actualSubtasks.map((st, idx) =>
      idx === activeSubtaskIndex ? { ...st, isCompleted: true } : st
    );

    // ✅ updatedFocusQueue is the same as updatedSubtasks when using focusQueue
    const updatedFocusQueue = focusQueue.length > 0 ? updatedSubtasks : [];

    // ✅ Find next subtask using updated array
    const nextIndex = findNextAfterCompletion(updatedSubtasks, activeSubtaskIndex);

    if (nextIndex === -1) {
      console.log('✅ All tasks completed! Exiting focus mode.');
      get().exitFocusMode();
      return;
    }

    const nextSubtask = updatedSubtasks[nextIndex];

    // ✅ Check if next subtask is a parent (after completing all children)
    // For "Break Down Further" focus queue, parent has children array directly
    // For regular flow, check via parentSubtaskId relationship
    const childrenFromParent = nextSubtask.children || [];
    const childrenFromSubtasks = findChildrenOfParent(updatedSubtasks, nextSubtask.id);
    const allChildren = childrenFromParent.length > 0 ? childrenFromParent : childrenFromSubtasks;

    const isParent = nextSubtask.isComposite && allChildren.length > 0 &&
      allChildren.every(child => {
        // Check if child is completed in updatedSubtasks (by ID match)
        const subtaskInQueue = updatedSubtasks.find(s => s.id === child.id);
        return subtaskInQueue?.isCompleted || child.isCompleted;
      });

    console.log(`➡️  [Next] ${nextSubtask.title.substring(0, 30)} (${isParent ? 'PARENT' : 'Continue'})`);

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
    const { activeTaskId, messages } = get();
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newMessage];
    set({ messages: updatedMessages });

    // ✅ Persist to localStorage if we have an active task
    if (activeTaskId) {
      saveChatHistory(activeTaskId, updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })));
    }
  },

  clearMessages: () => {
    const { activeTaskId } = get();
    set({ messages: [] });

    // ✅ Also clear from localStorage
    if (activeTaskId) {
      clearStoredChat(activeTaskId);
      console.log(`🗑️  [Chat] Cleared chat history for task ${activeTaskId}`);
    }
  },

  addFocusTime: (minutes: number) => {
    // ✅ Call gamification store to check for level up
    const { addFocusTime: gamificationAddFocusTime } = useGamificationStore.getState();
    gamificationAddFocusTime(minutes);
    console.log(`📊 [Coach Store] Added ${minutes} minutes of focus time → Checking for level up`);
  },

  // Learning Engine actions
  setLearningMode: (enabled: boolean, strategy?: LearningStrategy) => {
    set({
      isLearningMode: enabled,
      currentLearningStrategy: strategy,
      interleaveStartTime: enabled ? Date.now() : undefined,
      showInterleavePopup: false,
    });
    console.log(`📚 [Learning Mode] ${enabled ? 'Enabled' : 'Disabled'}${strategy ? ` with strategy: ${strategy}` : ''}`);
  },

  checkInterleaveBreak: () => {
    const { interleaveStartTime, isLearningMode } = get();

    if (!isLearningMode || !interleaveStartTime) {
      return false;
    }

    const elapsedMinutes = (Date.now() - interleaveStartTime) / (1000 * 60);
    const shouldInterleave = elapsedMinutes >= 25;

    if (shouldInterleave) {
      set({ showInterleavePopup: true });
      console.log(`🔄 [Interleaving] ${Math.round(elapsedMinutes)}min elapsed - suggesting topic switch`);
    }

    return shouldInterleave;
  },

  dismissInterleavePopup: () => {
    set({
      showInterleavePopup: false,
      interleaveStartTime: Date.now(), // Reset timer after dismissing
    });
    console.log('🔄 [Interleaving] Popup dismissed, timer reset');
  },
}));
