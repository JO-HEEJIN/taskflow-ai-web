'use client';

/**
 * Loading skeleton for subtasks during optimistic AI breakdown
 * Provides instant visual feedback while waiting for AI response
 */
export function SubtaskSkeleton() {
  return (
    <div className="animate-pulse flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
      {/* Checkbox skeleton */}
      <div className="mt-1 h-6 w-6 bg-gray-300 rounded"></div>

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Badge skeleton */}
      <div className="h-5 w-16 bg-gray-300 rounded-full"></div>
    </div>
  );
}

/**
 * Children subtask skeleton (indented, purple theme)
 */
export function ChildSubtaskSkeleton() {
  return (
    <div className="ml-14 mt-2 pl-4 border-l-2 border-purple-300">
      <div className="animate-pulse flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
        {/* Checkbox skeleton */}
        <div className="mt-1 h-5 w-5 bg-purple-300 rounded"></div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-purple-300 rounded w-2/3"></div>
          <div className="h-3 bg-purple-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full breakdown skeleton (3 subtasks)
 */
export function BreakdownSkeleton() {
  return (
    <div className="space-y-2">
      <SubtaskSkeleton />
      <SubtaskSkeleton />
      <SubtaskSkeleton />
    </div>
  );
}
