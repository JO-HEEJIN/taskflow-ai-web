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
    { label: 'Pending', value: TaskStatus.PENDING, count: taskCounts.pending },
    { label: 'In Progress', value: TaskStatus.IN_PROGRESS, count: taskCounts.in_progress },
    { label: 'Completed', value: TaskStatus.COMPLETED, count: taskCounts.completed },
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
          className="w-full px-4 py-2 pr-10 rounded-lg backdrop-blur-md text-white placeholder:text-gray-300 transition-all focus:outline-none"
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
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
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
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              statusFilter === button.value
                ? {
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
                    color: 'white',
                    border: '1px solid rgba(167, 139, 250, 0.5)',
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                  }
            }
            onMouseEnter={(e) => {
              if (statusFilter !== button.value) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (statusFilter !== button.value) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            {button.label} ({button.count})
          </button>
        ))}
      </div>
    </div>
  );
}
