// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  subtasks: Subtask[];
  syncCode: string;
  sourceSubtaskId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  isArchived: boolean;
  parentTaskId: string;
  order: number;
  linkedTaskId?: string;
}

// Sync Types
export interface SyncSession {
  syncCode: string;
  deviceTokens: string[];
  createdAt: Date;
  lastSyncAt: Date;
}

// AI Types
export interface AIBreakdownRequest {
  taskTitle: string;
  taskDescription?: string;
}

export interface AIBreakdownResponse {
  subtasks: {
    title: string;
    order: number;
  }[];
}
