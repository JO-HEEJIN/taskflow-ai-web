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
  DRAFT = 'draft',              // AI-generated, not user-approved
  PENDING = 'pending',           // User-approved, not started
  IN_PROGRESS = 'in_progress',   // Currently being worked on
  COMPLETED = 'completed',       // Finished
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  isArchived: boolean;
  parentTaskId: string;
  parentSubtaskId?: string; // For nested subtasks (recursive)
  order: number;
  linkedTaskId?: string;
  estimatedMinutes?: number; // AI-estimated time for this subtask
  stepType?: 'physical' | 'mental' | 'creative'; // Type of action required
  status?: 'draft' | 'active'; // Draft = AI-generated, Active = User-approved (default: 'draft')
  isComposite?: boolean; // True if subtask has/needs children (>10 min)
  depth?: number; // Nesting level: 0 = top-level, 1 = child, 2 = grandchild, etc.
  children?: Subtask[]; // Nested subtasks (recursive)
}

// AI Types
export interface AISubtaskSuggestion {
  title: string;
  order: number;
  estimatedMinutes?: number;
  stepType?: 'physical' | 'mental' | 'creative';
  status?: 'draft' | 'active';
  isComposite?: boolean;
  depth?: number;
  children?: AISubtaskSuggestion[]; // Nested children from recursive breakdown
  parentSubtaskId?: string; // Link to parent subtask for atomic tasks
  isAtomic?: boolean; // Flag for atomic constellation styling
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

// Node Context for Constellation View (Orion's Belt Perspective)
// Tracks what the user clicked to enable context-aware modals and focus mode
export interface NodeContext {
  type: 'task' | 'subtask' | 'atomic';
  taskId: string;
  subtaskId?: string; // For subtask or atomic clicks
  atomicId?: string; // For atomic clicks only
}
