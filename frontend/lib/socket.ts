import { io, Socket } from 'socket.io-client';

/**
 * Socket.io Client Wrapper
 * Singleton class to manage WebSocket connection to backend
 */
class SocketClient {
  private socket: Socket | null = null;
  private userId: string | null = null;

  /**
   * Initialize and connect to Socket.io server
   */
  connect(userId: string): void {
    if (this.socket?.connected && this.userId === userId) {
      console.log('🔌 Socket already connected for user:', userId);
      return;
    }

    // Disconnect existing connection if userId changed
    if (this.socket && this.userId !== userId) {
      console.log('🔌 User changed, reconnecting socket');
      this.disconnect();
    }

    this.userId = userId;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    this.socket = io(backendUrl, {
      query: { userId },
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    this.socket.on('timer:error', (error) => {
      console.error('❌ Timer error:', error);
    });
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      console.log('🔌 Socket disconnected');
    }
  }

  /**
   * Start a timer
   */
  startTimer(taskId: string, subtaskId: string, durationMinutes: number): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('timer:start', {
      taskId,
      subtaskId,
      durationMinutes,
    });
  }

  /**
   * Pause the timer
   */
  pauseTimer(): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('timer:pause', {});
  }

  /**
   * Resume the timer
   */
  resumeTimer(): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('timer:resume', {});
  }

  /**
   * Stop the timer
   */
  stopTimer(): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('timer:stop', {});
  }

  /**
   * Request current timer state
   */
  getTimerState(): void {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('timer:getState');
  }

  /**
   * Listen for timer state updates
   */
  onTimerState(callback: (state: any) => void): void {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }

    this.socket.on('timer:state', callback);
  }

  /**
   * Listen for timer stopped event
   */
  onTimerStopped(callback: () => void): void {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }

    this.socket.on('timer:stopped', callback);
  }

  /**
   * Listen for timer completed event
   */
  onTimerCompleted(callback: (data: { taskId: string; subtaskId: string }) => void): void {
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }

    this.socket.on('timer:completed', callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) {
      return;
    }

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current userId
   */
  getUserId(): string | null {
    return this.userId;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
