import { v4 as uuidv4 } from 'uuid';
import { cosmosService } from './cosmosService';
import { SyncSession } from '../types';

class SyncService {
  private mockSessions: Map<string, SyncSession> = new Map();

  // Generate a unique sync code (8 characters)
  generateSyncCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  // Create a new sync session
  async createSyncSession(deviceToken: string): Promise<SyncSession> {
    const syncCode = this.generateSyncCode();

    const session: SyncSession = {
      syncCode,
      deviceTokens: [deviceToken],
      createdAt: new Date(),
      lastSyncAt: new Date(),
    };

    const container = cosmosService.getSyncContainer();

    if (container) {
      await container.items.create({ ...session, id: syncCode });
    } else {
      this.mockSessions.set(syncCode, session);
    }

    return session;
  }

  // Get sync session by code
  async getSyncSession(syncCode: string): Promise<SyncSession | null> {
    const container = cosmosService.getSyncContainer();

    if (container) {
      try {
        const { resource } = await container.item(syncCode, syncCode).read<SyncSession>();
        return resource || null;
      } catch (error) {
        return null;
      }
    } else {
      return this.mockSessions.get(syncCode) || null;
    }
  }

  // Link a new device to existing sync session
  async linkDevice(syncCode: string, deviceToken: string): Promise<SyncSession | null> {
    const session = await this.getSyncSession(syncCode);

    if (!session) {
      return null;
    }

    // Check if device already linked
    if (session.deviceTokens.includes(deviceToken)) {
      return session;
    }

    // Add device token
    const updatedSession = {
      ...session,
      deviceTokens: [...session.deviceTokens, deviceToken],
      lastSyncAt: new Date(),
    };

    const container = cosmosService.getSyncContainer();

    if (container) {
      await container.item(syncCode, syncCode).replace({
        ...updatedSession,
        id: syncCode,
      });
    } else {
      this.mockSessions.set(syncCode, updatedSession);
    }

    return updatedSession;
  }

  // Check if a device token exists (for auto-generating sync code on first use)
  async getOrCreateSyncCode(deviceToken: string): Promise<string> {
    // In a real implementation, you might search for existing sessions
    // For now, just create a new one
    const session = await this.createSyncSession(deviceToken);
    return session.syncCode;
  }
}

export const syncService = new SyncService();
