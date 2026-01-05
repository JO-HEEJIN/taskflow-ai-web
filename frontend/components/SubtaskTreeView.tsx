'use client';

import { Subtask } from '@/types';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';

interface SubtaskTreeViewProps {
  subtasks: Subtask[];
  onSubtaskClick?: (subtask: Subtask) => void;
  onAtomicClick?: (atomic: Subtask, parentSubtask: Subtask) => void;
}

/**
 * Git Flow Style Hierarchy Display
 *
 * Shows subtasks with their atomic children in a tree structure
 * similar to git branch/commit visualization.
 *
 * Visual hierarchy:
 * ● Subtask (Purple circle)
 *   ├─ Atomic 1 (Cyan dot with curve connector)
 *   ├─ Atomic 2
 *   └─ Atomic 3
 */
export function SubtaskTreeView({
  subtasks,
  onSubtaskClick,
  onAtomicClick,
}: SubtaskTreeViewProps) {
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(
    new Set(subtasks.map((st) => st.id)) // All expanded by default
  );

  const toggleExpanded = (subtaskId: string) => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(subtaskId)) {
        next.delete(subtaskId);
      } else {
        next.add(subtaskId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {subtasks.map((subtask) => {
        const hasChildren = subtask.children && subtask.children.length > 0;
        const isExpanded = expandedSubtasks.has(subtask.id);
        const shouldCollapse = hasChildren && (subtask.children?.length || 0) > 5;

        return (
          <div key={subtask.id} className="relative">
            {/* Subtask Node */}
            <div
              className={`flex items-start gap-3 group ${
                onSubtaskClick ? 'cursor-pointer hover:bg-purple-900/20 rounded-lg p-2 -ml-2' : ''
              }`}
              onClick={() => onSubtaskClick?.(subtask)}
            >
              {/* Purple Circle */}
              <div className="relative flex-shrink-0 mt-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    subtask.isCompleted
                      ? 'bg-green-500 border-green-500'
                      : 'bg-purple-500/20 border-purple-500'
                  }`}
                />
              </div>

              {/* Subtask Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-medium text-white ${
                      subtask.isCompleted ? 'line-through opacity-60' : ''
                    }`}
                  >
                    {subtask.title}
                  </span>

                  {subtask.estimatedMinutes && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={12} />
                      <span>{subtask.estimatedMinutes}min</span>
                    </div>
                  )}

                  {subtask.isComposite && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                      Composite ({subtask.children?.length || 0} parts)
                    </span>
                  )}
                </div>

                {/* Collapse/Expand button for many children */}
                {hasChildren && shouldCollapse && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(subtask.id);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-300 mt-1 flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown size={12} />
                        <span>Collapse</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight size={12} />
                        <span>Show {subtask.children?.length} steps</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Atomic Children (Git-style tree) */}
            {hasChildren && isExpanded && (
              <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-700 pl-4">
                {subtask.children!.map((atomic, idx) => {
                  const isLast = idx === subtask.children!.length - 1;

                  return (
                    <div
                      key={atomic.id}
                      className={`relative group ${
                        onAtomicClick ? 'cursor-pointer hover:bg-cyan-900/20 rounded-lg p-2 -ml-2' : ''
                      }`}
                      onClick={() => onAtomicClick?.(atomic, subtask)}
                    >
                      {/* Curve Connector */}
                      <div className="absolute -left-[17px] top-1/2 w-4 h-px bg-gray-600" />

                      {/* Vertical line (only if not last) */}
                      {!isLast && (
                        <div className="absolute -left-[17px] top-0 bottom-0 w-px bg-gray-700" />
                      )}

                      {/* Atomic Node Content */}
                      <div className="flex items-center gap-2 pl-2">
                        {/* Cyan Dot */}
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            atomic.isCompleted ? 'bg-green-400' : 'bg-cyan-400'
                          }`}
                        />

                        {/* Atomic Title */}
                        <span
                          className={`text-sm text-gray-300 ${
                            atomic.isCompleted ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {atomic.title}
                        </span>

                        {/* Estimated Time */}
                        {atomic.estimatedMinutes && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={10} />
                            <span>{atomic.estimatedMinutes}min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
