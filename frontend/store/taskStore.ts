import { create } from 'zustand';
import { Task, AISubtaskSuggestion } from '@/types';
import { api } from '@/lib/api';

interface TaskStore {
  tasks: Task[];
  deletedTasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (title: string, description?: string) => Promise<void>;
  createTaskWithAutoFocus: (title: string, description?: string) => Promise<string | null>;
  createLinkedTask: (parentTaskId: string, subtaskId: string, subtaskTitle: string) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (id: string, status: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteAllTasks: () => Promise<void>;
  fetchDeletedTasks: () => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  permanentDeleteTask: (id: string) => Promise<void>;
  addSubtasks: (taskId: string, subtasks: (string | AISubtaskSuggestion)[]) => Promise<void>;
  addChildrenToSubtask: (taskId: string, subtaskId: string, children: any[], timestamp?: number) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  toggleChildSubtask: (taskId: string, childId: string) => void; // Client-only toggle for focus mode children
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  reorderSubtasks: (taskId: string, subtaskOrders: { id: string; order: number }[]) => Promise<void>;
  archiveSubtask: (taskId: string, subtaskId: string, archived: boolean) => Promise<void>;
  approveBreakdown: (taskId: string) => Promise<void>;
  deepDiveBreakdown: (taskId: string, subtaskId: string) => Promise<void>;
  generateAIBreakdown: (taskId: string) => Promise<{ suggestions: any[] }>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  deletedTasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { tasks } = await api.getTasks();
      set({ tasks, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createTask: async (title: string, description?: string) => {
    console.log('🔍 taskStore.createTask called with:', { title, description, titleType: typeof title });
    set({ isLoading: true, error: null });
    try {
      const { task } = await api.createTask(title, description);
      console.log('🔍 Received task from API:', { taskId: task.id, title: task.title, titleType: typeof task.title });
      set((state) => ({
        tasks: [...state.tasks, task],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createTaskWithAutoFocus: async (title: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Create task immediately
      const { task } = await api.createTask(title, description);
      set((state) => ({
        tasks: [...state.tasks, task],
        isLoading: false, // ✅ Close modal immediately after task creation
      }));

      console.log('✅ Task created, now generating AI breakdown in background...');

      // Step 2: Generate AI breakdown in BACKGROUND (non-blocking)
      // This happens async so UI is responsive
      (async () => {
        try {
          const result = await api.breakdownTask(task.id, title, description);

          // Step 3: Add subtasks when ready
          if (result.suggestions && result.suggestions.length > 0) {
            const { task: updatedTask } = await api.addSubtasks(task.id, result.suggestions);
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === task.id ? updatedTask : t)),
            }));
            console.log(`✅ AI breakdown complete: ${result.suggestions.length} subtasks added`);
          }
        } catch (bgError) {
          console.error('❌ Background AI breakdown failed:', bgError);
          // Don't throw - task was already created successfully
        }
      })();

      // Return task ID immediately (breakdown happens in background)
      return task.id;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createLinkedTask: async (parentTaskId: string, subtaskId: string, subtaskTitle: string) => {
    set({ isLoading: true, error: null });
    try {
      const title = `Follow-up: ${subtaskTitle}`;
      const { task, parentTask } = await api.createLinkedTask(title, subtaskId);

      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === parentTaskId ? parentTask : t)).concat(task),
        isLoading: false,
      }));

      return task;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      const { task } = await api.updateTask(id, updates);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateTaskStatus: async (id: string, status: string) => {
    try {
      const { task } = await api.updateTask(id, { status: status as any });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteAllTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteAllTasks();
      set({ tasks: [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchDeletedTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { tasks } = await api.getDeletedTasks();
      set({ deletedTasks: tasks, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  restoreTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { task } = await api.restoreTask(id);
      set((state) => ({
        tasks: [...state.tasks, task],
        deletedTasks: state.deletedTasks.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  permanentDeleteTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.permanentDeleteTask(id);
      set((state) => ({
        deletedTasks: state.deletedTasks.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addSubtasks: async (taskId: string, subtasks: (string | AISubtaskSuggestion)[]) => {
    set({ isLoading: true, error: null });
    try {
      const { task } = await api.addSubtasks(taskId, subtasks);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addChildrenToSubtask: async (taskId: string, subtaskId: string, children: any[], timestamp?: number) => {
    const ts = timestamp || Date.now();

    set((state) => {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return state;

      // Find parent subtask - could be a real subtask or a synthetic child ID
      const parentIndex = task.subtasks.findIndex(st => st.id === subtaskId);
      const parentSubtask = parentIndex !== -1 ? task.subtasks[parentIndex] : null;

      // Get parent order - if parent found, use its order + 0.5 as base; otherwise use max order
      const baseOrder = parentSubtask
        ? parentSubtask.order
        : Math.max(...task.subtasks.map(st => st.order), 0);

      // Format children as real subtasks with proper order (git-flow style: appear right after parent)
      // Inherit strategyTag from parent for learning tasks (Traffic Light SRS)
      const formattedChildren = children.map((child, index) => ({
        id: `${subtaskId}-child-${index}-${ts}`,
        title: child.title,
        isCompleted: false,
        isArchived: false,
        parentTaskId: taskId,
        estimatedMinutes: child.estimatedMinutes || 5,
        stepType: child.stepType || 'mental',
        order: baseOrder + 0.01 * (index + 1), // Insert right after parent
        parentSubtaskId: subtaskId,
        // Inherit learning-related fields from parent
        strategyTag: parentSubtask?.strategyTag,
        interactionType: parentSubtask?.interactionType || child.interactionType || 'checkbox',
      }));

      // Build new subtasks array: insert children right after parent
      let newSubtasks;
      if (parentIndex !== -1) {
        // Mark parent as composite
        const updatedParent = { ...task.subtasks[parentIndex], isComposite: true, children: formattedChildren };
        newSubtasks = [
          ...task.subtasks.slice(0, parentIndex),
          updatedParent,
          ...formattedChildren,
          ...task.subtasks.slice(parentIndex + 1),
        ];
      } else {
        // Parent not found (synthetic ID from focusQueue), just append children
        newSubtasks = [...task.subtasks, ...formattedChildren];
      }

      // Re-sort by order and reassign clean integer orders
      newSubtasks.sort((a, b) => a.order - b.order);
      newSubtasks.forEach((st, idx) => {
        st.order = idx;
      });

      return {
        ...state,
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t),
      };
    });
  },

  toggleSubtask: async (taskId: string, subtaskId: string) => {
    try {
      const { task } = await api.toggleSubtask(taskId, subtaskId);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Client-only toggle for focus mode children (not persisted to server)
  toggleChildSubtask: (taskId: string, childId: string) => {
    set((state) => {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return state;

      // Find and toggle the child subtask
      const updatedSubtasks = task.subtasks.map(st => {
        if (st.id === childId) {
          return { ...st, isCompleted: !st.isCompleted };
        }
        return st;
      });

      // Find the parent subtask (child ID format: parentId-child-index-timestamp)
      const childSubtask = updatedSubtasks.find(st => st.id === childId);
      if (childSubtask?.parentSubtaskId) {
        const parentId = childSubtask.parentSubtaskId;

        // Check if all children of this parent are now completed
        const allChildren = updatedSubtasks.filter(st => st.parentSubtaskId === parentId);
        const allChildrenCompleted = allChildren.every(child => child.isCompleted);

        console.log(`📊 [toggleChildSubtask] Parent: ${parentId}, Children completed: ${allChildren.filter(c => c.isCompleted).length}/${allChildren.length}`);

        // If all children completed, mark parent as completed too
        if (allChildrenCompleted && allChildren.length > 0) {
          console.log(`✅ [toggleChildSubtask] All children done! Marking parent as completed`);
          const finalSubtasks = updatedSubtasks.map(st => {
            if (st.id === parentId) {
              return { ...st, isCompleted: true };
            }
            return st;
          });

          return {
            ...state,
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, subtasks: finalSubtasks } : t),
          };
        }
      }

      return {
        ...state,
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t),
      };
    });
  },

  deleteSubtask: async (taskId: string, subtaskId: string) => {
    try {
      const { task } = await api.deleteSubtask(taskId, subtaskId);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  reorderSubtasks: async (taskId: string, subtaskOrders: { id: string; order: number }[]) => {
    try {
      const { task } = await api.reorderSubtasks(taskId, subtaskOrders);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  archiveSubtask: async (taskId: string, subtaskId: string, archived: boolean) => {
    try {
      const { task } = await api.archiveSubtask(taskId, subtaskId, archived);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  approveBreakdown: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { task } = await api.approveBreakdown(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deepDiveBreakdown: async (taskId: string, subtaskId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { task } = await api.deepDiveBreakdown(taskId, subtaskId);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateAIBreakdown: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Find the task to get its title and description
      const task = get().tasks.find(t => t.id === taskId);

      // Pass existing subtasks to avoid duplicates (for "Add More with AI")
      const existingSubtasks = task?.subtasks && task.subtasks.length > 0
        ? task.subtasks.map(st => ({ title: st.title, estimatedMinutes: st.estimatedMinutes }))
        : undefined;

      const result = await api.breakdownTask(taskId, task?.title, task?.description, existingSubtasks);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
