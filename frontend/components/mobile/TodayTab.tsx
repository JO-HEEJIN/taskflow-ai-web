'use client';

import { Task } from '@/types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';

interface TodayTabProps {
  task: Task;
  onBreakdownAndFocus?: () => void;
}

export function TodayTab({ task, onBreakdownAndFocus }: TodayTabProps) {
  const { toggleSubtask } = useTaskStore();

  // Get AI breakdown subtasks
  const subtasks = task.subtasks
    .filter(st => !st.isArchived)
    .sort((a, b) => a.order - b.order);

  if (subtasks.length === 0) {
    return (
      <button
        onClick={onBreakdownAndFocus}
        className="w-full text-center py-16 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
      >
        <p className="text-lg text-white/70 mb-2">No subtasks yet</p>
        <p className="text-sm text-white/40">Tap to AI breakdown & start Focus Mode</p>
      </button>
    );
  }

  const handleToggle = async (subtaskId: string) => {
    await toggleSubtask(task.id, subtaskId);
  };

  return (
    <div className="space-y-3">
      {subtasks.map((subtask, index) => (
        <div
          key={subtask.id}
          className="flex items-start gap-3 py-3 px-4 rounded-lg transition-colors"
          style={{
            backgroundColor: subtask.isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Checkbox */}
          <button
            onClick={() => handleToggle(subtask.id)}
            className="flex-shrink-0 mt-0.5"
          >
            {subtask.isCompleted ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: '#22c55e' }} />
            ) : (
              <Circle className="w-5 h-5 text-white/30" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Subtask title */}
            <p
              className={`text-[14px] font-medium mb-1 ${
                subtask.isCompleted ? 'line-through text-white/40' : 'text-white'
              }`}
            >
              {index + 1}. {subtask.title}
            </p>

            {/* Estimated time */}
            {subtask.estimatedMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[12px] text-white/30">
                  {subtask.estimatedMinutes} min
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
