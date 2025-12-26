// API Client for TaskFlow AI Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

// Get sync code from localStorage or generate new one
async function getSyncCode(): Promise<string> {
  if (typeof window === 'undefined') return '';

  let code = localStorage.getItem('syncCode');
  if (!code) {
    // Auto-generate sync code on first visit
    try {
      const res = await fetch(`${API_BASE_URL}/api/sync/code`, {
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': getDeviceToken(),
        },
      });
      const data = await res.json();
      code = data.syncCode;
      localStorage.setItem('syncCode', code);
    } catch (error) {
      console.error('Failed to generate sync code:', error);
      // Fallback: generate random code locally
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('syncCode', code);
    }
  }
  return code;
}

// Set sync code in localStorage
export function setSyncCode(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('syncCode', code);
}

// Common headers for API requests
async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-device-token': getDeviceToken(),
  };

  const syncCode = await getSyncCode();
  headers['x-sync-code'] = syncCode;

  return headers;
}

// API Client
export const api = {
  // Tasks
  async getTasks() {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(title: string, description?: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async createLinkedTask(title: string, sourceSubtaskId: string, description?: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/linked`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ title, description, sourceSubtaskId }),
    });
    if (!res.ok) throw new Error('Failed to create linked task');
    return res.json();
  },

  async updateTask(id: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async deleteTask(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  async addSubtasks(taskId: string, subtasks: string[]) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ subtasks }),
    });
    if (!res.ok) throw new Error('Failed to add subtasks');
    return res.json();
  },

  async toggleSubtask(taskId: string, subtaskId: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle subtask');
    return res.json();
  },

  async deleteSubtask(taskId: string, subtaskId: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete subtask');
    return res.json();
  },

  async reorderSubtasks(taskId: string, subtaskOrders: { id: string; order: number }[]) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/reorder`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ subtaskOrders }),
    });
    if (!res.ok) throw new Error('Failed to reorder subtasks');
    return res.json();
  },

  async archiveSubtask(taskId: string, subtaskId: string, archived: boolean) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}/archive`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ archived }),
    });
    if (!res.ok) throw new Error('Failed to archive subtask');
    return res.json();
  },

  // AI
  async breakdownTask(taskId: string) {
    const res = await fetch(`${API_BASE_URL}/api/ai/breakdown/${taskId}`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate AI breakdown');
    return res.json();
  },

  // Sync
  async generateSyncCode() {
    const res = await fetch(`${API_BASE_URL}/api/sync/code`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate sync code');
    const data = await res.json();
    setSyncCode(data.syncCode);
    return data;
  },

  async linkDevice(syncCode: string) {
    const res = await fetch(`${API_BASE_URL}/api/sync/link`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ syncCode }),
    });
    if (!res.ok) throw new Error('Failed to link device');
    const data = await res.json();
    setSyncCode(syncCode);
    return data;
  },

  async getSyncSession() {
    const res = await fetch(`${API_BASE_URL}/api/sync/session`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch sync session');
    return res.json();
  },

  // Orphaned tasks
  async getOrphanedTasks() {
    const res = await fetch(`${API_BASE_URL}/api/tasks/orphaned/detect`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get orphaned tasks');
    return res.json();
  },

  async deleteBatchTasks(taskIds: string[]) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/batch/delete`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ taskIds }),
    });
    if (!res.ok) throw new Error('Failed to delete tasks');
    return res.json();
  },
};
