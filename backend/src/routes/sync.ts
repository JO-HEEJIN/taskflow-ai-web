import { Router, Request, Response } from 'express';
import { syncService } from '../services/syncService';
import { webPushService } from '../services/webPushService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Generate new sync code for device
router.get('/code', async (req: Request, res: Response) => {
  try {
    // Get or generate device token
    let deviceToken = req.headers['x-device-token'] as string;

    if (!deviceToken) {
      deviceToken = uuidv4();
    }

    const session = await syncService.createSyncSession(deviceToken);

    res.json({
      syncCode: session.syncCode,
      deviceToken,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Error generating sync code:', error);
    res.status(500).json({ error: 'Failed to generate sync code' });
  }
});

// Link device to existing sync code
router.post('/link', async (req: Request, res: Response) => {
  try {
    const { syncCode } = req.body;
    let deviceToken = req.headers['x-device-token'] as string;

    if (!syncCode || syncCode.trim().length === 0) {
      return res.status(400).json({ error: 'Sync code is required' });
    }

    if (!deviceToken) {
      deviceToken = uuidv4();
    }

    const session = await syncService.linkDevice(syncCode, deviceToken);

    if (!session) {
      return res.status(404).json({ error: 'Invalid sync code' });
    }

    // Send notification: Sync Success
    await webPushService.notifySyncSuccess(syncCode);

    res.json({
      message: 'Device linked successfully',
      syncCode: session.syncCode,
      deviceToken,
      deviceCount: session.deviceTokens.length,
    });
  } catch (error) {
    console.error('Error linking device:', error);
    res.status(500).json({ error: 'Failed to link device' });
  }
});

// Get sync session info
router.get('/session', async (req: Request, res: Response) => {
  try {
    const syncCode = req.headers['x-sync-code'] as string;

    if (!syncCode) {
      return res.status(400).json({ error: 'Missing x-sync-code header' });
    }

    const session = await syncService.getSyncSession(syncCode);

    if (!session) {
      return res.status(404).json({ error: 'Sync session not found' });
    }

    res.json({
      syncCode: session.syncCode,
      deviceCount: session.deviceTokens.length,
      createdAt: session.createdAt,
      lastSyncAt: session.lastSyncAt,
    });
  } catch (error) {
    console.error('Error fetching sync session:', error);
    res.status(500).json({ error: 'Failed to fetch sync session' });
  }
});

export default router;
