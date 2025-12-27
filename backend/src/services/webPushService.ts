import webPush from 'web-push';
import { cosmosService } from './cosmosService';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface StoredSubscription {
  id: string;
  userId: string;
  deviceId: string;
  subscription: PushSubscription;
  createdAt: string;
  lastUsed: string;
}

class WebPushService {
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@taskflow.ai';

    if (!publicKey || !privateKey) {
      console.warn('⚠️  VAPID keys not configured - web push notifications disabled');
      return;
    }

    try {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.isConfigured = true;
      console.log('✅ Web Push (VAPID) initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Web Push:', error);
    }
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  // Save push subscription to database
  async saveSubscription(
    userId: string,
    deviceId: string,
    subscription: PushSubscription
  ): Promise<void> {
    if (!cosmosService.isConnected()) {
      console.warn('Cannot save subscription - Cosmos DB not connected');
      return;
    }

    try {
      const container = cosmosService.getContainer('pushSubscriptions');

      const storedSubscription: StoredSubscription = {
        id: deviceId,
        userId,
        deviceId,
        subscription,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      await container.items.upsert(storedSubscription);
      console.log(`✅ Push subscription saved for device: ${deviceId}`);
    } catch (error) {
      console.error('Failed to save push subscription:', error);
      throw error;
    }
  }

  // Get all subscriptions for a user
  async getUserSubscriptions(userId: string): Promise<StoredSubscription[]> {
    if (!cosmosService.isConnected()) {
      console.warn('Cannot get subscriptions - Cosmos DB not connected');
      return [];
    }

    try {
      const container = cosmosService.getContainer('pushSubscriptions');

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await container.items.query<StoredSubscription>(querySpec).fetchAll();
      return resources;
    } catch (error) {
      console.error('Failed to get user subscriptions:', error);
      return [];
    }
  }

  // Remove a subscription
  async removeSubscription(deviceId: string): Promise<void> {
    if (!cosmosService.isConnected()) {
      return;
    }

    try {
      const container = cosmosService.getContainer('pushSubscriptions');
      await container.item(deviceId, deviceId).delete();
      console.log(`✅ Push subscription removed for device: ${deviceId}`);
    } catch (error) {
      console.error('Failed to remove subscription:', error);
    }
  }

  // Send notification to specific user (all their devices)
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      icon?: string;
      data?: any;
    }
  ): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Web push not configured - notification not sent');
      return;
    }

    const subscriptions = await this.getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user: ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: notification.data || {},
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(sub.subscription, payload);
          console.log(`📬 Notification sent to device: ${sub.deviceId}`);

          // Update last used timestamp
          await this.updateLastUsed(sub.deviceId);
        } catch (error: any) {
          console.error(`Failed to send to device ${sub.deviceId}:`, error);

          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410) {
            console.log(`Removing invalid subscription: ${sub.deviceId}`);
            await this.removeSubscription(sub.deviceId);
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`📊 Notification results - Sent: ${successful}, Failed: ${failed}`);
  }

  // Update last used timestamp
  private async updateLastUsed(deviceId: string): Promise<void> {
    if (!cosmosService.isConnected()) {
      return;
    }

    try {
      const container = cosmosService.getContainer('pushSubscriptions');
      const { resource } = await container.item(deviceId, deviceId).read<StoredSubscription>();

      if (resource) {
        resource.lastUsed = new Date().toISOString();
        await container.items.upsert(resource);
      }
    } catch (error) {
      // Silent fail - not critical
    }
  }

  // Notification helpers (same as notificationService.ts)
  async notifyAIBreakdownComplete(userId: string, taskTitle: string, subtaskCount: number) {
    await this.sendToUser(userId, {
      title: '✨ AI Task Breakdown Complete',
      body: `AI suggested ${subtaskCount} subtasks for "${taskTitle}"`,
      icon: '/ai-icon.png',
      data: { type: 'ai_breakdown_complete' },
    });
  }

  async notifyTaskCompleted(userId: string, taskTitle: string) {
    await this.sendToUser(userId, {
      title: '🎉 Task Completed!',
      body: `Congratulations! You completed "${taskTitle}"`,
      icon: '/celebration-icon.png',
      data: { type: 'task_completed' },
    });
  }

  async notifyDueDateReminder(userId: string, taskTitle: string, timeRemaining: string) {
    await this.sendToUser(userId, {
      title: `⏰ Due Date Reminder - ${timeRemaining}`,
      body: `Don't forget: "${taskTitle}" is due soon!`,
      icon: '/clock-icon.png',
      data: { type: 'due_date_reminder' },
    });
  }

  async notifyLinkedTaskCreated(userId: string, newTaskTitle: string, sourceSubtask: string) {
    await this.sendToUser(userId, {
      title: '🔗 New Linked Task Created',
      body: `Created "${newTaskTitle}" from subtask "${sourceSubtask}"`,
      icon: '/link-icon.png',
      data: { type: 'linked_task_created' },
    });
  }

  async notifyOrphanedTasksFound(userId: string, orphanedCount: number) {
    await this.sendToUser(userId, {
      title: '🧹 Orphaned Tasks Found',
      body: `${orphanedCount} orphaned task${orphanedCount > 1 ? 's' : ''} detected. Clean up recommended.`,
      icon: '/cleanup-icon.png',
      data: { type: 'orphaned_tasks_found' },
    });
  }

  async notifyStaleTask(userId: string, taskTitle: string, daysSinceUpdate: number) {
    await this.sendToUser(userId, {
      title: '💤 Stale Task Reminder',
      body: `"${taskTitle}" has been inactive for ${daysSinceUpdate} days`,
      icon: '/sleep-icon.png',
      data: { type: 'stale_task' },
    });
  }

  async notifySyncSuccess(userId: string, deviceName?: string) {
    await this.sendToUser(userId, {
      title: '✅ Sync Complete',
      body: deviceName
        ? `Successfully synced with ${deviceName}`
        : 'Your tasks are now synced across devices',
      icon: '/sync-icon.png',
      data: { type: 'sync_success' },
    });
  }
}

export const webPushService = new WebPushService();
