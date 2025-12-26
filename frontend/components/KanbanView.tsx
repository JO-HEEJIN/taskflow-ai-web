'use client';

import { Task, TaskStatus } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { useState } from 'react';

interface KanbanViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onClose: () => void;
}

export function KanbanView({ tasks, onTaskClick, onClose }: KanbanViewProps) {
  const { updateTaskStatus } = useTaskStore();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">TaskFlow AI</h1>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl px-3 py-1"
        >
          ✕
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-6 p-6">
          {columns.map((column) => (
            <div
              key={column.status}
              className="flex-shrink-0 w-80 bg-gray-100 rounded-lg flex flex-col"
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
                        onTaskClick(task.id);
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
                <button className="w-full text-left text-sm text-gray-500 hover:text-gray-700 py-2">
                  + Add a card
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
