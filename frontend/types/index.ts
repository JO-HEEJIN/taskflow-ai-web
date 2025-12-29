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
  createdAt: Date | string;
  updatedAt: Date | string;
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
  estimatedMinutes?: number; // AI-estimated time for this subtask
  stepType?: 'physical' | 'mental' | 'creative'; // Type of action required
}

// AI Types
export interface AISubtaskSuggestion {
  title: string;
  order: number;
  estimatedMinutes?: number;
  stepType?: 'physical' | 'mental' | 'creative';
}

// AI Coaching Response
export interface AICoachingResponse {
  suggestions: AISubtaskSuggestion[];
  coachScript: {
    intro: string;
    firstTaskPrompt: string;
    encouragement: string;
  };
}
