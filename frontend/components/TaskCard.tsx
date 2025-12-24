'use client';

import { Task } from '@/types';
import { ProgressBar } from './ProgressBar';
import { useTaskStore } from '@/store/taskStore';
import { useState } from 'react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { deleteTask } = useTaskStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this task and all subtasks?')) {
      setIsDeleting(true);
      await deleteTask(task.id);
    }
  };

  const getStatusColor = () => {
    if (task.status === 'completed') return 'text-green-600';
    if (task.status === 'in_progress') return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          ✕
        </button>
      </div>

      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className={`font-medium ${getStatusColor()}`}>
            {task.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-gray-600">
            {task.progress}% ({task.subtasks.filter((st) => st.isCompleted).length}/
            {task.subtasks.length})
          </span>
        </div>
        <ProgressBar progress={task.progress} />
      </div>

      {task.subtasks.length === 0 && (
        <p className="text-xs text-gray-400 mt-2">No subtasks yet. Try AI breakdown!</p>
      )}
    </div>
  );
}
