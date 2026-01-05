// API Client for TaskFlow AI Backend
import { guestStorage } from './guestStorage';
import { AISubtaskSuggestion } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Check if user is in guest mode
function isGuestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem('userId');
}

// Get device token from localStorage or generate new one
function getDeviceToken(): string {
  if (typeof window === 'undefined') return '';

  let token = localStorage.getItem('deviceToken');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('deviceToken', token);
  }
  return token;
}

// Get user ID from localStorage (set by auth)
function getUserId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userId') || '';
}

// Set user ID in localStorage
export function setUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('userId', userId);
}

// Common headers for API requests
async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-device-token': getDeviceToken(),
  };

  const userId = getUserId();
  if (userId) {
    headers['x-user-id'] = userId;
  }

  return headers;
}

// API Client
export const api = {
  // Tasks
  async getTasks() {
    if (isGuestMode()) {
      return { tasks: guestStorage.getAllTasks() };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(title: string, description?: string) {
    if (isGuestMode()) {
      const task = guestStorage.createTask(title, description);
      return { task };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async createLinkedTask(title: string, sourceSubtaskId: string, description?: string) {
    if (isGuestMode()) {
      return guestStorage.createLinkedTask(title, description, sourceSubtaskId);
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/linked`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ title, description, sourceSubtaskId }),
    });
    if (!res.ok) throw new Error('Failed to create linked task');
    return res.json();
  },

  async updateTask(id: string, updates: any) {
    if (isGuestMode()) {
      const task = guestStorage.updateTask(id, updates);
      return { task };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async deleteTask(id: string) {
    if (isGuestMode()) {
      guestStorage.deleteTask(id);
      return { message: 'Task deleted successfully' };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  async addSubtasks(taskId: string, subtasks: (string | AISubtaskSuggestion)[]) {
    if (isGuestMode()) {
      const task = guestStorage.addSubtasks(taskId, subtasks);
      return { task };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ subtasks }),
    });
    if (!res.ok) throw new Error('Failed to add subtasks');
    return res.json();
  },

  async toggleSubtask(taskId: string, subtaskId: string) {
    if (isGuestMode()) {
      const task = guestStorage.toggleSubtask(taskId, subtaskId);
      return { task };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle subtask');
    return res.json();
  },

  async deleteSubtask(taskId: string, subtaskId: string) {
    if (isGuestMode()) {
      const task = guestStorage.deleteSubtask(taskId, subtaskId);
      return { task };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete subtask');
    return res.json();
  },

  async reorderSubtasks(taskId: string, subtaskOrders: { id: string; order: number }[]) {
    if (isGuestMode()) {
      const task = guestStorage.reorderSubtasks(taskId, subtaskOrders);
      return { task };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/reorder`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ subtaskOrders }),
    });
    if (!res.ok) throw new Error('Failed to reorder subtasks');
    return res.json();
  },

  async archiveSubtask(taskId: string, subtaskId: string, archived: boolean) {
    if (isGuestMode()) {
      const task = guestStorage.archiveSubtask(taskId, subtaskId, archived);
      return { task };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}/archive`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ archived }),
    });
    if (!res.ok) throw new Error('Failed to archive subtask');
    return res.json();
  },

  async approveBreakdown(taskId: string) {
    if (isGuestMode()) {
      // For guest mode, manually transition subtasks from draft to active
      const task = guestStorage.getTask(taskId);
      if (!task) throw new Error('Task not found');

      const updatedTask = guestStorage.updateTask(taskId, {
        subtasks: task.subtasks.map(st => ({
          ...st,
          status: st.status === 'draft' ? 'active' : st.status
        }))
      });
      return { task: updatedTask };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/approve-breakdown`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to approve breakdown');
    return res.json();
  },

  async deepDiveBreakdown(taskId: string, subtaskId: string) {
    if (isGuestMode()) {
      // Guest mode: Generate atomic tasks and flatten into main subtasks array
      const task = guestStorage.getTask(taskId);
      if (!task) throw new Error('Task not found');

      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (!subtask) throw new Error('Subtask not found');

      // Create atomic tasks with "Atomic: " prefix
      const atomicTasks = [
        { id: crypto.randomUUID(), title: `Atomic: ${subtask.title} - Part 1`, estimatedMinutes: 3, isCompleted: false, isArchived: false, order: task.subtasks.length, parentTaskId: taskId, parentSubtaskId: subtaskId, depth: 1, isComposite: false, children: [], status: 'draft' },
        { id: crypto.randomUUID(), title: `Atomic: ${subtask.title} - Part 2`, estimatedMinutes: 4, isCompleted: false, isArchived: false, order: task.subtasks.length + 1, parentTaskId: taskId, parentSubtaskId: subtaskId, depth: 1, isComposite: false, children: [], status: 'draft' },
        { id: crypto.randomUUID(), title: `Atomic: ${subtask.title} - Part 3`, estimatedMinutes: 3, isCompleted: false, isArchived: false, order: task.subtasks.length + 2, parentTaskId: taskId, parentSubtaskId: subtaskId, depth: 1, isComposite: false, children: [], status: 'draft' },
      ];

      // Mark parent as composite and add atomic tasks to main subtasks array
      const updatedSubtasks = [
        ...task.subtasks.map(st =>
          st.id === subtaskId ? { ...st, isComposite: true, children: atomicTasks } : st
        ),
        ...atomicTasks // Flatten atomic tasks into main array
      ];

      const updatedTask = guestStorage.updateTask(taskId, { subtasks: updatedSubtasks });
      return { task: updatedTask, childrenCount: atomicTasks.length };
    }

    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}/deep-dive`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to perform deep dive');
    return res.json();
  },

  // AI
  async breakdownTask(
    taskId: string,
    title?: string,
    description?: string,
    existingSubtasks?: Array<{ title: string; estimatedMinutes?: number }>
  ) {
    const headers = await getHeaders();

    // Guest mode: send task data in body (including existing subtasks to avoid duplicates)
    if (isGuestMode() && title) {
      const res = await fetch(`${API_BASE_URL}/api/ai/breakdown/${taskId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description, existingSubtasks }),
      });
      if (!res.ok) throw new Error('Failed to generate AI breakdown');
      return res.json();
    }

    // Authenticated mode: backend fetches task from DB (already handles existingSubtasks)
    const res = await fetch(`${API_BASE_URL}/api/ai/breakdown/${taskId}`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) throw new Error('Failed to generate AI breakdown');
    return res.json();
  },

  async generateEncouragement(
    completedSubtask: { title: string; estimatedMinutes?: number },
    nextSubtask: { title: string; estimatedMinutes?: number } | null,
    progress: { completed: number; total: number }
  ) {
    const res = await fetch(`${API_BASE_URL}/api/ai/encourage`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ completedSubtask, nextSubtask, progress }),
    });
    if (!res.ok) throw new Error('Failed to generate encouragement');
    return res.json();
  },

  async chatWithCoach(
    message: string,
    taskTitle?: string,
    subtaskTitle?: string,
    conversationHistory?: Array<{ role: 'user' | 'ai'; content: string }>
  ) {
    const res = await fetch(`${API_BASE_URL}/api/ai/coach`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ message, taskTitle, subtaskTitle, conversationHistory }),
    });
    if (!res.ok) throw new Error('Failed to chat with coach');
    return res.json();
  },

  // Images
  async uploadImage(file: File) {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_BASE_URL}/api/images/upload`, {
      method: 'POST',
      headers: {
        'x-device-token': getDeviceToken(),
        'x-user-id': userId,
      },
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to upload image');
    return res.json();
  },

  // Orphaned tasks
  async getOrphanedTasks() {
    if (isGuestMode()) {
      // Guest mode doesn't support orphaned task detection (requires backend)
      return { orphanedTasks: [] };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/orphaned/detect`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get orphaned tasks');
    return res.json();
  },

  async deleteBatchTasks(taskIds: string[]) {
    if (isGuestMode()) {
      // Delete tasks locally
      taskIds.forEach((id) => guestStorage.deleteTask(id));
      return { success: true, deletedCount: taskIds.length };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/batch/delete`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ taskIds }),
    });
    if (!res.ok) throw new Error('Failed to delete tasks');
    return res.json();
  },
};
