'use client';

import { useTaskStore } from '@/store/taskStore';
import { TaskGraphView } from './TaskGraphView';
import { TaskDetail } from './TaskDetail';
import { useEffect, useState } from 'react';
import { Task } from '@/types';

export function TaskList() {
  const { tasks, fetchTasks, isLoading, error } = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={() => fetchTasks()}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg mb-2">No tasks yet</p>
        <p className="text-gray-400 text-sm">Create your first task to get started!</p>
      </div>
    );
  }

  return (
    <>
      <TaskGraphView
        tasks={tasks}
        onTaskClick={(taskId) => setSelectedTaskId(taskId)}
      />

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
