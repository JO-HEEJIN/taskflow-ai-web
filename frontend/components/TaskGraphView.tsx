'use client';

import { Task, TaskStatus } from '@/types';
import { TaskCard } from './TaskCard';
import { StarryBackground } from './StarryBackground';
import { SearchFilter } from './SearchFilter';
import { useMemo, useState, useRef, useEffect } from 'react';

interface TaskGraphViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
  onBackgroundClick?: () => void;
  onViewModeToggle?: () => void;
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

interface TaskPosition {
  task: Task;
  x: number;
  y: number;
  isLinked: boolean;
  parentId?: string;
  depth: number; // New: track nesting depth
}

export function TaskGraphView({
  tasks,
  onTaskClick,
  onEditTask,
  onBackgroundClick,
  onViewModeToggle,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  taskCounts,
}: TaskGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });

  // Build task relationships and positions
  const { positions, connections } = useMemo(() => {
    const positions: TaskPosition[] = [];
    const connections: { from: TaskPosition; to: TaskPosition }[] = [];

    // Build depth map: calculate how deeply nested each task is
    const depthMap = new Map<string, number>();
    const taskLinkMap = new Map<string, string>(); // linkedTaskId -> parentTaskId

    // First pass: build link map
    tasks.forEach((task) => {
      task.subtasks.forEach((subtask) => {
        if (subtask.linkedTaskId) {
          taskLinkMap.set(subtask.linkedTaskId, task.id);
        }
      });
    });

    // Calculate depth for each task
    const calculateDepth = (taskId: string, visited = new Set<string>()): number => {
      if (visited.has(taskId)) return 0; // Prevent circular references
      if (depthMap.has(taskId)) return depthMap.get(taskId)!;

      visited.add(taskId);
      const parentId = taskLinkMap.get(taskId);
      if (!parentId) {
        depthMap.set(taskId, 0);
        return 0;
      }

      const depth = calculateDepth(parentId, visited) + 1;
      depthMap.set(taskId, depth);
      return depth;
    };

    tasks.forEach((task) => calculateDepth(task.id));

    // Separate root tasks and linked tasks
    const linkedTaskIds = new Set(taskLinkMap.keys());
    const rootTasks = tasks.filter((t) => !linkedTaskIds.has(t.id) && !t.sourceSubtaskId);

    const SPACING_X = 350;
    const SPACING_Y = 350;
    const MIN_DISTANCE = 200; // Minimum distance between any two tasks

    // Position root tasks in a grid
    rootTasks.forEach((task, index) => {
      const col = index % 3; // 3 columns
      const row = Math.floor(index / 3);
      positions.push({
        task,
        x: col * SPACING_X + 200,
        y: row * SPACING_Y + 200,
        isLinked: false,
        depth: 0,
      });
    });

    // Position linked tasks with collision avoidance
    const positionLinkedTask = (linkedTask: Task) => {
      const parentId = taskLinkMap.get(linkedTask.id);
      if (!parentId) return;

      const parentPos = positions.find((p) => p.task.id === parentId);
      if (!parentPos) return;

      const depth = depthMap.get(linkedTask.id) || 0;
      const baseDistance = 250 - (depth * 30); // Decrease distance with depth

      // Try different angles to find a position without collision
      const siblings = positions.filter((p) => p.parentId === parentId);
      const angleStep = (Math.PI * 2) / Math.max(8, siblings.length + 1);

      for (let attempt = 0; attempt < 16; attempt++) {
        const angle = angleStep * (siblings.length + attempt * 0.5);
        const distance = baseDistance + (attempt * 30);
        const x = parentPos.x + Math.cos(angle) * distance;
        const y = parentPos.y + Math.sin(angle) * distance;

        // Check collision with all existing positions
        const hasCollision = positions.some((pos) => {
          const dx = pos.x - x;
          const dy = pos.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist < MIN_DISTANCE;
        });

        if (!hasCollision) {
          const linkedPos: TaskPosition = {
            task: linkedTask,
            x,
            y,
            isLinked: true,
            parentId,
            depth,
          };

          positions.push(linkedPos);

          // Create connection
          connections.push({
            from: parentPos,
            to: linkedPos,
          });
          return;
        }
      }

      // Fallback: position with offset even if collision exists
      const fallbackAngle = angleStep * siblings.length;
      const fallbackDist = baseDistance + 100;
      positions.push({
        task: linkedTask,
        x: parentPos.x + Math.cos(fallbackAngle) * fallbackDist,
        y: parentPos.y + Math.sin(fallbackAngle) * fallbackDist,
        isLinked: true,
        parentId,
        depth,
      });

      connections.push({
        from: parentPos,
        to: positions[positions.length - 1],
      });
    };

    // Position linked tasks in order of depth (shallow first)
    const linkedTasks = tasks
      .filter((t) => linkedTaskIds.has(t.id) || t.sourceSubtaskId)
      .sort((a, b) => (depthMap.get(a.id) || 0) - (depthMap.get(b.id) || 0));

    linkedTasks.forEach(positionLinkedTask);

    return { positions, connections };
  }, [tasks]);

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.3, zoom + delta), 2);
    setZoom(newZoom);
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setMouseDownPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Check if this was a click (not a drag) by comparing mouse positions
    const deltaX = Math.abs(e.clientX - mouseDownPos.x);
    const deltaY = Math.abs(e.clientY - mouseDownPos.y);
    const wasDragging = isDragging && (deltaX > 5 || deltaY > 5);

    if (!wasDragging && e.target === containerRef.current) {
      // This was a click on the background, not a drag
      if (onBackgroundClick) {
        onBackgroundClick();
      }
    }

    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.target === containerRef.current) {
      if (!isDragging && onBackgroundClick) {
        onBackgroundClick();
      }
    }
    setIsDragging(false);
  };

  // Reset view
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Determine what to show based on zoom level
  const showDetails = zoom > 0.6;
  const showFullDetails = zoom > 0.8;

  if (positions.length === 0) {
    return null;
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(134deg, rgba(72, 54, 153, 0.8) 0%, rgba(6, 1, 28, 0.9) 100%), #161616',
      }}
    >
      {/* Starry background */}
      <StarryBackground />

      {/* Search and Filter */}
      <div
        className="absolute top-4 left-4 right-4 z-50 max-w-4xl mx-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4">
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            taskCounts={taskCounts}
          />
        </div>
      </div>

      {/* Controls */}
      <div
        className="absolute top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex flex-col gap-2"
        style={{ marginTop: '100px' }}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setZoom(Math.min(2, zoom + 0.2))}
          className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Zoom In"
        >
          🔍+
        </button>
        <button
          onClick={() => setZoom(Math.max(0.3, zoom - 0.2))}
          className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Zoom Out"
        >
          🔍-
        </button>
        <div className="border-t border-gray-200 my-1"></div>
        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Reset View"
        >
          ⟲
        </button>
        <div className="text-xs text-gray-500 text-center mt-1">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* View mode toggle button */}
      <button
        onClick={onViewModeToggle}
        className="absolute top-4 left-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <span>☰</span>
        <span>Kanban View</span>
      </button>

      {/* Graph container */}
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} graph-background`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* SVG for connection lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {connections.map((conn, index) => {
              // Use base size without depth scale since nodes use transform: scale()
              // The visual size changes but the coordinate space stays the same
              const baseFromSize = conn.from.isLinked ? 120 : 160;
              const baseToSize = conn.to.isLinked ? 120 : 160;

              const fromX = conn.from.x + baseFromSize / 2;
              const fromY = conn.from.y + baseFromSize / 2;
              const toX = conn.to.x + baseToSize / 2;
              const toY = conn.to.y + baseToSize / 2;

              // Calculate control point for curve
              const dx = toX - fromX;
              const dy = toY - fromY;
              const controlX = fromX + dx * 0.5;
              const controlY = fromY + dy * 0.5 - Math.abs(dx) * 0.2;

              return (
                <g key={index}>
                  {/* Outer glow effect - constellation style */}
                  {showDetails && (
                    <path
                      d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                      fill="none"
                      stroke="#9f7aea"
                      strokeWidth={zoom > 0.7 ? 12 : 8}
                      opacity="0.08"
                      filter="blur(4px)"
                    />
                  )}
                  {/* Inner glow */}
                  {showDetails && (
                    <path
                      d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                      fill="none"
                      stroke="#b794f4"
                      strokeWidth={zoom > 0.7 ? 6 : 4}
                      opacity="0.15"
                      filter="blur(2px)"
                    />
                  )}
                  {/* Main line - subtle purple constellation line */}
                  <path
                    d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth={zoom > 0.7 ? 2 : 1.5}
                    strokeDasharray={showDetails ? "4,4" : "none"}
                    opacity={showDetails ? "0.6" : "0.4"}
                  >
                    {showDetails && (
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    )}
                  </path>
                  {/* Connection point glow at target */}
                  <circle
                    cx={toX}
                    cy={toY}
                    r={showDetails ? 8 : 6}
                    fill="#9f7aea"
                    opacity="0.15"
                    filter="blur(3px)"
                  />
                  {/* Connection point */}
                  <circle
                    cx={toX}
                    cy={toY}
                    r={showDetails ? 4 : 2.5}
                    fill="#c4b5fd"
                    opacity={showDetails ? "0.8" : "0.6"}
                  />
                </g>
              );
            })}
          </svg>

          {/* Task nodes */}
          {positions.map((pos) => {
            // Calculate size based on depth: each level is 20% smaller
            const depthScale = Math.pow(0.8, pos.depth);

            return (
              <div
                key={pos.task.id}
                className="absolute pointer-events-auto"
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: `scale(${depthScale})`,
                  transformOrigin: 'center center',
                }}
              >
                {showFullDetails ? (
                  // Full detail view
                  <TaskCard
                    task={pos.task}
                    isLinked={pos.isLinked}
                    onClick={() => onTaskClick(pos.task.id)}
                    onEdit={onEditTask}
                  />
                ) : showDetails ? (
                  // Simplified view - just circle with title and progress
                  <SimplifiedTaskNode
                    task={pos.task}
                    isLinked={pos.isLinked}
                    onClick={() => onTaskClick(pos.task.id)}
                  />
                ) : (
                  // Minimal view - just colored circles
                  <MinimalTaskNode
                    task={pos.task}
                    isLinked={pos.isLinked}
                    onClick={() => onTaskClick(pos.task.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Simplified node for medium zoom
function SimplifiedTaskNode({ task, isLinked, onClick }: { task: Task; isLinked: boolean; onClick?: () => void }) {
  const size = isLinked ? 80 : 100;
  const getBorderColor = () => {
    if (task.status === 'completed') return 'border-green-400/40';
    if (task.status === 'in_progress') return 'border-purple-400/40';
    return 'border-white/30';
  };

  const getGlassBg = () => {
    if (task.status === 'completed') return 'rgba(34, 197, 94, 0.15)';
    if (task.status === 'in_progress') return 'rgba(168, 85, 247, 0.15)';
    return 'rgba(255, 255, 255, 0.1)';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full animate-starPulse"
        style={{
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.25) 0%, rgba(167, 139, 250, 0.08) 40%, transparent 70%)',
          filter: 'blur(6px)',
          transform: 'scale(1.3)',
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
      <div
        className={`relative rounded-full ${getBorderColor()} border backdrop-blur-md flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
        style={{
          width: size,
          height: size,
          background: getGlassBg(),
          boxShadow: '0 0 20px rgba(167, 139, 250, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.03)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
      >
        <div className="text-center px-2">
          <div
            className="text-xs font-semibold text-white line-clamp-1"
            style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
          >
            {task.title}
          </div>
          <div
            className="text-lg font-bold text-white"
            style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.6), 0 0 15px rgba(196, 181, 253, 0.5)' }}
          >
            {task.progress}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal node for far zoom
function MinimalTaskNode({ task, isLinked, onClick }: { task: Task; isLinked: boolean; onClick?: () => void }) {
  const size = isLinked ? 40 : 60;
  const getBorderColor = () => {
    if (task.status === 'completed') return 'border-green-400/50';
    if (task.status === 'in_progress') return 'border-purple-400/50';
    return 'border-white/40';
  };

  const getGlassBg = () => {
    if (task.status === 'completed') return 'rgba(34, 197, 94, 0.2)';
    if (task.status === 'in_progress') return 'rgba(168, 85, 247, 0.2)';
    return 'rgba(255, 255, 255, 0.15)';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full animate-starPulse"
        style={{
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3) 0%, rgba(167, 139, 250, 0.1) 50%, transparent 70%)',
          filter: 'blur(4px)',
          transform: 'scale(1.5)',
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
      <div
        className={`relative rounded-full ${getBorderColor()} border-2 backdrop-blur-sm cursor-pointer hover:scale-125 transition-transform`}
        style={{
          width: size,
          height: size,
          background: getGlassBg(),
          boxShadow: '0 0 15px rgba(167, 139, 250, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.05)',
        }}
        title={task.title}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
      />
    </div>
  );
}
