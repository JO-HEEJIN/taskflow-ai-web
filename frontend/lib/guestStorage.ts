import { Task, TaskStatus, Subtask, AISubtaskSuggestion } from '../types';
import { v4 as uuidv4 } from 'uuid';

// LocalStorage keys
const GUEST_ID_KEY = 'guest_id';
const GUEST_TASKS_KEY = 'guest_tasks';
const GUEST_MODE_KEY = 'guest_mode';

/**
 * Guest Storage Service
 * Manages task data in localStorage for unauthenticated users
 */
export const guestStorage = {
  /**
   * Initialize guest mode
   */
  initialize(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(GUEST_ID_KEY)) {
      localStorage.setItem(GUEST_ID_KEY, uuidv4());
      localStorage.setItem(GUEST_MODE_KEY, 'true');
      localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify([]));
      console.log('✅ Guest mode initialized');
    }
  },

  /**
   * Get guest user ID
   */
  getGuestId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(GUEST_ID_KEY);
  },

  /**
   * Check if in guest mode
   */
  isGuestMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(GUEST_MODE_KEY) === 'true';
  },

  /**
   * Get all tasks from localStorage
   */
  getAllTasks(): Task[] {
    if (typeof window === 'undefined') return [];

    try {
      const tasksJson = localStorage.getItem(GUEST_TASKS_KEY);
      if (!tasksJson) return [];

      const tasks = JSON.parse(tasksJson);
      return tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      }));
    } catch (error) {
      console.error('Error loading guest tasks:', error);
      return [];
    }
  },

  /**
   * Save tasks to localStorage
   */
  saveTasks(tasks: Task[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving guest tasks:', error);
      if ((error as any).name === 'QuotaExceededError') {
        alert('Storage full. Please sign in to sync your tasks to the cloud.');
      }
    }
  },

  /**
   * Create a new task
   */
  createTask(title: string, description?: string): Task {
    const tasks = this.getAllTasks();
    const guestId = this.getGuestId() || 'guest';

    const newTask: Task = {
      id: uuidv4(),
      title,
      description,
      status: TaskStatus.PENDING,
      progress: 0,
      subtasks: [],
      syncCode: guestId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.push(newTask);
    this.saveTasks(tasks);

    console.log('✅ Guest task created:', newTask.id);
    return newTask;
  },

  /**
   * Update a task
   */
  updateTask(id: string, updates: Partial<Task>): Task | null {
    const tasks = this.getAllTasks();
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      console.error('Task not found:', id);
      return null;
    }

    const updatedTask = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date(),
    };

    tasks[taskIndex] = updatedTask;
    this.saveTasks(tasks);

    console.log('✅ Guest task updated:', id);
    return updatedTask;
  },

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    const tasks = this.getAllTasks();
    const filteredTasks = tasks.filter((t) => t.id !== id);

    if (filteredTasks.length === tasks.length) {
      console.error('Task not found:', id);
      return false;
    }

    this.saveTasks(filteredTasks);
    console.log('✅ Guest task deleted:', id);
    return true;
  },

  /**
   * Get a single task by ID
   */
  getTask(id: string): Task | null {
    const tasks = this.getAllTasks();
    return tasks.find((t) => t.id === id) || null;
  },

  /**
   * Add subtasks to a task
   */
  addSubtasks(taskId: string, subtaskData: (string | AISubtaskSuggestion)[]): Task | null {
    const task = this.getTask(taskId);
    if (!task) return null;

    const newSubtasks: Subtask[] = subtaskData.map((data, index) => {
      const isString = typeof data === 'string';
      return {
        id: uuidv4(),
        title: isString ? data : data.title,
        isCompleted: false,
        isArchived: false,
        parentTaskId: taskId,
        order: task.subtasks.length + (isString ? index : (data.order ?? index)),
        estimatedMinutes: isString ? 5 : (data.estimatedMinutes || 5),
        stepType: isString ? 'mental' as const : (data.stepType || 'mental'),
      };
    });

    const updatedTask = {
      ...task,
      subtasks: [...task.subtasks, ...newSubtasks],
      updatedAt: new Date(),
    };

    return this.updateTask(taskId, updatedTask);
  },

  /**
   * Toggle subtask completion
   */
  toggleSubtask(taskId: string, subtaskId: string): Task | null {
    const task = this.getTask(taskId);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    // Calculate progress
    const completedCount = updatedSubtasks.filter((st) => st.isCompleted && !st.isArchived).length;
    const totalCount = updatedSubtasks.filter((st) => !st.isArchived).length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Auto-update status
    let status = task.status;
    if (progress === 100) {
      status = TaskStatus.COMPLETED;
    } else if (progress > 0 && status === TaskStatus.PENDING) {
      status = TaskStatus.IN_PROGRESS;
    }

    return this.updateTask(taskId, {
      subtasks: updatedSubtasks,
      progress,
      status,
    });
  },

  /**
   * Delete a subtask
   */
  deleteSubtask(taskId: string, subtaskId: string): Task | null {
    const task = this.getTask(taskId);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId);

    // Recalculate progress
    const completedCount = updatedSubtasks.filter((st) => st.isCompleted && !st.isArchived).length;
    const totalCount = updatedSubtasks.filter((st) => !st.isArchived).length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return this.updateTask(taskId, {
      subtasks: updatedSubtasks,
      progress,
    });
  },

  /**
   * Reorder subtasks
   */
  reorderSubtasks(taskId: string, subtaskOrders: { id: string; order: number }[]): Task | null {
    const task = this.getTask(taskId);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.map((st) => {
      const newOrder = subtaskOrders.find((so) => so.id === st.id);
      return newOrder ? { ...st, order: newOrder.order } : st;
    });

    return this.updateTask(taskId, {
      subtasks: updatedSubtasks,
    });
  },

  /**
   * Archive/unarchive a subtask
   */
  archiveSubtask(taskId: string, subtaskId: string, archived: boolean): Task | null {
    const task = this.getTask(taskId);
    if (!task) return null;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isArchived: archived } : st
    );

    // Recalculate progress (excluding archived subtasks)
    const completedCount = updatedSubtasks.filter((st) => st.isCompleted && !st.isArchived).length;
    const totalCount = updatedSubtasks.filter((st) => !st.isArchived).length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return this.updateTask(taskId, {
      subtasks: updatedSubtasks,
      progress,
    });
  },

  /**
   * Create a linked task from a subtask
   */
  createLinkedTask(title: string, description: string | undefined, sourceSubtaskId: string): { task: Task; parentTask: Task | null } {
    const newTask = this.createTask(title, description);
    newTask.sourceSubtaskId = sourceSubtaskId;

    // Find parent task and update the subtask with linkedTaskId
    const tasks = this.getAllTasks();
    const parentTask = tasks.find((t) =>
      t.subtasks.some((st) => st.id === sourceSubtaskId)
    );

    if (parentTask) {
      const updatedSubtasks = parentTask.subtasks.map((st) =>
        st.id === sourceSubtaskId ? { ...st, linkedTaskId: newTask.id } : st
      );

      const updated = this.updateTask(parentTask.id, { subtasks: updatedSubtasks });
      return { task: newTask, parentTask: updated };
    }

    return { task: newTask, parentTask: null };
  },

  /**
   * Clear all guest data (called after successful migration)
   */
  clearGuestData(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(GUEST_ID_KEY);
    localStorage.removeItem(GUEST_TASKS_KEY);
    localStorage.removeItem(GUEST_MODE_KEY);

    console.log('✅ Guest data cleared');
  },

  /**
   * Get task count for display
   */
  getTaskCount(): number {
    return this.getAllTasks().length;
  },
};
