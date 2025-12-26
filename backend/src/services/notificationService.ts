import { NotificationHubsClient } from '@azure/notification-hubs';

class NotificationService {
  private client: NotificationHubsClient | null = null;
  private hubName: string;

  constructor() {
    this.hubName = process.env.AZURE_NOTIFICATION_HUB_NAME || 'taskflow-notifications';
    this.initialize();
  }

  private initialize() {
    const connectionString = process.env.AZURE_NOTIFICATION_HUB_CONNECTION_STRING;

    if (!connectionString) {
      console.warn('⚠️  Azure Notification Hub not configured - notifications disabled');
      return;
    }

    try {
      this.client = new NotificationHubsClient(connectionString, this.hubName);
      console.log('✅ Azure Notification Hubs initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Azure Notification Hubs:', error);
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  // Send notification to specific user (by sync code)
  async sendToUser(syncCode: string, notification: {
    title: string;
    body: string;
    icon?: string;
    data?: any;
  }): Promise<void> {
    if (!this.client) {
      console.warn('Notification not sent - service not enabled');
      return;
    }

    try {
      // Web Push notification format
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon.png',
          badge: '/badge.png',
          vibrate: [200, 100, 200],
          data: notification.data || {},
        },
      };

      // Send to all devices with this sync code tag
      await this.client.sendNotification(
        {
          body: JSON.stringify(message),
          contentType: 'application/json',
        },
        { tags: [`syncCode:${syncCode}`] }
      );

      console.log(`📬 Notification sent to sync code: ${syncCode}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Send broadcast notification to all users
  async sendBroadcast(notification: {
    title: string;
    body: string;
    icon?: string;
  }): Promise<void> {
    if (!this.client) {
      console.warn('Broadcast notification not sent - service not enabled');
      return;
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon.png',
        },
      };

      await this.client.sendNotification({
        body: JSON.stringify(message),
        contentType: 'application/json',
      });

      console.log('📢 Broadcast notification sent');
    } catch (error) {
      console.error('Failed to send broadcast:', error);
    }
  }

  // Notification 1: AI Breakdown Complete
  async notifyAIBreakdownComplete(syncCode: string, taskTitle: string, subtaskCount: number) {
    await this.sendToUser(syncCode, {
      title: '✨ AI Task Breakdown Complete',
      body: `AI suggested ${subtaskCount} subtasks for "${taskTitle}"`,
      icon: '/ai-icon.png',
      data: { type: 'ai_breakdown_complete' },
    });
  }

  // Notification 2: Task Completed
  async notifyTaskCompleted(syncCode: string, taskTitle: string) {
    await this.sendToUser(syncCode, {
      title: '🎉 Task Completed!',
      body: `Congratulations! You completed "${taskTitle}"`,
      icon: '/celebration-icon.png',
      data: { type: 'task_completed' },
    });
  }

  // Notification 3: Due Date Reminder
  async notifyDueDateReminder(syncCode: string, taskTitle: string, timeRemaining: string) {
    await this.sendToUser(syncCode, {
      title: `⏰ Due Date Reminder - ${timeRemaining}`,
      body: `Don't forget: "${taskTitle}" is due soon!`,
      icon: '/clock-icon.png',
      data: { type: 'due_date_reminder' },
    });
  }

  // Notification 4: Linked Task Created
  async notifyLinkedTaskCreated(syncCode: string, newTaskTitle: string, sourceSubtask: string) {
    await this.sendToUser(syncCode, {
      title: '🔗 New Linked Task Created',
      body: `Created "${newTaskTitle}" from subtask "${sourceSubtask}"`,
      icon: '/link-icon.png',
      data: { type: 'linked_task_created' },
    });
  }

  // Notification 5: Orphaned Tasks Found
  async notifyOrphanedTasksFound(syncCode: string, orphanedCount: number) {
    await this.sendToUser(syncCode, {
      title: '🧹 Orphaned Tasks Found',
      body: `${orphanedCount} orphaned task${orphanedCount > 1 ? 's' : ''} detected. Clean up recommended.`,
      icon: '/cleanup-icon.png',
      data: { type: 'orphaned_tasks_found' },
    });
  }

  // Notification 6: Stale Task Reminder
  async notifyStaleTask(syncCode: string, taskTitle: string, daysSinceUpdate: number) {
    await this.sendToUser(syncCode, {
      title: '💤 Stale Task Reminder',
      body: `"${taskTitle}" has been inactive for ${daysSinceUpdate} days`,
      icon: '/sleep-icon.png',
      data: { type: 'stale_task' },
    });
  }

  // Notification 7: Sync Success
  async notifySyncSuccess(syncCode: string, deviceName?: string) {
    await this.sendToUser(syncCode, {
      title: '✅ Sync Complete',
      body: deviceName
        ? `Successfully synced with ${deviceName}`
        : 'Your tasks are now synced across devices',
      icon: '/sync-icon.png',
      data: { type: 'sync_success' },
    });
  }
}

export const notificationService = new NotificationService();
