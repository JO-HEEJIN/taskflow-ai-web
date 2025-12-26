'use client';

import { useState } from 'react';
import { TaskList } from '@/components/TaskList';
import { TaskForm } from '@/components/TaskForm';
import { useTaskStore } from '@/store/taskStore';

export default function Home() {
  const { tasks } = useTaskStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : undefined;

  return (
    <main className="min-h-screen overflow-hidden">
      {/* Task Form Modal */}
      {showTaskForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTaskForm(false)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setShowTaskForm(false);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Task</h2>
              <button
                onClick={() => setShowTaskForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <TaskForm onClose={() => setShowTaskForm(false)} />
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTaskId && editingTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingTaskId(null)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setEditingTaskId(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Task</h2>
              <button
                onClick={() => setEditingTaskId(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <TaskForm task={editingTask} onClose={() => setEditingTaskId(null)} />
          </div>
        </div>
      )}

      {/* Full screen task graph - click/tap background to create new task */}
      <TaskList
        onBackgroundClick={() => setShowTaskForm(true)}
        onEditTask={(taskId) => setEditingTaskId(taskId)}
      />
    </main>
  );
}
