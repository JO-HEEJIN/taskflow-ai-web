import { Task, UserSchedulingPreferences } from '../types';
import { googleCalendarService } from './googleCalendarService';
import { taskService } from './taskService';

interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * Scheduling Service
 * Handles reclaim.ai-style auto-scheduling for TaskFlow tasks
 * Finds available time slots and automatically schedules tasks
 */
class SchedulingService {

  /**
   * Find available time slots for a task
   * Considers: working hours, existing calendar events, other scheduled tasks
   */
  async findAvailableSlots(
    userId: string,
    durationMinutes: number,
    preferences: UserSchedulingPreferences,
    startDate: Date = new Date(),
    daysToSearch: number = 7
  ): Promise<TimeSlot[]> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysToSearch);

    // Get busy times from Google Calendar (if connected)
    let busySlots: TimeSlot[] = [];
    if (preferences.googleCalendarConnected) {
      try {
        busySlots = await googleCalendarService.getFreeBusy(userId, startDate, endDate);
      } catch (error) {
        console.error('Failed to get calendar busy times:', error);
        // Continue without calendar data
      }
    }

    // Get already scheduled TaskFlow tasks
    const tasks = await taskService.getTasksBySyncCode(userId);
    const scheduledTasks = tasks.filter(t => t.scheduledStartTime && t.scheduledEndTime);

    scheduledTasks.forEach(task => {
      busySlots.push({
        start: new Date(task.scheduledStartTime!),
        end: new Date(task.scheduledEndTime!)
      });
    });

    // Find free slots
    const availableSlots: TimeSlot[] = [];
    const workStart = this.parseTime(preferences.workingHours?.start || '09:00');
    const workEnd = this.parseTime(preferences.workingHours?.end || '17:00');
    const breakMinutes = preferences.minBreakBetweenTasks || 15;

    for (let day = 0; day < daysToSearch; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);

      // Skip excluded days (weekends, etc.)
      const excludedDays = preferences.excludedDays || [0, 6];
      if (excludedDays.includes(currentDate.getDay())) continue;

      // Skip past hours for today
      const isToday = currentDate.toDateString() === new Date().toDateString();

      // Generate potential slots for this day
      const daySlots = this.generateDaySlots(
        currentDate,
        workStart,
        workEnd,
        durationMinutes,
        breakMinutes,
        isToday
      );

      // Filter out busy times
      for (const slot of daySlots) {
        if (!this.isSlotBusy(slot, busySlots)) {
          availableSlots.push(slot);
        }
      }
    }

    // Sort by preference (morning/afternoon/evening)
    return this.sortByPreference(availableSlots, preferences.preferredFocusTime || 'morning');
  }

  /**
   * Auto-schedule a task to the best available slot
   */
  async autoScheduleTask(
    userId: string,
    taskId: string,
    preferences: UserSchedulingPreferences
  ): Promise<Task | null> {
    const task = await taskService.getTaskById(taskId, userId);
    if (!task) return null;

    // Calculate total duration from subtasks
    const totalMinutes = task.subtasks.reduce(
      (sum, st) => sum + (st.estimatedMinutes || 5), 0
    );

    // Find best slot
    const slots = await this.findAvailableSlots(userId, totalMinutes, preferences);
    if (slots.length === 0) {
      console.log(`❌ No available slots found for task: ${task.title}`);
      return null;
    }

    const bestSlot = slots[0];
    console.log(`✅ Found slot for task "${task.title}": ${bestSlot.start.toISOString()}`);

    // Update task with schedule
    let updatedTask = await taskService.updateTask(taskId, userId, {
      scheduledStartTime: bestSlot.start.toISOString(),
      scheduledEndTime: bestSlot.end.toISOString(),
      isAutoScheduled: true
    });

    // Create Google Calendar event if connected
    if (preferences.googleCalendarConnected && updatedTask) {
      try {
        const eventId = await googleCalendarService.createEvent(userId, {
          title: task.title,
          description: task.description,
          startTime: bestSlot.start,
          endTime: bestSlot.end
        });

        updatedTask = await taskService.updateTask(taskId, userId, {
          googleCalendarEventId: eventId
        });
        console.log(`📅 Created Google Calendar event: ${eventId}`);
      } catch (error) {
        console.error('Failed to create calendar event:', error);
        // Task is still scheduled in TaskFlow, just not in Google Calendar
      }
    }

    return updatedTask;
  }

  /**
   * Reschedule all pending tasks optimally
   */
  async rescheduleAllTasks(
    userId: string,
    preferences: UserSchedulingPreferences
  ): Promise<{ scheduled: number; failed: number }> {
    const tasks = await taskService.getTasksBySyncCode(userId);
    const pendingTasks = tasks.filter(t =>
      t.status === 'pending' && !t.scheduledStartTime && !t.isDeleted
    );

    // Sort by priority and due date
    pendingTasks.sort((a, b) => {
      // Priority order: high > medium > low
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'low'];
      const bPriority = priorityOrder[b.priority || 'low'];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return 0;
    });

    let scheduled = 0;
    let failed = 0;

    for (const task of pendingTasks) {
      const result = await this.autoScheduleTask(userId, task.id, preferences);
      if (result) {
        scheduled++;
      } else {
        failed++;
      }
    }

    console.log(`📅 Rescheduled ${scheduled} tasks, ${failed} failed`);
    return { scheduled, failed };
  }

  /**
   * Clear schedule for a task (remove from calendar)
   */
  async clearTaskSchedule(userId: string, taskId: string): Promise<Task | null> {
    const task = await taskService.getTaskById(taskId, userId);
    if (!task) return null;

    // Delete Google Calendar event if exists
    if (task.googleCalendarEventId) {
      try {
        await googleCalendarService.deleteEvent(userId, task.googleCalendarEventId);
        console.log(`🗑️ Deleted Google Calendar event: ${task.googleCalendarEventId}`);
      } catch (error) {
        console.error('Failed to delete calendar event:', error);
      }
    }

    // Clear schedule from task
    return await taskService.updateTask(taskId, userId, {
      scheduledStartTime: undefined,
      scheduledEndTime: undefined,
      isAutoScheduled: false,
      googleCalendarEventId: undefined
    });
  }

  // ============================================
  // Helper Methods
  // ============================================

  private parseTime(time: string): { hours: number; minutes: number } {
    const [hours, minutes] = time.split(':').map(Number);
    return { hours: hours || 9, minutes: minutes || 0 };
  }

  private generateDaySlots(
    date: Date,
    workStart: { hours: number; minutes: number },
    workEnd: { hours: number; minutes: number },
    durationMinutes: number,
    breakMinutes: number,
    isToday: boolean
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotInterval = 30; // 30-minute intervals

    let currentTime = new Date(date);
    currentTime.setHours(workStart.hours, workStart.minutes, 0, 0);

    // If today, start from current time (rounded up to next 30 min)
    if (isToday) {
      const now = new Date();
      if (now > currentTime) {
        currentTime = new Date(now);
        // Round up to next 30 minutes
        const minutes = currentTime.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 30) * 30;
        currentTime.setMinutes(roundedMinutes, 0, 0);
        if (roundedMinutes >= 60) {
          currentTime.setHours(currentTime.getHours() + 1);
          currentTime.setMinutes(0);
        }
      }
    }

    const endOfDay = new Date(date);
    endOfDay.setHours(workEnd.hours, workEnd.minutes, 0, 0);

    while (currentTime.getTime() + durationMinutes * 60000 <= endOfDay.getTime()) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(currentTime.getTime() + durationMinutes * 60000)
      });
      // Add break time between slots
      currentTime.setMinutes(currentTime.getMinutes() + slotInterval);
    }

    return slots;
  }

  private isSlotBusy(slot: TimeSlot, busySlots: TimeSlot[]): boolean {
    return busySlots.some(busy =>
      (slot.start < busy.end && slot.end > busy.start)
    );
  }

  private sortByPreference(
    slots: TimeSlot[],
    preference: 'morning' | 'afternoon' | 'evening'
  ): TimeSlot[] {
    const preferenceHours: Record<string, { start: number; end: number }> = {
      morning: { start: 6, end: 12 },
      afternoon: { start: 12, end: 17 },
      evening: { start: 17, end: 22 }
    };

    const pref = preferenceHours[preference] || preferenceHours.morning;

    return slots.sort((a, b) => {
      const aInPref = a.start.getHours() >= pref.start && a.start.getHours() < pref.end;
      const bInPref = b.start.getHours() >= pref.start && b.start.getHours() < pref.end;

      if (aInPref && !bInPref) return -1;
      if (!aInPref && bInPref) return 1;
      return a.start.getTime() - b.start.getTime();
    });
  }
}

export const schedulingService = new SchedulingService();
