'use client';

import { useState } from 'react';
import { TaskList } from '@/components/TaskList';
import { TaskForm } from '@/components/TaskForm';

export default function Home() {
  const [showTaskForm, setShowTaskForm] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                TaskFlow AI
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-Powered Task Management
              </p>
            </div>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium shadow-md hover:shadow-lg transition-shadow"
            >
              + New Task
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Task Form */}
        {showTaskForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
            <TaskForm onClose={() => setShowTaskForm(false)} />
          </div>
        )}

        {/* Task List */}
        <TaskList />
      </div>
    </main>
  );
}
