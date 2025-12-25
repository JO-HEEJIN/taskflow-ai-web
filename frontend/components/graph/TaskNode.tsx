'use client';

import { Handle, Position } from 'reactflow';
import { Task } from '@/types';

interface TaskNodeProps {
  data: {
    label: string;
    task: Task;
    isCenter?: boolean;
    isLinked?: boolean;
  };
}

export function TaskNode({ data }: TaskNodeProps) {
  const { label, task, isCenter, isLinked } = data;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md bg-white cursor-pointer hover:shadow-lg transition-all ${
        isCenter
          ? 'border-primary-600 bg-primary-50'
          : isLinked
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300'
      }`}
      style={{ minWidth: '200px', maxWidth: '250px' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="flex items-start gap-2">
        {isCenter && <span className="text-lg">⭐</span>}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 line-clamp-2 break-words">
            {label}
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''} • {task.progress}%
          </div>

          {isLinked && (
            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <span>🔗</span>
              <span>Linked task</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
