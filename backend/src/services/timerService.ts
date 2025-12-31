import { Container } from '@azure/cosmos';
import { cosmosService } from './cosmosService';
import {
  TimerState,
  ClientTimerState,
  TimerStartPayload,
} from '../models/TimerState';

/**
 * Timer Service
 * Manages server-side timer state with Cosmos DB persistence
 * Single source of truth for timer state across all devices
 */
class TimerService {
  private container: Container | null = null;

  constructor() {
    // Container will be initialized by the initialize method
  }

  /**
   * Initialize the timer service
   */
  async initialize(): Promise<void> {
    this.container = cosmosService.getTimersContainer();
    if (!this.container) {
      console.warn('⚠️  Timers container not available - timer sync disabled');
    } else {
      console.log('✅ Timer service initialized');
    }
  }

  /**
   * Start a new timer for a user
   */
  async startTimer(
    userId: string,
    payload: TimerStartPayload
  ): Promise<ClientTimerState> {
    const now = Date.now();
    const durationMs = payload.durationMinutes * 60 * 1000;
    const endTime = now + durationMs;

    const timerState: TimerState = {
      id: userId,
      taskId: payload.taskId,
      subtaskId: payload.subtaskId,
      startTime: now,
      endTime,
      durationMs,
      isPaused: false,
      totalPausedTime: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Cosmos DB
    if (this.container) {
      try {
        await this.container.items.upsert(timerState);
        console.log(`✅ Timer started for user ${userId}: ${payload.durationMinutes} minutes`);
      } catch (error) {
        console.error('❌ Failed to save timer state:', error);
        throw error;
      }
    }

    return this.toClientTimerState(timerState);
  }

  /**
   * Pause an active timer
   */
  async pauseTimer(userId: string): Promise<ClientTimerState> {
    const timerState = await this.getTimerState(userId);
    if (!timerState) {
      throw new Error('No active timer found');
    }

    if (timerState.isPaused) {
      return this.toClientTimerState(timerState);
    }

    const now = Date.now();
    timerState.isPaused = true;
    timerState.pausedAt = now;
    timerState.updatedAt = now;

    if (this.container) {
      try {
        await this.container.items.upsert(timerState);
        console.log(`⏸️  Timer paused for user ${userId}`);
      } catch (error) {
        console.error('❌ Failed to pause timer:', error);
        throw error;
      }
    }

    return this.toClientTimerState(timerState);
  }

  /**
   * Resume a paused timer
   */
  async resumeTimer(userId: string): Promise<ClientTimerState> {
    const timerState = await this.getTimerState(userId);
    if (!timerState) {
      throw new Error('No active timer found');
    }

    if (!timerState.isPaused) {
      return this.toClientTimerState(timerState);
    }

    const now = Date.now();
    const pauseDuration = timerState.pausedAt ? now - timerState.pausedAt : 0;

    timerState.isPaused = false;
    timerState.totalPausedTime += pauseDuration;
    timerState.endTime += pauseDuration; // Extend end time by pause duration
    timerState.pausedAt = undefined;
    timerState.updatedAt = now;

    if (this.container) {
      try {
        await this.container.items.upsert(timerState);
        console.log(`▶️  Timer resumed for user ${userId}`);
      } catch (error) {
        console.error('❌ Failed to resume timer:', error);
        throw error;
      }
    }

    return this.toClientTimerState(timerState);
  }

  /**
   * Stop/delete a timer
   */
  async stopTimer(userId: string): Promise<void> {
    if (this.container) {
      try {
        await this.container.item(userId, userId).delete();
        console.log(`⏹️  Timer stopped for user ${userId}`);
      } catch (error) {
        // Timer might not exist, which is fine
        if ((error as any).code !== 404) {
          console.error('❌ Failed to stop timer:', error);
        }
      }
    }
  }

  /**
   * Get current timer state for a user
   */
  async getTimerState(userId: string): Promise<TimerState | null> {
    if (!this.container) {
      return null;
    }

    try {
      const { resource } = await this.container.item(userId, userId).read<TimerState>();

      if (!resource) {
        return null;
      }

      // Check if timer has expired
      const now = Date.now();
      if (!resource.isPaused && resource.endTime < now) {
        // Timer expired, delete it
        await this.stopTimer(userId);
        return null;
      }

      return resource;
    } catch (error) {
      if ((error as any).code === 404) {
        return null; // No timer found
      }
      console.error('❌ Failed to get timer state:', error);
      throw error;
    }
  }

  /**
   * Get client-facing timer state
   */
  async getClientTimerState(userId: string): Promise<ClientTimerState | null> {
    const timerState = await this.getTimerState(userId);
    if (!timerState) {
      return null;
    }
    return this.toClientTimerState(timerState);
  }

  /**
   * Convert TimerState to ClientTimerState
   */
  private toClientTimerState(timerState: TimerState): ClientTimerState {
    const now = Date.now();
    let currentTimeLeft: number;

    if (timerState.isPaused) {
      // When paused, calculate time left from pausedAt
      currentTimeLeft = Math.max(0, Math.floor((timerState.endTime - (timerState.pausedAt || now)) / 1000));
    } else {
      // When running, calculate from current time
      currentTimeLeft = Math.max(0, Math.floor((timerState.endTime - now) / 1000));
    }

    return {
      taskId: timerState.taskId,
      subtaskId: timerState.subtaskId,
      startTime: timerState.startTime,
      endTime: timerState.endTime,
      isPaused: timerState.isPaused,
      currentTimeLeft,
    };
  }

  /**
   * Check if user has an active timer
   */
  async hasActiveTimer(userId: string): Promise<boolean> {
    const timerState = await this.getTimerState(userId);
    return timerState !== null;
  }
}

export const timerService = new TimerService();
