'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { api } from '@/lib/api';
import { Task } from '@/types';
import { TaskScheduleModal } from './TaskScheduleModal';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isTaskFlow: boolean;
}

interface TimeSlot {
  start: string;
  end: string;
}

export function CalendarView() {
  const { tasks } = useTaskStore();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  // Working hours (default 9 AM - 5 PM)
  const workingHours = { start: 9, end: 17 };
  const hourSlots = Array.from({ length: workingHours.end - workingHours.start }, (_, i) => workingHours.start + i);

  // Get week days
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  // Fetch calendar status and events
  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true);
      try {
        const status = await api.getCalendarStatus();
        setIsConnected(status.connected);

        if (status.connected) {
          const weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const { events } = await api.getCalendarEvents(currentWeekStart, weekEnd);
          setCalendarEvents(events);
        }
      } catch (error) {
        console.error('Failed to fetch calendar data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, [currentWeekStart]);

  // Get scheduled tasks for the week
  const scheduledTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.scheduledStartTime || !task.scheduledEndTime) return false;
      const startTime = new Date(task.scheduledStartTime);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return startTime >= currentWeekStart && startTime < weekEnd;
    });
  }, [tasks, currentWeekStart]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(now.setDate(diff)));
  };

  // Auto-schedule all pending tasks
  const handleAutoScheduleAll = async () => {
    setIsScheduling(true);
    try {
      const result = await api.rescheduleAllTasks();
      alert(`Scheduled ${result.scheduled} tasks. ${result.failed} failed.`);
      // Refresh tasks
      await useTaskStore.getState().fetchTasks();
    } catch (error) {
      console.error('Failed to auto-schedule tasks:', error);
      alert('Failed to auto-schedule tasks');
    } finally {
      setIsScheduling(false);
    }
  };

  // Get position for an event/task on the grid
  const getEventPosition = (startTime: string, endTime: string, dayIndex: number) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const top = ((startHour - workingHours.start) / (workingHours.end - workingHours.start)) * 100;
    const height = ((endHour - startHour) / (workingHours.end - workingHours.start)) * 100;

    return { top: `${top}%`, height: `${height}%` };
  };

  // Check if event is on a specific day
  const isEventOnDay = (eventStart: string, dayDate: Date) => {
    const eventDate = new Date(eventStart);
    return eventDate.toDateString() === dayDate.toDateString();
  };

  // Format time for display
  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour} ${ampm}`;
  };

  // Format date for header
  const formatDayHeader = (date: Date) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const isToday = date.toDateString() === new Date().toDateString();
    return {
      day: dayNames[date.getDay()],
      date: date.getDate(),
      isToday
    };
  };

  // Get unscheduled tasks (for the sidebar)
  const unscheduledTasks = useMemo(() => {
    return tasks.filter(task =>
      task.status === 'pending' &&
      !task.scheduledStartTime &&
      !task.isDeleted
    );
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <span className="text-sm text-gray-400">
            {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
              Google Calendar not connected
            </span>
          )}
          <button
            onClick={handleAutoScheduleAll}
            disabled={isScheduling || unscheduledTasks.length === 0}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isScheduling ? 'Scheduling...' : 'Auto-Schedule All'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {/* Day Headers */}
          <div className="flex border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
            <div className="w-16 shrink-0"></div>
            {weekDays.map((date, index) => {
              const { day, date: dayNum, isToday } = formatDayHeader(date);
              return (
                <div
                  key={index}
                  className={`flex-1 text-center py-2 border-l border-gray-700 ${
                    isToday ? 'bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="text-xs text-gray-500">{day}</div>
                  <div className={`text-lg font-semibold ${
                    isToday ? 'text-indigo-400' : 'text-gray-300'
                  }`}>
                    {dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="flex relative">
            {/* Time Labels */}
            <div className="w-16 shrink-0">
              {hourSlots.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-800 text-right pr-2"
                >
                  <span className="text-xs text-gray-500 relative -top-2">
                    {formatTime(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((date, dayIndex) => (
              <div
                key={dayIndex}
                className="flex-1 border-l border-gray-700 relative"
              >
                {/* Hour lines */}
                {hourSlots.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-gray-800"
                  ></div>
                ))}

                {/* Scheduled TaskFlow Tasks */}
                {scheduledTasks
                  .filter(task => isEventOnDay(task.scheduledStartTime!, date))
                  .map((task) => {
                    const position = getEventPosition(
                      task.scheduledStartTime!,
                      task.scheduledEndTime!,
                      dayIndex
                    );
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="absolute left-1 right-1 bg-indigo-600/80 rounded-md px-2 py-1 cursor-pointer hover:bg-indigo-600 transition-colors overflow-hidden"
                        style={{ top: position.top, height: position.height }}
                      >
                        <div className="text-xs font-medium text-white truncate">
                          {task.title}
                        </div>
                        <div className="text-[10px] text-indigo-200">
                          {new Date(task.scheduledStartTime!).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    );
                  })}

                {/* Google Calendar Events (non-TaskFlow) */}
                {calendarEvents
                  .filter(event => !event.isTaskFlow && isEventOnDay(event.start, date))
                  .map((event) => {
                    const position = getEventPosition(event.start, event.end, dayIndex);
                    return (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 bg-gray-600/60 rounded-md px-2 py-1 overflow-hidden border border-gray-500"
                        style={{ top: position.top, height: position.height }}
                      >
                        <div className="text-xs font-medium text-gray-300 truncate">
                          {event.title}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(event.start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Unscheduled Tasks */}
        <div className="w-64 border-l border-gray-700 bg-gray-800/50 overflow-auto">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300">
              Unscheduled Tasks ({unscheduledTasks.length})
            </h3>
          </div>
          <div className="p-2 space-y-2">
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                All tasks are scheduled!
              </p>
            ) : (
              unscheduledTasks.map((task) => {
                const totalMinutes = task.subtasks.reduce(
                  (sum, st) => sum + (st.estimatedMinutes || 5),
                  0
                );
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                  >
                    <div className="text-sm text-white truncate">{task.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {totalMinutes} min
                      </span>
                      {task.priority && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Task Schedule Modal */}
      {selectedTask && (
        <TaskScheduleModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onScheduled={() => {
            setSelectedTask(null);
            useTaskStore.getState().fetchTasks();
          }}
        />
      )}
    </div>
  );
}
