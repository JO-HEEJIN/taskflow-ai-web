'use client';

import { Task, TaskStatus } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { SearchFilter } from './SearchFilter';
import { KanbanSidePanel } from './KanbanSidePanel';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface KanbanViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onClose: () => void;
  onBackgroundClick?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  taskCounts: {
    all: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}

export function KanbanView({
  tasks,
  onTaskClick,
  onClose,
  onBackgroundClick,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  taskCounts,
}: KanbanViewProps) {
  const { updateTaskStatus } = useTaskStore();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const router = useRouter();

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

  const columns: { status: TaskStatus; title: string; count: number }[] = [
    {
      status: 'pending' as TaskStatus,
      title: 'Tasks',
      count: tasks.filter((t) => t.status === 'pending').length,
    },
    {
      status: 'in_progress' as TaskStatus,
      title: 'In Progress',
      count: tasks.filter((t) => t.status === 'in_progress').length,
    },
    {
      status: 'completed' as TaskStatus,
      title: 'Completed',
      count: tasks.filter((t) => t.status === 'completed').length,
    },
  ];

  const getColumnTasks = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(task));

    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedTask(null);
    setDragOverColumn(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedTask && draggedTask.status !== targetStatus) {
      await updateTaskStatus(draggedTask.id, targetStatus);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
    setIsDragging(false);
  };

  return (
    <div className="w-screen h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-2 md:px-6 py-2 flex flex-col gap-2">
        {/* Top row: Back button and User Menu */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-gray-600 hover:text-purple-600 px-2 py-1 rounded-lg border border-gray-300 hover:border-purple-500 transition-all text-xs"
          >
            <span className="text-sm">🌌</span>
            <span className="font-medium">Back</span>
          </button>

          {/* User Menu - Compact */}
          <div className="flex items-center gap-1.5">
            {session ? (
              <>
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user?.name || 'User'}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white transition-all"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom row: Compact Search and Filter */}
        <div className="flex items-center gap-2 relative" ref={filterMenuRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple-500"
          />

          {/* Filter Button (Hamburger) */}
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all flex items-center gap-1"
          >
            <span>☰</span>
            <span className="hidden sm:inline">Filter</span>
          </button>

          {/* Filter Dropdown Menu */}
          {showFilterMenu && (
            <div className="absolute top-8 right-0 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[140px]">
              <button
                onClick={() => {
                  onStatusFilterChange('all');
                  setShowFilterMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                  statusFilter === 'all' ? 'bg-purple-50 text-purple-600 font-semibold' : ''
                }`}
              >
                All ({taskCounts.all})
              </button>
              <button
                onClick={() => {
                  onStatusFilterChange('pending');
                  setShowFilterMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                  statusFilter === 'pending' ? 'bg-purple-50 text-purple-600 font-semibold' : ''
                }`}
              >
                Pending ({taskCounts.pending})
              </button>
              <button
                onClick={() => {
                  onStatusFilterChange('in_progress');
                  setShowFilterMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                  statusFilter === 'in_progress' ? 'bg-purple-50 text-purple-600 font-semibold' : ''
                }`}
              >
                In Progress ({taskCounts.in_progress})
              </button>
              <button
                onClick={() => {
                  onStatusFilterChange('completed');
                  setShowFilterMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                  statusFilter === 'completed' ? 'bg-purple-50 text-purple-600 font-semibold' : ''
                }`}
              >
                Completed ({taskCounts.completed})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory">
        <div className="h-full flex gap-2 p-3 md:gap-6 md:p-6">
          {columns.map((column) => (
            <div
              key={column.status}
              className="flex-shrink-0 w-[92vw] md:w-80 bg-gray-100 rounded-lg flex flex-col snap-center"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-sm">☰</span>
                    {column.title}
                  </h2>
                  <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                    {column.count}
                  </span>
                </div>
              </div>

              {/* Cards Container - Drop Zone */}
              <div
                className={`flex-1 overflow-y-auto p-4 space-y-3 transition-colors ${
                  dragOverColumn === column.status ? 'bg-blue-50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                {getColumnTasks(column.status).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      if (!isDragging) {
                        setSelectedTaskId(task.id);
                      }
                    }}
                    className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move border-2 ${
                      draggedTask?.id === task.id
                        ? 'opacity-50 border-blue-400'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 pointer-events-none">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(
                            task.id,
                            e.target.checked ? 'completed' : 'pending'
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 rounded border-gray-300 pointer-events-auto"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {task.subtasks.filter((st) => st.isCompleted).length}/
                            {task.subtasks.length} subtasks
                          </span>
                          <span>•</span>
                          <span>{task.progress}%</span>
                        </div>
                      </div>
                      <button
                        className="text-gray-400 hover:text-gray-600 text-sm pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋯
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Card Button */}
                <button
                  onClick={() => onBackgroundClick && onBackgroundClick()}
                  className="w-full text-left text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  + Add a card
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      {selectedTaskId && (
        <KanbanSidePanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
