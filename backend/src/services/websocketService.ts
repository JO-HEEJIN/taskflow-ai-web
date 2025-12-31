import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { timerService } from './timerService';
import {
  TimerStartPayload,
  TimerPausePayload,
  TimerResumePayload,
  TimerStopPayload,
} from '../models/TimerState';

/**
 * WebSocket Service
 * Handles real-time timer synchronization using Socket.io
 */
class WebSocketService {
  private io: SocketIOServer | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Get userId from handshake (you may want to add authentication here)
      const userId = socket.handshake.query.userId as string;

      if (!userId) {
        console.error('❌ No userId provided in handshake');
        socket.disconnect();
        return;
      }

      // Join user-specific room for targeted broadcasts
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined their room`);

      // Send current timer state on connect
      this.sendTimerState(userId);

      // Handle timer:start event
      socket.on('timer:start', async (payload: TimerStartPayload) => {
        try {
          console.log(`▶️  Timer start request from ${userId}:`, payload);
          const clientTimerState = await timerService.startTimer(userId, payload);

          // Broadcast to all devices of this user
          this.io?.to(`user:${userId}`).emit('timer:state', clientTimerState);
        } catch (error) {
          console.error('❌ Error starting timer:', error);
          socket.emit('timer:error', { message: 'Failed to start timer' });
        }
      });

      // Handle timer:pause event
      socket.on('timer:pause', async (_payload: TimerPausePayload) => {
        try {
          console.log(`⏸️  Timer pause request from ${userId}`);
          const clientTimerState = await timerService.pauseTimer(userId);

          // Broadcast to all devices of this user
          this.io?.to(`user:${userId}`).emit('timer:state', clientTimerState);
        } catch (error) {
          console.error('❌ Error pausing timer:', error);
          socket.emit('timer:error', { message: 'Failed to pause timer' });
        }
      });

      // Handle timer:resume event
      socket.on('timer:resume', async (_payload: TimerResumePayload) => {
        try {
          console.log(`▶️  Timer resume request from ${userId}`);
          const clientTimerState = await timerService.resumeTimer(userId);

          // Broadcast to all devices of this user
          this.io?.to(`user:${userId}`).emit('timer:state', clientTimerState);
        } catch (error) {
          console.error('❌ Error resuming timer:', error);
          socket.emit('timer:error', { message: 'Failed to resume timer' });
        }
      });

      // Handle timer:stop event
      socket.on('timer:stop', async (_payload: TimerStopPayload) => {
        try {
          console.log(`⏹️  Timer stop request from ${userId}`);
          await timerService.stopTimer(userId);

          // Broadcast to all devices of this user
          this.io?.to(`user:${userId}`).emit('timer:stopped');
        } catch (error) {
          console.error('❌ Error stopping timer:', error);
          socket.emit('timer:error', { message: 'Failed to stop timer' });
        }
      });

      // Handle timer:getState event (request current state)
      socket.on('timer:getState', async () => {
        try {
          await this.sendTimerState(userId, socket.id);
        } catch (error) {
          console.error('❌ Error getting timer state:', error);
          socket.emit('timer:error', { message: 'Failed to get timer state' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    console.log('✅ WebSocket service initialized');
  }

  /**
   * Send current timer state to client(s)
   */
  private async sendTimerState(userId: string, socketId?: string): Promise<void> {
    try {
      const clientTimerState = await timerService.getClientTimerState(userId);

      if (clientTimerState) {
        if (socketId) {
          // Send to specific socket
          this.io?.to(socketId).emit('timer:state', clientTimerState);
        } else {
          // Broadcast to all user's devices
          this.io?.to(`user:${userId}`).emit('timer:state', clientTimerState);
        }
      } else {
        // No active timer
        if (socketId) {
          this.io?.to(socketId).emit('timer:stopped');
        } else {
          this.io?.to(`user:${userId}`).emit('timer:stopped');
        }
      }
    } catch (error) {
      console.error('❌ Error sending timer state:', error);
    }
  }

  /**
   * Broadcast timer completion to user
   */
  async broadcastTimerCompleted(userId: string, taskId: string, subtaskId: string): Promise<void> {
    this.io?.to(`user:${userId}`).emit('timer:completed', { taskId, subtaskId });
    await timerService.stopTimer(userId);
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const websocketService = new WebSocketService();
