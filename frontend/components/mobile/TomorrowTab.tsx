'use client';

import { Task } from '@/types';
import { useCoachStore } from '@/store/useCoachStore';
import { Play, Clock } from 'lucide-react';
import { unlockAudioForMobile, unlockTimerCompletionAudio } from '@/lib/sounds';

interface TomorrowTabProps {
  task: Task;
}

export function TomorrowTab({ task }: TomorrowTabProps) {
  const { enterFocusMode } = useCoachStore();

  // Find next incomplete subtask
  const nextSubtask = task.subtasks
    .filter(st => !st.isCompleted && !st.isArchived)
    .sort((a, b) => a.order - b.order)[0];

  const handleStartFocus = () => {
    if (nextSubtask) {
      // Unlock audio for mobile browsers (non-blocking)
      unlockAudioForMobile().catch(err => console.warn('Failed to unlock audio:', err));

      // Unlock timer-complete.mp3 for iOS
      unlockTimerCompletionAudio();

      // Immediately enter focus mode
      enterFocusMode(task.id, task.subtasks);
    }
  };

  if (!nextSubtask) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-white/70 mb-2">All tasks completed!</p>
        <p className="text-sm text-white/40">Great job!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-2">
      {/* Next Subtask */}
      <div className="space-y-4">
        <p className="text-xs text-white/40 uppercase tracking-wide">
          Next Up
        </p>
        <h3 className="text-xl text-white font-light">
          {nextSubtask.title}
        </h3>

        {nextSubtask.estimatedMinutes && (
          <div className="flex items-center gap-2 text-white/50">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-light">{nextSubtask.estimatedMinutes} minutes</span>
          </div>
        )}
      </div>

      {/* Start Focus Mode Button */}
      <button
        onClick={handleStartFocus}
        className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white py-4 rounded-full font-light transition-all"
      >
        <Play className="w-4 h-4" fill="currentColor" />
        <span>Start Focus Mode</span>
      </button>

      {/* Upcoming Tasks */}
      {task.subtasks.filter(st => !st.isCompleted && !st.isArchived && st.id !== nextSubtask.id).length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-wide">
            Up Next
          </p>
          <div className="space-y-2">
            {task.subtasks
              .filter(st => !st.isCompleted && !st.isArchived && st.id !== nextSubtask.id)
              .slice(0, 3)
              .map((subtask, index) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-3 py-2"
                >
                  <span className="text-xs text-white/30 w-6">{index + 2}.</span>
                  <span className="text-sm text-white/60 font-light flex-1">{subtask.title}</span>
                  {subtask.estimatedMinutes && (
                    <span className="text-xs text-white/30">{subtask.estimatedMinutes}m</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
