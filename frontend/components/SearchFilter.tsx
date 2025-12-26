'use client';

import { TaskStatus } from '@/types';

interface SearchFilterProps {
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

export function SearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  taskCounts,
}: SearchFilterProps) {
  const filterButtons: { label: string; value: TaskStatus | 'all'; count: number }[] = [
    { label: 'All', value: 'all', count: taskCounts.all },
    { label: 'Pending', value: 'pending', count: taskCounts.pending },
    { label: 'In Progress', value: 'in_progress', count: taskCounts.in_progress },
    { label: 'Completed', value: 'completed', count: taskCounts.completed },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {filterButtons.map((button) => (
          <button
            key={button.value}
            onClick={() => onStatusFilterChange(button.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === button.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {button.label} ({button.count})
          </button>
        ))}
      </div>
    </div>
  );
}
