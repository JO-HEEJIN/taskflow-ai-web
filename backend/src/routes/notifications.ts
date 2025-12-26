import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notificationService';

const router = Router();

// Register device for push notifications
router.post('/register', async (req: Request, res: Response) => {
  try {
    const syncCode = req.headers['x-sync-code'] as string;
    const { deviceId } = req.body;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Register device with sync code tag
    await notificationService.registerDevice(syncCode, deviceId);

    res.json({
      success: true,
      message: 'Device registered for notifications',
      syncCode,
    });
  } catch (error) {
    console.error('Error registering device for notifications:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Test notification endpoint
router.post('/test', async (req: Request, res: Response) => {
  try {
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    await notificationService.sendToUser(syncCode, {
      title: '🧪 Test Notification',
      body: 'This is a test notification from TaskFlow AI',
      icon: '/icon.png',
      data: { type: 'test' },
    });

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
