'use client';

import { useState, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Task } from '@/types';

interface TaskFormProps {
  task?: Task;
  onClose?: () => void;
}

export function TaskForm({ task, onClose }: TaskFormProps) {
  const { createTask, updateTask, isLoading } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const isEditMode = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Task title is required');
      return;
    }

    if (isEditMode && task) {
      await updateTask(task.id, { title, description: description || undefined });
    } else {
      await createTask(title, description || undefined);
    }

    setTitle('');
    setDescription('');
    if (onClose) onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
          Task Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Build TaskFlow AI web app"
          className="w-full px-4 py-3 rounded-lg backdrop-blur-md text-white placeholder:text-gray-400 transition-all focus:outline-none"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.2)',
          }}
          onFocus={(e) => {
            e.target.style.border = '1px solid rgba(167, 139, 250, 0.5)';
            e.target.style.boxShadow = '0 0 20px rgba(167, 139, 250, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            e.target.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.2)';
          }}
          disabled={isLoading}
          maxLength={200}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details about this task..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg backdrop-blur-md text-white placeholder:text-gray-400 transition-all focus:outline-none resize-none"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.2)',
          }}
          onFocus={(e) => {
            e.target.style.border = '1px solid rgba(167, 139, 250, 0.5)';
            e.target.style.boxShadow = '0 0 20px rgba(167, 139, 250, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            e.target.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.2)';
          }}
          disabled={isLoading}
          maxLength={2000}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.8)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.6)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Task')}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-lg text-white font-medium transition-all"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
