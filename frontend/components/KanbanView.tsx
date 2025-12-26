'use client';

import { Task, TaskStatus } from '@/types';
import { useTaskStore } from '@/store/taskStore';

interface KanbanViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onClose: () => void;
}

export function KanbanView({ tasks, onTaskClick, onClose }: KanbanViewProps) {
  const { updateTaskStatus } = useTaskStore();

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

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {getColumnTasks(column.status).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
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
                        className="mt-1 w-4 h-4 rounded border-gray-300"
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
                      <button className="text-gray-400 hover:text-gray-600 text-sm">
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
