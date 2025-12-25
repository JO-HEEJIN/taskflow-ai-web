'use client';

import { Handle, Position } from 'reactflow';
import { Subtask } from '@/types';

interface SubtaskNodeProps {
  data: {
    label: string;
    subtask: Subtask;
  };
}

export function SubtaskNode({ data }: SubtaskNodeProps) {
  const { label, subtask } = data;

  return (
    <div
      className="px-3 py-2 rounded-md bg-gray-100 border border-gray-300 text-xs shadow-sm hover:shadow-md transition-shadow"
      style={{ minWidth: '180px', maxWidth: '220px' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={subtask.isCompleted}
          readOnly
          className="h-3 w-3 rounded border-gray-300 text-primary-600 pointer-events-none flex-shrink-0"
        />
        <span
          className={`flex-1 min-w-0 break-words ${
            subtask.isCompleted ? 'line-through text-gray-500' : 'text-gray-700'
          }`}
        >
          {label}
        </span>
        {subtask.linkedTaskId && (
          <span className="text-blue-600 flex-shrink-0" title="Has linked task">
            🔗
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
