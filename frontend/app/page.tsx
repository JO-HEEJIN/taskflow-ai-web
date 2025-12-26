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
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => setShowTaskForm(false)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setShowTaskForm(false);
          }}
        >
          <div
            className="rounded-2xl max-w-2xl w-full p-8 backdrop-blur-md"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              boxShadow: '0 0 40px rgba(167, 139, 250, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.03)',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white" style={{ textShadow: '0 0 20px rgba(167, 139, 250, 0.5)' }}>
                Create New Task
              </h2>
              <button
                onClick={() => setShowTaskForm(false)}
                className="text-gray-400 hover:text-purple-300 text-2xl transition-colors"
                style={{ textShadow: '0 0 10px rgba(167, 139, 250, 0.5)' }}
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
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => setEditingTaskId(null)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setEditingTaskId(null);
          }}
        >
          <div
            className="rounded-2xl max-w-2xl w-full p-8 backdrop-blur-md"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              boxShadow: '0 0 40px rgba(167, 139, 250, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.03)',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white" style={{ textShadow: '0 0 20px rgba(167, 139, 250, 0.5)' }}>
                Edit Task
              </h2>
              <button
                onClick={() => setEditingTaskId(null)}
                className="text-gray-400 hover:text-purple-300 text-2xl transition-colors"
                style={{ textShadow: '0 0 10px rgba(167, 139, 250, 0.5)' }}
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
