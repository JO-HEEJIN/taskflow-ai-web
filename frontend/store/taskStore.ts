import { create } from 'zustand';
import { Task, AISubtaskSuggestion } from '@/types';
import { api } from '@/lib/api';

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (title: string, description?: string) => Promise<void>;
  createLinkedTask: (parentTaskId: string, subtaskId: string, subtaskTitle: string) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (id: string, status: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addSubtasks: (taskId: string, subtasks: (string | AISubtaskSuggestion)[]) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  reorderSubtasks: (taskId: string, subtaskOrders: { id: string; order: number }[]) => Promise<void>;
  archiveSubtask: (taskId: string, subtaskId: string, archived: boolean) => Promise<void>;
  generateAIBreakdown: (taskId: string) => Promise<{ suggestions: any[] }>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
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
    set({ isLoading: true, error: null });
    try {
      const { task } = await api.createTask(title, description);
      set((state) => ({
        tasks: [...state.tasks, task],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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

  generateAIBreakdown: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Find the task to get its title and description
      const task = get().tasks.find(t => t.id === taskId);
      const result = await api.breakdownTask(taskId, task?.title, task?.description);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
