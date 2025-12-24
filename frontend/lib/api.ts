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

// Get sync code from localStorage
function getSyncCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('syncCode');
}

// Set sync code in localStorage
export function setSyncCode(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('syncCode', code);
}

// Common headers for API requests
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-device-token': getDeviceToken(),
  };

  const syncCode = getSyncCode();
  if (syncCode) {
    headers['x-sync-code'] = syncCode;
  }

  return headers;
}

// API Client
export const api = {
  // Tasks
  async getTasks() {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(title: string, description?: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async updateTask(id: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async deleteTask(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  async addSubtasks(taskId: string, subtasks: string[]) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ subtasks }),
    });
    if (!res.ok) throw new Error('Failed to add subtasks');
    return res.json();
  },

  async toggleSubtask(taskId: string, subtaskId: string) {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle subtask');
    return res.json();
  },

  // AI
  async breakdownTask(taskId: string) {
    const res = await fetch(`${API_BASE_URL}/api/ai/breakdown/${taskId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate AI breakdown');
    return res.json();
  },

  // Sync
  async generateSyncCode() {
    const res = await fetch(`${API_BASE_URL}/api/sync/code`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate sync code');
    const data = await res.json();
    setSyncCode(data.syncCode);
    return data;
  },

  async linkDevice(syncCode: string) {
    const res = await fetch(`${API_BASE_URL}/api/sync/link`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ syncCode }),
    });
    if (!res.ok) throw new Error('Failed to link device');
    const data = await res.json();
    setSyncCode(syncCode);
    return data;
  },

  async getSyncSession() {
    const res = await fetch(`${API_BASE_URL}/api/sync/session`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch sync session');
    return res.json();
  },
};
