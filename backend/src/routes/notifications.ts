import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { webPushService } from '../services/webPushService';

const router = Router();

// Get VAPID public key for browser push subscription
router.get('/vapid-public-key', (req: Request, res: Response) => {
  const publicKey = webPushService.getPublicKey();

  if (!publicKey) {
    return res.status(503).json({ error: 'Web push not configured' });
  }

  res.json({ publicKey });
});

// Register device for push notifications (web browsers)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { deviceId, subscription } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // If subscription is provided, use web push service (for browsers)
    if (subscription && subscription.endpoint) {
      await webPushService.saveSubscription(userId, deviceId, subscription);

      res.json({
        success: true,
        message: 'Browser push subscription registered',
        userId,
        deviceId,
      });
    } else {
      // Fallback to Azure Notification Hub (for native apps)
      await notificationService.registerDevice(userId, deviceId);

      res.json({
        success: true,
        message: 'Device registered for notifications',
        userId,
      });
    }
  } catch (error) {
    console.error('Error registering device for notifications:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Test notification endpoint
router.post('/test', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    // Try web push first (for browsers)
    if (webPushService.isEnabled()) {
      await webPushService.sendToUser(userId, {
        title: '🧪 Test Notification',
        body: 'This is a test notification from TaskFlow AI',
        icon: '/icon.png',
        data: { type: 'test' },
      });
    } else {
      // Fallback to Azure Notification Hub
      await notificationService.sendToUser(userId, {
        title: '🧪 Test Notification',
        body: 'This is a test notification from TaskFlow AI',
        icon: '/icon.png',
        data: { type: 'test' },
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent',
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
