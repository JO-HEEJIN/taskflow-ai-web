'use client';

import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useToast } from '@/contexts/ToastContext';
import { TaskGraphView } from './TaskGraphView';
import { TaskDetail } from './TaskDetail';
import { KanbanView } from './KanbanView';
import { OrphanedTasksModal } from './OrphanedTasksModal';
import { EmptyStateWithActions } from './onboarding/EmptyStateWithActions';
import { useEffect, useState, useMemo } from 'react';
import { Task, TaskStatus } from '@/types';
import { api } from '@/lib/api';

interface TaskListProps {
  onBackgroundClick?: () => void;
  onEditTask?: (taskId: string) => void;
}

export function TaskList({ onBackgroundClick, onEditTask }: TaskListProps) {
  const { tasks, fetchTasks, isLoading, error, createTask, createTaskWithAutoFocus } = useTaskStore();
  const { enterFocusMode } = useCoachStore();
  const toast = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'constellation' | 'kanban'>('constellation');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [orphanedTasks, setOrphanedTasks] = useState<Task[]>([]);
  const [showOrphanedModal, setShowOrphanedModal] = useState(false);

  useEffect(() => {
    console.log('🔍 TaskList mounted, fetching tasks...');
    fetchTasks();
  }, [fetchTasks]);

  // Check for orphaned tasks after tasks are loaded (skip in guest mode)
  useEffect(() => {
    const checkOrphanedTasks = async () => {
      // Skip orphaned task detection in guest mode
      if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
        return;
      }

      if (tasks.length > 0 && !isLoading) {
        try {
          const { orphanedTasks: orphaned } = await api.getOrphanedTasks();
          if (orphaned && orphaned.length > 0) {
            setOrphanedTasks(orphaned);
            setShowOrphanedModal(true);
          }
        } catch (error) {
          console.error('Failed to check orphaned tasks:', error);
        }
      }
    };

    checkOrphanedTasks();
  }, [tasks.length, isLoading]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 TaskList state:', {
      tasksLength: tasks?.length,
      isLoading,
      error,
      tasks: tasks,
    });
  }, [tasks, isLoading, error]);

  const handleDeleteOrphaned = async () => {
    try {
      const taskIds = orphanedTasks.map((t) => t.id);
      await api.deleteBatchTasks(taskIds);
      setShowOrphanedModal(false);
      setOrphanedTasks([]);
      fetchTasks(); // Refresh task list
    } catch (error) {
      console.error('Failed to delete orphaned tasks:', error);
      toast.error('Failed to delete orphaned tasks. Please try again.');
    }
  };

  const handleKeepOrphaned = () => {
    setShowOrphanedModal(false);
    setOrphanedTasks([]);
  };

  const handleCreateSampleTask = async (sampleTitle: string) => {
    console.log('🔍 handleCreateSampleTask called with:', { sampleTitle, type: typeof sampleTitle });
    try {
      // Use auto-focus flow: create task → AI breakdown → enter focus mode
      const taskId = await createTaskWithAutoFocus(
        sampleTitle,
        'This is a sample task to help you get started!'
      );

      // If task was created with subtasks, enter focus mode
      if (taskId) {
        // Unlock timer-complete.mp3 for iOS (play then pause)
        try {
          const timerSound = new Audio('/sounds/timer-complete.mp3');
          timerSound.volume = 0;
          timerSound.play().then(() => {
            timerSound.pause();
            timerSound.currentTime = 0;
            timerSound.volume = 0.7;
            console.log('Timer completion sound unlocked for iOS');
          }).catch(err => console.warn('Failed to unlock timer sound:', err));
        } catch (error) {
          console.warn('Failed to create timer sound:', error);
        }

        // Small delay to ensure store is updated
        setTimeout(() => {
          const task = useTaskStore.getState().tasks.find(t => t.id === taskId);
          if (task && task.subtasks.length > 0) {
            enterFocusMode(taskId, task.subtasks);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to create sample task:', error);
      toast.error('Failed to create task. Please try again.');
    }
  };

  // Filter tasks based on search and status
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((task) => task.status === statusFilter);
    }

    return result;
  }, [tasks, searchQuery, statusFilter]);

  // Calculate task counts for filter buttons
  const taskCounts = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }), [tasks]);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center relative overflow-hidden">
        {/* Aurora Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/aurora-bg.jpg)',
            filter: 'blur(8px)',
            transform: 'scale(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-black/60" />

        {/* Loading Content */}
        <div className="relative z-10 text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent"
            style={{
              borderColor: 'rgba(167, 139, 250, 0.8)',
              borderRightColor: 'transparent',
            }}
          ></div>
          <p className="mt-2 text-white" style={{ textShadow: '0 0 10px rgba(167, 139, 250, 0.5)' }}>
            Loading tasks...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center relative overflow-hidden">
        {/* Aurora Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/aurora-bg.jpg)',
            filter: 'blur(8px)',
            transform: 'scale(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-black/60" />

        {/* Error Content */}
        <div className="relative z-10 text-center">
          <p className="text-red-400 text-lg mb-4" style={{ textShadow: '0 0 10px rgba(239, 68, 68, 0.5)' }}>
            Error: {error}
          </p>
          <button
            onClick={() => fetchTasks()}
            className="px-6 py-3 text-white rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.5)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.8)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.6)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="fixed inset-0 overflow-y-auto flex flex-col items-center justify-start">
        {/* Aurora Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: 'url(/aurora-bg.jpg)',
            filter: 'blur(8px)',
            transform: 'scale(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        {/* Empty State Content */}
        <div className="relative z-10 w-full">
          <EmptyStateWithActions
            onCreateSample={handleCreateSampleTask}
            onCreateOwn={() => onBackgroundClick && onBackgroundClick()}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'constellation' ? (
        <TaskGraphView
          tasks={filteredTasks}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          onEditTask={onEditTask}
          onBackgroundClick={onBackgroundClick}
          onViewModeToggle={() => setViewMode('kanban')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          taskCounts={taskCounts}
        />
      ) : (
        <KanbanView
          tasks={filteredTasks}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          onClose={() => setViewMode('constellation')}
          onBackgroundClick={onBackgroundClick}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          taskCounts={taskCounts}
        />
      )}

      {selectedTaskId && viewMode === 'constellation' && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Orphaned Tasks Modal */}
      {showOrphanedModal && orphanedTasks.length > 0 && (
        <OrphanedTasksModal
          orphanedTasks={orphanedTasks}
          onKeep={handleKeepOrphaned}
          onDelete={handleDeleteOrphaned}
        />
      )}
    </>
  );
}
