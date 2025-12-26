'use client';

import { useTaskStore } from '@/store/taskStore';
import { TaskGraphView } from './TaskGraphView';
import { TaskDetail } from './TaskDetail';
import { KanbanView } from './KanbanView';
import { useEffect, useState } from 'react';
import { Task } from '@/types';

interface TaskListProps {
  onBackgroundClick?: () => void;
  onEditTask?: (taskId: string) => void;
}

export function TaskList({ onBackgroundClick, onEditTask }: TaskListProps) {
  const { tasks, fetchTasks, isLoading, error } = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'constellation' | 'kanban'>('constellation');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={() => fetchTasks()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center cursor-pointer"
        onClick={onBackgroundClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          if (onBackgroundClick) onBackgroundClick();
        }}
      >
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-2">No tasks yet</p>
          <p className="text-gray-400 text-sm">Click anywhere to create your first task!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'constellation' ? (
        <TaskGraphView
          tasks={tasks}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          onEditTask={onEditTask}
          onBackgroundClick={onBackgroundClick}
          onViewModeToggle={() => setViewMode('kanban')}
        />
      ) : (
        <KanbanView
          tasks={tasks}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          onClose={() => setViewMode('constellation')}
        />
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
