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
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
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
  // Learning Engine fields (for study mode)
  strategyTag?: LearningStrategy;   // Active learning strategy for this subtask
  interactionType?: InteractionType; // How user completes this subtask (default: checkbox)
  confidenceLevel?: ConfidenceLevel; // SRS: User's self-assessed mastery
  nextReviewAt?: string;             // SRS: When to review again (ISO date string)
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
  // Learning Engine fields (for study mode)
  strategyTag?: LearningStrategy;   // Active learning strategy for this subtask
  interactionType?: InteractionType; // How user completes this subtask
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

// ===========================================
// LEARNING ENGINE TYPES (Active Learning Protocol)
// ===========================================

// Learning strategy types for cognitive science-based learning
export type LearningStrategy =
  | 'active_recall'     // Quiz yourself without looking
  | 'feynman'           // Explain like teaching a child
  | 'blurting'          // Brain dump everything you know
  | 'interleaving'      // Mix different topics
  | 'priming'           // Preview before deep reading
  | 'elaboration'       // Connect to prior knowledge
  | 'concrete_analogy'  // Real-world examples
  | 'spaced_repetition';// Review at optimal intervals

// Interaction types for varied completions
export type InteractionType =
  | 'checkbox'          // Standard completion (default)
  | 'text_input'        // User must type explanation
  | 'voice_input'       // Voice recording (future)
  | 'quiz'              // Multiple choice or fill-in
  | 'confidence_rating';// Traffic light SRS

// Confidence levels for Spaced Repetition System (SRS)
export type ConfidenceLevel =
  | 'red'    // Didn't get it - review in 20 min
  | 'yellow' // Kind of get it - review tomorrow
  | 'green'; // Nailed it - review in 3 days

// SRS review intervals in milliseconds
export const SRS_INTERVALS: Record<ConfidenceLevel, number> = {
  red: 20 * 60 * 1000,           // 20 minutes
  yellow: 24 * 60 * 60 * 1000,   // 1 day
  green: 3 * 24 * 60 * 60 * 1000 // 3 days
};
