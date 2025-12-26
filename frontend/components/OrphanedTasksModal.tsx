'use client';

import { Task } from '@/types';

interface OrphanedTasksModalProps {
  orphanedTasks: Task[];
  onKeep: () => void;
  onDelete: () => void;
}

export function OrphanedTasksModal({
  orphanedTasks,
  onKeep,
  onDelete,
}: OrphanedTasksModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div
        className="rounded-2xl max-w-2xl w-full p-8 backdrop-blur-md"
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 40px rgba(167, 139, 250, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.03)',
        }}
      >
        <h2 className="text-2xl font-semibold text-white mb-4" style={{ textShadow: '0 0 20px rgba(167, 139, 250, 0.5)' }}>
          🧹 Orphaned Tasks Found
        </h2>

        <p className="text-purple-200 mb-6" style={{ textShadow: '0 0 10px rgba(167, 139, 250, 0.3)' }}>
          Found {orphanedTasks.length} task{orphanedTasks.length > 1 ? 's' : ''} that {orphanedTasks.length > 1 ? 'are' : 'is'} no longer linked to any parent task.
          Would you like to keep or delete {orphanedTasks.length > 1 ? 'them' : 'it'}?
        </p>

        {/* List of orphaned tasks */}
        <div className="mb-6 max-h-64 overflow-y-auto">
          {orphanedTasks.map((task) => (
            <div
              key={task.id}
              className="px-4 py-3 mb-2 rounded-lg"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(167, 139, 250, 0.2)',
              }}
            >
              <p className="text-white font-medium">{task.title}</p>
              {task.description && (
                <p className="text-purple-200 text-sm mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={onDelete}
            className="flex-1 px-6 py-3 text-white rounded-lg transition-all font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.6)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🗑️ Delete {orphanedTasks.length > 1 ? 'Them' : 'It'}
          </button>

          <button
            onClick={onKeep}
            className="flex-1 px-6 py-3 text-white rounded-lg transition-all font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.5)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.8)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.6)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            💾 Keep {orphanedTasks.length > 1 ? 'Them' : 'It'}
          </button>
        </div>
      </div>
    </div>
  );
}
