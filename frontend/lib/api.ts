// API Client for TaskFlow AI Backend
import { guestStorage } from './guestStorage';
import { AISubtaskSuggestion, Subtask, ConfidenceLevel, SRS_INTERVALS } from '@/types';

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

  /**
   * Complete a learning subtask with confidence rating (SRS - Spaced Repetition)
   * Updates confidence level and calculates next review time
   */
  async completeWithConfidence(
    taskId: string,
    subtaskId: string,
    confidenceLevel: ConfidenceLevel
  ) {
    const nextReviewAt = new Date(Date.now() + SRS_INTERVALS[confidenceLevel]).toISOString();

    if (isGuestMode()) {
      const task = guestStorage.getTask(taskId);
      if (!task) throw new Error('Task not found');

      // Find and update the subtask with confidence data, then mark complete
      const updatedSubtasks = task.subtasks.map(st => {
        if (st.id === subtaskId) {
          return {
            ...st,
            isCompleted: true,
            confidenceLevel,
            nextReviewAt,
          };
        }
        // Also check children
        if (st.children && st.children.length > 0) {
          return {
            ...st,
            children: st.children.map(child =>
              child.id === subtaskId
                ? { ...child, isCompleted: true, confidenceLevel, nextReviewAt }
                : child
            ),
          };
        }
        return st;
      });

      const updatedTask = guestStorage.updateTask(taskId, { subtasks: updatedSubtasks });
      return { task: updatedTask };
    }

    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}/confidence`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({ confidenceLevel, nextReviewAt }),
    });
    if (!res.ok) throw new Error('Failed to complete with confidence');
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

      // Calculate atomic times to match parent's total time
      const parentMinutes = subtask.estimatedMinutes || 30;
      const atomicTime1 = Math.ceil(parentMinutes * 0.35); // 35% of parent time
      const atomicTime2 = Math.ceil(parentMinutes * 0.35); // 35% of parent time
      const atomicTime3 = parentMinutes - atomicTime1 - atomicTime2; // Remaining ~30%

      // Create atomic tasks with "Atomic: " prefix - times sum to parent's time
      // Avoid duplicate "Atomic:" prefix if parent already starts with it
      const baseTitle = subtask.title.startsWith('Atomic: ')
        ? subtask.title.replace(/^Atomic:\s*/, '')
        : subtask.title;

      // Create atomic tasks with inherited learning fields from parent (Traffic Light SRS)
      const atomicTasks: Subtask[] = [
        { id: crypto.randomUUID(), title: `Atomic: ${baseTitle} - Part 1`, estimatedMinutes: atomicTime1, isCompleted: false, isArchived: false, order: task.subtasks.length, parentTaskId: taskId, parentSubtaskId: subtaskId, depth: 1, isComposite: false, children: [], status: 'draft' as const, strategyTag: subtask.strategyTag, interactionType: subtask.interactionType },
        { id: crypto.randomUUID(), title: `Atomic: ${baseTitle} - Part 2`, estimatedMinutes: atomicTime2, isCompleted: false, isArchived: false, order: task.subtasks.length + 1, parentTaskId: taskId, parentSubtaskId: subtaskId, depth: 1, isComposite: false, children: [], status: 'draft' as const, strategyTag: subtask.strategyTag, interactionType: subtask.interactionType },
        { id: crypto.randomUUID(), title: `Atomic: ${baseTitle} - Part 3`, estimatedMinutes: atomicTime3, isCompleted: false, isArchived: false, order: task.subtasks.length + 2, parentTaskId: taskId, parentSubtaskId: subtaskId, depth: 1, isComposite: false, children: [], status: 'draft' as const, strategyTag: subtask.strategyTag, interactionType: subtask.interactionType },
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

  // Break down a subtask into smaller atomic tasks (on-demand in focus mode)
  async breakdownSubtask(
    taskId: string,
    subtaskId: string,
    subtaskTitle: string,
    estimatedMinutes: number
  ): Promise<{ children: any[] }> {
    const res = await fetch(`${API_BASE_URL}/api/ai/breakdown-subtask`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ taskId, subtaskId, subtaskTitle, estimatedMinutes }),
    });
    if (!res.ok) throw new Error('Failed to break down subtask');
    return res.json();
  },

  // Get clarifying questions for a task (before breakdown)
  async getClarifyingQuestions(
    title: string,
    description?: string
  ): Promise<{ questions: string[] }> {
    const res = await fetch(`${API_BASE_URL}/api/ai/clarify`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error('Failed to get clarifying questions');
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

  // Delete all tasks (soft delete - moves to trash)
  async deleteAllTasks() {
    if (isGuestMode()) {
      const tasks = guestStorage.getAllTasks();
      tasks.forEach((task) => guestStorage.deleteTask(task.id));
      return { message: 'All tasks deleted', deletedCount: tasks.length };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete all tasks');
    return res.json();
  },

  // Get deleted tasks (trash/history)
  async getDeletedTasks() {
    if (isGuestMode()) {
      // Guest mode doesn't support trash (hard delete)
      return { tasks: [] };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/deleted`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch deleted tasks');
    return res.json();
  },

  // Restore a deleted task
  async restoreTask(id: string) {
    if (isGuestMode()) {
      throw new Error('Restore not supported in guest mode');
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}/restore`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to restore task');
    return res.json();
  },

  // Permanently delete a task (cannot be restored)
  async permanentDeleteTask(id: string) {
    if (isGuestMode()) {
      guestStorage.deleteTask(id);
      return { message: 'Task permanently deleted' };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/${id}/permanent`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to permanently delete task');
    return res.json();
  },

  // Empty trash (permanently delete all deleted tasks)
  async emptyTrash() {
    if (isGuestMode()) {
      // Guest mode: delete all tasks with isDeleted flag
      const allTasks = guestStorage.getAllTasks();
      const deletedTasks = allTasks.filter((t: any) => t.isDeleted);
      deletedTasks.forEach((t: any) => guestStorage.deleteTask(t.id));
      return { message: 'Trash emptied', deletedCount: deletedTasks.length };
    }
    const res = await fetch(`${API_BASE_URL}/api/tasks/deleted/all`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to empty trash');
    return res.json();
  },

  // Notes
  async getNotes() {
    if (isGuestMode()) {
      const notes = localStorage.getItem('taskflow-notes');
      return { notes: notes ? JSON.parse(notes) : [] };
    }
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  async getTaskNotes(taskId: string) {
    if (isGuestMode()) {
      const notes = localStorage.getItem('taskflow-notes');
      const allNotes = notes ? JSON.parse(notes) : [];
      return { notes: allNotes.filter((n: any) => n.taskId === taskId) };
    }
    const res = await fetch(`${API_BASE_URL}/api/notes/task/${taskId}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch task notes');
    return res.json();
  },

  async saveNote(note: { id?: string; taskId?: string; subtaskId?: string; content: string }) {
    if (isGuestMode()) {
      const notes = localStorage.getItem('taskflow-notes');
      const allNotes = notes ? JSON.parse(notes) : [];
      const now = new Date().toISOString();
      const newNote = {
        id: note.id || crypto.randomUUID(),
        ...note,
        createdAt: note.id ? allNotes.find((n: any) => n.id === note.id)?.createdAt : now,
        updatedAt: now,
      };
      const updatedNotes = note.id
        ? allNotes.map((n: any) => n.id === note.id ? newNote : n)
        : [...allNotes, newNote];
      localStorage.setItem('taskflow-notes', JSON.stringify(updatedNotes));
      return { note: newNote };
    }
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to save note');
    return res.json();
  },

  async deleteNote(noteId: string) {
    if (isGuestMode()) {
      const notes = localStorage.getItem('taskflow-notes');
      const allNotes = notes ? JSON.parse(notes) : [];
      localStorage.setItem('taskflow-notes', JSON.stringify(allNotes.filter((n: any) => n.id !== noteId)));
      return { success: true };
    }
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  },

  // Coach Conversations
  async getCoachConversations() {
    if (isGuestMode()) {
      const convs = localStorage.getItem('taskflow-coach-conversations');
      return { conversations: convs ? JSON.parse(convs) : [] };
    }
    const res = await fetch(`${API_BASE_URL}/api/coach-conversations`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async getTaskConversation(taskId: string, subtaskId?: string) {
    if (isGuestMode()) {
      const convs = localStorage.getItem('taskflow-coach-conversations');
      const allConvs = convs ? JSON.parse(convs) : [];
      const conv = allConvs.find((c: any) =>
        c.taskId === taskId && (subtaskId ? c.subtaskId === subtaskId : !c.subtaskId)
      );
      return { conversation: conv || null };
    }
    const url = subtaskId
      ? `${API_BASE_URL}/api/coach-conversations/task/${taskId}?subtaskId=${subtaskId}`
      : `${API_BASE_URL}/api/coach-conversations/task/${taskId}`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  },

  async saveCoachConversation(conversation: {
    id?: string;
    taskId?: string;
    subtaskId?: string;
    messages: Array<{ role: 'user' | 'ai'; content: string }>
  }) {
    if (isGuestMode()) {
      const convs = localStorage.getItem('taskflow-coach-conversations');
      const allConvs = convs ? JSON.parse(convs) : [];
      const now = new Date().toISOString();
      const newConv = {
        id: conversation.id || crypto.randomUUID(),
        ...conversation,
        createdAt: conversation.id ? allConvs.find((c: any) => c.id === conversation.id)?.createdAt : now,
        updatedAt: now,
      };
      const updatedConvs = conversation.id
        ? allConvs.map((c: any) => c.id === conversation.id ? newConv : c)
        : [...allConvs, newConv];
      localStorage.setItem('taskflow-coach-conversations', JSON.stringify(updatedConvs));
      return { conversation: newConv };
    }
    const res = await fetch(`${API_BASE_URL}/api/coach-conversations`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(conversation),
    });
    if (!res.ok) throw new Error('Failed to save conversation');
    return res.json();
  },

  async deleteCoachConversation(conversationId: string) {
    if (isGuestMode()) {
      const convs = localStorage.getItem('taskflow-coach-conversations');
      const allConvs = convs ? JSON.parse(convs) : [];
      localStorage.setItem('taskflow-coach-conversations', JSON.stringify(allConvs.filter((c: any) => c.id !== conversationId)));
      return { success: true };
    }
    const res = await fetch(`${API_BASE_URL}/api/coach-conversations/${conversationId}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  // Textbooks
  async getTextbooks() {
    if (isGuestMode()) {
      const textbooks = localStorage.getItem('taskflow-textbooks');
      return { textbooks: textbooks ? JSON.parse(textbooks) : [] };
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch textbooks');
    return res.json();
  },

  async getTextbookById(id: string) {
    if (isGuestMode()) {
      const textbooks = localStorage.getItem('taskflow-textbooks');
      const allTextbooks = textbooks ? JSON.parse(textbooks) : [];
      const textbook = allTextbooks.find((t: any) => t.id === id);
      return { textbook: textbook || null };
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks/${id}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch textbook');
    return res.json();
  },

  async createTextbook(data: {
    title: string;
    author?: string;
    description?: string;
    chapters: { title: string; description?: string }[];
  }) {
    if (isGuestMode()) {
      const textbooks = localStorage.getItem('taskflow-textbooks');
      const allTextbooks = textbooks ? JSON.parse(textbooks) : [];
      const now = new Date().toISOString();
      const newTextbook = {
        id: crypto.randomUUID(),
        ...data,
        chapters: data.chapters.map((ch, index) => ({
          id: crypto.randomUUID(),
          title: ch.title,
          description: ch.description,
          order: index,
          isCompleted: false,
        })),
        syncCode: 'guest',
        progress: 0,
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem('taskflow-textbooks', JSON.stringify([...allTextbooks, newTextbook]));
      return { textbook: newTextbook };
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create textbook');
    return res.json();
  },

  async updateTextbook(id: string, updates: any) {
    if (isGuestMode()) {
      const textbooks = localStorage.getItem('taskflow-textbooks');
      const allTextbooks = textbooks ? JSON.parse(textbooks) : [];
      const updatedTextbooks = allTextbooks.map((t: any) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      localStorage.setItem('taskflow-textbooks', JSON.stringify(updatedTextbooks));
      const textbook = updatedTextbooks.find((t: any) => t.id === id);
      return { textbook };
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update textbook');
    return res.json();
  },

  async deleteTextbook(id: string) {
    if (isGuestMode()) {
      const textbooks = localStorage.getItem('taskflow-textbooks');
      const allTextbooks = textbooks ? JSON.parse(textbooks) : [];
      localStorage.setItem('taskflow-textbooks', JSON.stringify(allTextbooks.filter((t: any) => t.id !== id)));
      return { message: 'Textbook deleted successfully' };
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete textbook');
    return res.json();
  },

  async generateTasksFromTextbook(id: string) {
    if (isGuestMode()) {
      throw new Error('AI task generation requires login');
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks/${id}/generate-tasks`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate tasks from textbook');
    return res.json();
  },

  // Parse PDF to extract chapters using Claude AI
  async parseTextbookPDF(file: File) {
    if (isGuestMode()) {
      throw new Error('PDF parsing requires login');
    }
    const formData = new FormData();
    formData.append('pdf', file);

    const res = await fetch(`${API_BASE_URL}/api/textbooks/parse/pdf`, {
      method: 'POST',
      headers: {
        'x-device-token': getDeviceToken(),
        'x-user-id': getUserId(),
      },
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to parse PDF');
    }
    return res.json();
  },

  // Parse URL to extract chapters using Claude AI
  async parseTextbookURL(url: string) {
    if (isGuestMode()) {
      throw new Error('URL parsing requires login');
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks/parse/url`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to parse URL');
    }
    return res.json();
  },

  // Parse text (table of contents) to extract chapters using Claude AI
  async parseTextbookText(text: string) {
    if (isGuestMode()) {
      throw new Error('Text parsing requires login');
    }
    const res = await fetch(`${API_BASE_URL}/api/textbooks/parse/text`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to parse text');
    }
    return res.json();
  },
};
