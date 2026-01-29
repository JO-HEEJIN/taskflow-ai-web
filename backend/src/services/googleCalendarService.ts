import { google, calendar_v3 } from 'googleapis';
import { cosmosService } from './cosmosService';

/**
 * Google Calendar Service
 * Handles OAuth authentication and Calendar API interactions
 * for reclaim.ai-style smart scheduling
 */
class GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );
  }

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(userId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ],
      state: userId,  // Pass userId to callback
      prompt: 'consent'
    });
  }

  /**
   * Exchange auth code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiryDate: tokens.expiry_date!
    };
  }

  /**
   * Get calendar client for user with stored refresh token
   */
  async getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
    const userPrefs = await this.getUserSchedulingPreferences(userId);
    if (!userPrefs?.googleRefreshToken) {
      throw new Error('Google Calendar not connected');
    }

    this.oauth2Client.setCredentials({
      refresh_token: userPrefs.googleRefreshToken
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get user's free/busy times for a date range
   * Returns busy time slots from Google Calendar
   */
  async getFreeBusy(
    userId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<{ start: Date; end: Date }[]> {
    const calendar = await this.getCalendarClient(userId);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: 'primary' }]
      }
    });

    const busy = response.data.calendars?.primary?.busy || [];
    return busy.map(slot => ({
      start: new Date(slot.start!),
      end: new Date(slot.end!)
    }));
  }

  /**
   * Get calendar events for a date range
   */
  async getEvents(
    userId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    const calendar = await this.getCalendarClient(userId);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  }

  /**
   * Create calendar event for a TaskFlow task
   */
  async createEvent(
    userId: string,
    task: {
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
    }
  ): Promise<string> {
    const calendar = await this.getCalendarClient(userId);

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `[TaskFlow] ${task.title}`,
        description: task.description || 'Created by TaskFlow AI',
        start: { dateTime: task.startTime.toISOString() },
        end: { dateTime: task.endTime.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 10 }]
        },
        colorId: '9' // Blue color for TaskFlow events
      }
    });

    return event.data.id!;
  }

  /**
   * Update calendar event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: { startTime?: Date; endTime?: Date; title?: string }
  ): Promise<void> {
    const calendar = await this.getCalendarClient(userId);

    const requestBody: any = {};
    if (updates.startTime) requestBody.start = { dateTime: updates.startTime.toISOString() };
    if (updates.endTime) requestBody.end = { dateTime: updates.endTime.toISOString() };
    if (updates.title) requestBody.summary = `[TaskFlow] ${updates.title}`;

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody
    });
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const calendar = await this.getCalendarClient(userId);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    });
  }

  /**
   * Save user's Google Calendar tokens and preferences
   */
  async saveUserCalendarConnection(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    const container = cosmosService.getSchedulingPreferencesContainer();
    if (!container) {
      console.error('Scheduling preferences container not available');
      return;
    }

    const existingPrefs = await this.getUserSchedulingPreferences(userId);

    const prefs = {
      id: userId,
      userId,
      googleRefreshToken: refreshToken,
      googleCalendarConnected: true,
      // Default preferences
      workingHours: existingPrefs?.workingHours || { start: '09:00', end: '17:00' },
      preferredFocusTime: existingPrefs?.preferredFocusTime || 'morning',
      minBreakBetweenTasks: existingPrefs?.minBreakBetweenTasks || 15,
      maxDailyFocusHours: existingPrefs?.maxDailyFocusHours || 6,
      excludedDays: existingPrefs?.excludedDays || [0, 6], // Weekends
      updatedAt: new Date().toISOString()
    };

    await container.items.upsert(prefs);
    console.log(`✅ Saved Google Calendar connection for user: ${userId}`);
  }

  /**
   * Disconnect Google Calendar for user
   */
  async disconnectCalendar(userId: string): Promise<void> {
    const container = cosmosService.getSchedulingPreferencesContainer();
    if (!container) return;

    const existingPrefs = await this.getUserSchedulingPreferences(userId);
    if (!existingPrefs) return;

    const prefs = {
      ...existingPrefs,
      googleRefreshToken: undefined,
      googleCalendarConnected: false,
      updatedAt: new Date().toISOString()
    };

    await container.items.upsert(prefs);
    console.log(`✅ Disconnected Google Calendar for user: ${userId}`);
  }

  /**
   * Get user's scheduling preferences from Cosmos DB
   */
  async getUserSchedulingPreferences(userId: string): Promise<any | null> {
    const container = cosmosService.getSchedulingPreferencesContainer();
    if (!container) return null;

    try {
      const { resource } = await container.item(userId, userId).read();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  /**
   * Update user's scheduling preferences
   */
  async updateSchedulingPreferences(
    userId: string,
    updates: {
      workingHours?: { start: string; end: string };
      preferredFocusTime?: 'morning' | 'afternoon' | 'evening';
      minBreakBetweenTasks?: number;
      maxDailyFocusHours?: number;
      excludedDays?: number[];
    }
  ): Promise<void> {
    const container = cosmosService.getSchedulingPreferencesContainer();
    if (!container) return;

    const existingPrefs = await this.getUserSchedulingPreferences(userId) || {
      id: userId,
      userId,
      googleCalendarConnected: false
    };

    const prefs = {
      ...existingPrefs,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await container.items.upsert(prefs);
    console.log(`✅ Updated scheduling preferences for user: ${userId}`);
  }

  /**
   * Check if Google Calendar is connected for user
   */
  async isConnected(userId: string): Promise<boolean> {
    const prefs = await this.getUserSchedulingPreferences(userId);
    return prefs?.googleCalendarConnected === true && !!prefs?.googleRefreshToken;
  }
}

export const googleCalendarService = new GoogleCalendarService();
