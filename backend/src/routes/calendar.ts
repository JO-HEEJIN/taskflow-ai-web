import { Router, Request, Response } from 'express';
import { googleCalendarService } from '../services/googleCalendarService';
import { schedulingService } from '../services/schedulingService';

const router = Router();

// ============================================
// Google Calendar OAuth Endpoints
// ============================================

/**
 * GET /api/calendar/auth/google
 * Get OAuth URL for Google Calendar authorization
 */
router.get('/auth/google', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const authUrl = googleCalendarService.getAuthUrl(userId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * GET /api/calendar/auth/google/callback
 * OAuth callback - exchange code for tokens
 */
router.get('/auth/google/callback', async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=error&reason=missing_params`);
  }

  try {
    const tokens = await googleCalendarService.exchangeCodeForTokens(code as string);

    // Save refresh token to user's scheduling preferences
    await googleCalendarService.saveUserCalendarConnection(userId as string, tokens.refreshToken);

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=connected`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=error&reason=oauth_failed`);
  }
});

/**
 * DELETE /api/calendar/auth/google
 * Disconnect Google Calendar
 */
router.delete('/auth/google', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    await googleCalendarService.disconnectCalendar(userId);
    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

/**
 * GET /api/calendar/status
 * Check if Google Calendar is connected
 */
router.get('/status', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const isConnected = await googleCalendarService.isConnected(userId);
    const preferences = await googleCalendarService.getUserSchedulingPreferences(userId);
    res.json({
      connected: isConnected,
      preferences: preferences ? {
        workingHours: preferences.workingHours,
        preferredFocusTime: preferences.preferredFocusTime,
        minBreakBetweenTasks: preferences.minBreakBetweenTasks,
        excludedDays: preferences.excludedDays
      } : null
    });
  } catch (error) {
    console.error('Error checking calendar status:', error);
    res.status(500).json({ error: 'Failed to check calendar status' });
  }
});

// ============================================
// Calendar Events Endpoints
// ============================================

/**
 * GET /api/calendar/events
 * Get calendar events for a date range (from Google Calendar)
 */
router.get('/events', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { start, end } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  if (!start || !end) {
    return res.status(400).json({ error: 'Missing start or end date' });
  }

  try {
    const events = await googleCalendarService.getEvents(
      userId,
      new Date(start as string),
      new Date(end as string)
    );

    res.json({
      events: events.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        isTaskFlow: event.summary?.startsWith('[TaskFlow]')
      }))
    });
  } catch (error: any) {
    if (error.message === 'Google Calendar not connected') {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// ============================================
// Scheduling Endpoints
// ============================================

/**
 * GET /api/calendar/slots
 * Get available time slots for scheduling
 */
router.get('/slots', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { duration, startDate, days } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const preferences = await googleCalendarService.getUserSchedulingPreferences(userId) || {
      workingHours: { start: '09:00', end: '17:00' },
      preferredFocusTime: 'morning',
      minBreakBetweenTasks: 15,
      excludedDays: [0, 6],
      googleCalendarConnected: false
    };

    const slots = await schedulingService.findAvailableSlots(
      userId,
      parseInt(duration as string) || 30,
      preferences,
      startDate ? new Date(startDate as string) : new Date(),
      parseInt(days as string) || 7
    );

    res.json({
      slots: slots.slice(0, 20).map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error finding available slots:', error);
    res.status(500).json({ error: 'Failed to find available slots' });
  }
});

/**
 * POST /api/calendar/schedule/:taskId
 * Auto-schedule a specific task
 */
router.post('/schedule/:taskId', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { taskId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const preferences = await googleCalendarService.getUserSchedulingPreferences(userId) || {
      workingHours: { start: '09:00', end: '17:00' },
      preferredFocusTime: 'morning',
      minBreakBetweenTasks: 15,
      excludedDays: [0, 6],
      googleCalendarConnected: false
    };

    const task = await schedulingService.autoScheduleTask(userId, taskId, preferences);

    if (!task) {
      return res.status(404).json({ error: 'No available slots found or task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error scheduling task:', error);
    res.status(500).json({ error: 'Failed to schedule task' });
  }
});

/**
 * POST /api/calendar/reschedule-all
 * Reschedule all pending tasks
 */
router.post('/reschedule-all', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const preferences = await googleCalendarService.getUserSchedulingPreferences(userId) || {
      workingHours: { start: '09:00', end: '17:00' },
      preferredFocusTime: 'morning',
      minBreakBetweenTasks: 15,
      excludedDays: [0, 6],
      googleCalendarConnected: false
    };

    const result = await schedulingService.rescheduleAllTasks(userId, preferences);
    res.json(result);
  } catch (error) {
    console.error('Error rescheduling tasks:', error);
    res.status(500).json({ error: 'Failed to reschedule tasks' });
  }
});

/**
 * DELETE /api/calendar/schedule/:taskId
 * Clear schedule for a task
 */
router.delete('/schedule/:taskId', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { taskId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    const task = await schedulingService.clearTaskSchedule(userId, taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error clearing schedule:', error);
    res.status(500).json({ error: 'Failed to clear schedule' });
  }
});

// ============================================
// Preferences Endpoints
// ============================================

/**
 * PUT /api/calendar/preferences
 * Update scheduling preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { workingHours, preferredFocusTime, minBreakBetweenTasks, excludedDays } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  try {
    await googleCalendarService.updateSchedulingPreferences(userId, {
      workingHours,
      preferredFocusTime,
      minBreakBetweenTasks,
      excludedDays
    });

    const updatedPrefs = await googleCalendarService.getUserSchedulingPreferences(userId);
    res.json({ preferences: updatedPrefs });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
