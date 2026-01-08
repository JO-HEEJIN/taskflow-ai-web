/**
 * Chat History Persistence Utility
 *
 * Stores coach chat messages per task in localStorage
 * Auto-prunes chats older than 30 days on load
 */

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: string; // ISO string for serialization
}

interface ChatStorage {
  taskId: string;
  messages: ChatMessage[];
  lastUpdated: number; // Unix timestamp
}

const STORAGE_PREFIX = 'taskflow_chat_';
const PRUNE_DAYS = 30;
const MAX_MESSAGES_PER_CHAT = 100; // Prevent localStorage bloat

/**
 * Get storage key for a task
 */
const getStorageKey = (taskId: string): string => `${STORAGE_PREFIX}${taskId}`;

/**
 * Load chat history for a task
 */
export const loadChatHistory = (taskId: string): ChatMessage[] => {
  if (typeof window === 'undefined') return [];

  try {
    const key = getStorageKey(taskId);
    const stored = localStorage.getItem(key);

    if (!stored) return [];

    const data: ChatStorage = JSON.parse(stored);
    return data.messages || [];
  } catch (error) {
    console.warn(`[ChatStorage] Failed to load chat for task ${taskId}:`, error);
    return [];
  }
};

/**
 * Save chat history for a task
 */
export const saveChatHistory = (taskId: string, messages: ChatMessage[]): void => {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(taskId);

    // Limit messages to prevent localStorage bloat
    const trimmedMessages = messages.slice(-MAX_MESSAGES_PER_CHAT);

    const data: ChatStorage = {
      taskId,
      messages: trimmedMessages,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`[ChatStorage] Failed to save chat for task ${taskId}:`, error);
  }
};

/**
 * Add a single message to chat history
 */
export const addMessageToHistory = (
  taskId: string,
  role: 'ai' | 'user',
  content: string
): void => {
  const existing = loadChatHistory(taskId);

  const newMessage: ChatMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  saveChatHistory(taskId, [...existing, newMessage]);
};

/**
 * Clear chat history for a task
 */
export const clearChatHistory = (taskId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(taskId);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[ChatStorage] Failed to clear chat for task ${taskId}:`, error);
  }
};

/**
 * Prune old chat histories (older than PRUNE_DAYS)
 * Call this on app initialization
 */
export const pruneOldChats = (): number => {
  if (typeof window === 'undefined') return 0;

  const cutoffTime = Date.now() - (PRUNE_DAYS * 24 * 60 * 60 * 1000);
  let prunedCount = 0;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const data: ChatStorage = JSON.parse(stored);

        if (data.lastUpdated < cutoffTime) {
          keysToRemove.push(key);
        }
      } catch {
        // Invalid data, remove it
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      prunedCount++;
    });

    if (prunedCount > 0) {
      console.log(`[ChatStorage] Pruned ${prunedCount} old chat histories (>${PRUNE_DAYS} days)`);
    }
  } catch (error) {
    console.warn('[ChatStorage] Failed to prune old chats:', error);
  }

  return prunedCount;
};

/**
 * Get all stored chat task IDs (for debugging/admin)
 */
export const getAllChatTaskIds = (): string[] => {
  if (typeof window === 'undefined') return [];

  const taskIds: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        taskIds.push(key.replace(STORAGE_PREFIX, ''));
      }
    }
  } catch (error) {
    console.warn('[ChatStorage] Failed to get chat task IDs:', error);
  }

  return taskIds;
};

/**
 * Get storage usage stats (for debugging)
 */
export const getChatStorageStats = (): { count: number; totalSize: number } => {
  if (typeof window === 'undefined') return { count: 0, totalSize: 0 };

  let count = 0;
  let totalSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        count++;
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
      }
    }
  } catch (error) {
    console.warn('[ChatStorage] Failed to get storage stats:', error);
  }

  return { count, totalSize };
};
