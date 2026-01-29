'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types';
import { api } from '@/lib/api';

interface TaskScheduleModalProps {
  task: Task;
  onClose: () => void;
  onScheduled: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
}

export function TaskScheduleModal({ task, onClose, onScheduled }: TaskScheduleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(task.priority || 'medium');
  const [dueDate, setDueDate] = useState(task.dueDate || '');

  // Calculate task duration
  const totalMinutes = task.subtasks.reduce(
    (sum, st) => sum + (st.estimatedMinutes || 5),
    0
  );

  // Fetch available slots
  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoading(true);
      try {
        const { slots } = await api.getAvailableSlots(totalMinutes);
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Failed to fetch slots:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlots();
  }, [totalMinutes]);

  // Auto-schedule the task
  const handleAutoSchedule = async () => {
    setIsAutoScheduling(true);
    try {
      // First update task with priority and due date
      await api.updateTask(task.id, { priority, dueDate: dueDate || undefined });
      // Then auto-schedule
      await api.autoScheduleTask(task.id);
      onScheduled();
    } catch (error) {
      console.error('Failed to auto-schedule:', error);
      alert('Failed to schedule task');
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // Schedule to a specific slot
  const handleScheduleToSlot = async (slot: TimeSlot) => {
    setIsLoading(true);
    try {
      await api.updateTask(task.id, {
        scheduledStartTime: slot.start,
        scheduledEndTime: slot.end,
        priority,
        dueDate: dueDate || undefined,
        isAutoScheduled: false
      });
      onScheduled();
    } catch (error) {
      console.error('Failed to schedule:', error);
      alert('Failed to schedule task');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear schedule
  const handleClearSchedule = async () => {
    if (!task.scheduledStartTime) return;
    setIsLoading(true);
    try {
      await api.clearTaskSchedule(task.id);
      onScheduled();
    } catch (error) {
      console.error('Failed to clear schedule:', error);
      alert('Failed to clear schedule');
    } finally {
      setIsLoading(false);
    }
  };

  // Format slot for display
  const formatSlot = (slot: TimeSlot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return { dateStr, startTime, endTime };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white truncate">{task.title}</h2>
            <p className="text-sm text-gray-400">
              Duration: {totalMinutes} minutes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-auto max-h-[60vh]">
          {/* Current Schedule */}
          {task.scheduledStartTime && (
            <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-300 font-medium">Currently Scheduled</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(task.scheduledStartTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })} at {new Date(task.scheduledStartTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
                <button
                  onClick={handleClearSchedule}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Auto Schedule Button */}
          <button
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="w-full mb-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAutoScheduling ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Finding best time...
              </span>
            ) : (
              'Auto-Schedule (Best Time)'
            )}
          </button>

          {/* Available Slots */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              Or pick a time slot:
            </h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No available slots found in the next 7 days
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {availableSlots.slice(0, 10).map((slot, index) => {
                  const { dateStr, startTime, endTime } = formatSlot(slot);
                  const isSelected = selectedSlot?.start === slot.start;
                  return (
                    <button
                      key={index}
                      onClick={() => handleScheduleToSlot(slot)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{dateStr}</div>
                      <div className="text-xs text-gray-400">
                        {startTime} - {endTime}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
