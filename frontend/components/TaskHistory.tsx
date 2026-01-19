'use client';

import { useEffect } from 'react';
import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';

interface TaskHistoryProps {
  onClose: () => void;
}

export function TaskHistory({ onClose }: TaskHistoryProps) {
  const {
    deletedTasks,
    isLoading,
    fetchDeletedTasks,
    restoreTask,
    permanentDeleteTask,
    emptyTrash,
  } = useTaskStore();

  useEffect(() => {
    fetchDeletedTasks();
  }, [fetchDeletedTasks]);

  const formatDeletedAt = (deletedAt: string) => {
    const date = new Date(deletedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDaysUntilPermanentDelete = (deletedAt: string) => {
    const date = new Date(deletedAt);
    const deleteDate = new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffDays = Math.ceil((deleteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleRestore = async (id: string) => {
    await restoreTask(id);
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm('Permanently delete this task? This action cannot be undone.')) {
      await permanentDeleteTask(id);
    }
  };

  const handleEmptyTrash = async () => {
    if (deletedTasks.length === 0) {
      alert('Trash is already empty');
      return;
    }

    if (confirm(`Permanently delete all ${deletedTasks.length} tasks in trash? This action cannot be undone.`)) {
      await emptyTrash();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4"
      style={{ backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl max-w-2xl w-full p-8 backdrop-blur-md max-h-[80vh] flex flex-col"
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 40px rgba(167, 139, 250, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.03)',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white" style={{ textShadow: '0 0 20px rgba(167, 139, 250, 0.5)' }}>
            Trash
          </h2>
          <div className="flex items-center gap-2">
            {/* Empty Trash Button */}
            {deletedTasks.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="px-3 py-1.5 text-sm text-white rounded-lg transition-all flex items-center gap-1.5"
                style={{
                  background: 'rgba(239, 68, 68, 0.3)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                }}
                title="Empty trash"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Empty
              </button>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-purple-300 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-purple-200 mb-4 text-sm" style={{ textShadow: '0 0 10px rgba(167, 139, 250, 0.3)' }}>
          Deleted tasks are kept for 30 days before being permanently removed.
        </p>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-purple-300 mt-4">Loading...</p>
            </div>
          ) : deletedTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🗑️</div>
              <p className="text-purple-300">Trash is empty</p>
              <p className="text-purple-400 text-sm mt-2">Deleted tasks will appear here</p>
            </div>
          ) : (
            deletedTasks.map((task) => (
              <div
                key={task.id}
                className="px-4 py-4 rounded-lg group"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(167, 139, 250, 0.2)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-purple-200 text-sm mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-purple-400">
                      <span>Deleted {formatDeletedAt(task.deletedAt!)}</span>
                      <span className="text-purple-500">•</span>
                      <span className="text-orange-400">
                        {getDaysUntilPermanentDelete(task.deletedAt!)}d until permanent deletion
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(task.id)}
                      className="px-3 py-1.5 text-sm text-white rounded-lg transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)',
                        border: '1px solid rgba(34, 197, 94, 0.5)',
                      }}
                      title="Restore task"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(task.id)}
                      className="px-3 py-1.5 text-sm text-white rounded-lg transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                      }}
                      title="Delete permanently"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-white rounded-lg transition-all font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.5)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
