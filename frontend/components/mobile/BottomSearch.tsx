'use client';

import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

export function BottomSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f0519] via-[#0f0519]/95 to-transparent backdrop-blur-sm">
      <div className="max-w-md mx-auto flex gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-md"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl backdrop-blur-md border transition-all ${
            showFilters
              ? 'bg-purple-500/30 border-purple-400'
              : 'bg-white/10 border-white/20 hover:bg-white/20'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Options (if expanded) */}
      {showFilters && (
        <div className="max-w-md mx-auto mt-2 p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md">
          <div className="flex gap-2 flex-wrap">
            <FilterChip label="All" active />
            <FilterChip label="Pending" />
            <FilterChip label="In Progress" />
            <FilterChip label="Completed" />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
        active
          ? 'bg-purple-500 text-white'
          : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );
}
