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
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
  // Textbook integration
  textbookId?: string;
  chapterId?: string;
  // Scheduling fields (Calendar Integration)
  dueDate?: string;                    // ISO date string (e.g., "2024-01-15")
  scheduledStartTime?: string;         // ISO datetime string for scheduled start
  scheduledEndTime?: string;           // ISO datetime string for scheduled end
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
  priority?: 'high' | 'medium' | 'low';
  isAutoScheduled?: boolean;           // True if scheduled by algorithm
  googleCalendarEventId?: string;      // Link to Google Calendar event
}

// Scheduling Preferences for Calendar Integration
export interface UserSchedulingPreferences {
  userId: string;
  workingHours: {
    start: string;    // "09:00"
    end: string;      // "17:00"
  };
  preferredFocusTime: 'morning' | 'afternoon' | 'evening';
  minBreakBetweenTasks: number;  // minutes
  maxDailyFocusHours: number;
  excludedDays: number[];         // 0=Sun, 6=Sat
  googleCalendarConnected: boolean;
  googleRefreshToken?: string;    // Encrypted
}

export enum TaskStatus {
  DRAFT = 'draft',              // AI-generated, not user-approved
  PENDING = 'pending',           // User-approved, not started
  IN_PROGRESS = 'in_progress',   // Currently being worked on
  COMPLETED = 'completed',       // Finished
}

// Learning Engine Types
export type LearningStrategy =
  | 'active_recall'
  | 'feynman'
  | 'blurting'
  | 'interleaving'
  | 'priming'
  | 'elaboration'
  | 'concrete_analogy'
  | 'spaced_repetition';

export type InteractionType =
  | 'checkbox'
  | 'text_input'
  | 'voice_input'
  | 'quiz'
  | 'confidence_rating';

export type ConfidenceLevel = 'red' | 'yellow' | 'green';

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
  // Learning Engine fields
  strategyTag?: LearningStrategy;
  interactionType?: InteractionType;
  confidenceLevel?: ConfidenceLevel;
  nextReviewAt?: string;
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
    estimatedMinutes?: number;
    stepType?: 'physical' | 'mental' | 'creative';
    status?: 'draft' | 'active';
    isComposite?: boolean;
    depth?: number;
    // Learning Engine fields
    strategyTag?: LearningStrategy;
    interactionType?: InteractionType;
  }[];
}

// Textbook Types
export interface Chapter {
  id: string;
  title: string;
  description?: string;
  order: number;
  linkedTaskId?: string; // Task created from this chapter
  isCompleted: boolean;
}

export interface Textbook {
  id: string;
  title: string;
  author?: string;
  coverImage?: string;
  description?: string;
  chapters: Chapter[];
  syncCode: string; // userId
  progress: number; // 0-100, calculated from chapters
  createdAt: Date;
  updatedAt: Date;
}
