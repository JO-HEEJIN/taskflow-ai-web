/**
 * Timer State Model
 * Represents the server-side timer state stored in Cosmos DB
 */

export interface TimerState {
  id: string;              // userId (partition key)
  taskId: string;          // Task being worked on
  subtaskId: string;       // Subtask being worked on
  startTime: number;       // Unix timestamp (ms) when timer started
  endTime: number;         // Unix timestamp (ms) when timer should end
  durationMs: number;      // Total duration in milliseconds
  isPaused: boolean;       // Whether timer is currently paused
  pausedAt?: number;       // Unix timestamp (ms) when paused (if paused)
  totalPausedTime: number; // Total time spent paused (ms)
  createdAt: number;       // Unix timestamp (ms) when record created
  updatedAt: number;       // Unix timestamp (ms) when last updated
}

/**
 * Timer state update payload (partial updates)
 */
export interface TimerStateUpdate {
  isPaused?: boolean;
  pausedAt?: number;
  totalPausedTime?: number;
  updatedAt: number;
}

/**
 * Client-side timer state (sent to frontend)
 */
export interface ClientTimerState {
  taskId: string;
  subtaskId: string;
  startTime: number;
  endTime: number;
  isPaused: boolean;
  currentTimeLeft: number; // Calculated: (endTime - now) / 1000 in seconds
}

/**
 * WebSocket event payloads
 */
export interface TimerStartPayload {
  taskId: string;
  subtaskId: string;
  durationMinutes: number;
}

export interface TimerPausePayload {
  // No additional data needed
}

export interface TimerResumePayload {
  // No additional data needed
}

export interface TimerStopPayload {
  // No additional data needed
}
