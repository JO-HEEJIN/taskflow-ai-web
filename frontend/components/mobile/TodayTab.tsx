'use client';

import { Task } from '@/types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { api } from '@/lib/api';

interface TodayTabProps {
  task: Task;
  onBreakdownAndFocus?: () => void;
}

export function TodayTab({ task, onBreakdownAndFocus }: TodayTabProps) {
  const { toggleSubtask } = useTaskStore();
  const [breakingDownSubtaskId, setBreakingDownSubtaskId] = useState<string | null>(null);

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

        {/* Sparkle "Tap here!" animation */}
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="mt-4 inline-block"
        >
          <span
            className="text-lg font-semibold"
            style={{
              background: 'linear-gradient(135deg, #c084fc 0%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 20px rgba(192, 132, 252, 0.5)',
              filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.6))',
            }}
          >
            ✨ Tap here! ✨
          </span>
        </motion.div>
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
                {/* 🔥 isComposite indicator for >10 min tasks */}
                {(subtask as any).isComposite && (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full ml-1">
                    🔥 COMPOSITE
                  </span>
                )}
              </div>
            )}

            {/* Break Down Further button for composite tasks */}
            {(subtask as any).isComposite && !(subtask as any).children?.length && (
              <button
                onClick={async () => {
                  setBreakingDownSubtaskId(subtask.id);
                  try {
                    await api.deepDiveBreakdown(task.id, subtask.id);
                    // Task will be refetched automatically by taskStore
                  } catch (error) {
                    console.error('Deep dive error:', error);
                    alert('Failed to break down task. This feature works in both guest and authenticated modes.');
                  } finally {
                    setBreakingDownSubtaskId(null);
                  }
                }}
                disabled={breakingDownSubtaskId === subtask.id}
                className="mt-2 text-[11px] bg-purple-600/20 text-purple-300 px-2 py-1 rounded-md flex items-center gap-1 disabled:opacity-50"
              >
                {breakingDownSubtaskId === subtask.id ? '⏳ Breaking down...' : '🔍 Break Down Further'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
