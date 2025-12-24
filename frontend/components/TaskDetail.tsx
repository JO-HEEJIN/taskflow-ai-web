'use client';

import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { ProgressBar } from './ProgressBar';
import { AIBreakdownModal } from './AIBreakdownModal';
import { useState } from 'react';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const { toggleSubtask } = useTaskStore();
  const [showAIModal, setShowAIModal] = useState(false);

  const handleToggleSubtask = async (subtaskId: string) => {
    await toggleSubtask(task.id, subtaskId);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{task.title}</h2>
                {task.description && (
                  <p className="text-gray-600">{task.description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl ml-4"
              >
                ✕
              </button>
            </div>

            {/* Progress Section */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-2xl font-bold text-primary-600">{task.progress}%</span>
              </div>
              <ProgressBar progress={task.progress} className="h-3" />
              <div className="mt-2 text-xs text-gray-500">
                {task.subtasks.filter((st) => st.isCompleted).length} of {task.subtasks.length} subtasks completed
              </div>
            </div>

            {/* Subtasks */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Subtasks</h3>
                {task.subtasks.length === 0 && (
                  <button
                    onClick={() => setShowAIModal(true)}
                    className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    ✨ AI Breakdown
                  </button>
                )}
              </div>

              {task.subtasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No subtasks yet</p>
                  <p className="text-sm mt-1">Use AI to break down this task!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {task.subtasks
                    .sort((a, b) => a.order - b.order)
                    .map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.isCompleted}
                          onChange={() => handleToggleSubtask(subtask.id)}
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <span
                          className={`flex-1 ${
                            subtask.isCompleted
                              ? 'line-through text-gray-400'
                              : 'text-gray-700'
                          }`}
                        >
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* AI Breakdown Button (if has subtasks) */}
            {task.subtasks.length > 0 && (
              <button
                onClick={() => setShowAIModal(true)}
                className="w-full text-sm text-primary-600 border border-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50"
              >
                ✨ Add More with AI
              </button>
            )}

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Breakdown Modal */}
      {showAIModal && (
        <AIBreakdownModal
          taskId={task.id}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </>
  );
}
