'use client';

import { Task, TaskStatus, NodeContext } from '@/types';
import { TaskCard } from './TaskCard';
import { StarryBackground } from './StarryBackground';
import { SearchFilter } from './SearchFilter';
import { LayoutGrid } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { generateHierarchyGraph, GraphNode, GraphLink } from './graph/hierarchyUtils';

interface TaskGraphViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onNodeClick?: (context: NodeContext) => void; // NEW: Handle subtask/atomic clicks
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
  onNodeClick,
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

  // Touch gesture states
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [containerReady, setContainerReady] = useState(false);

  // Track when container is mounted
  useEffect(() => {
    if (containerRef.current && !containerReady) {
      setContainerReady(true);
    }
  }, [containerReady]);

  // Generate hierarchy graph with Task → Subtask → Atomic nodes
  const hierarchyGraph = useMemo(() => {
    if (!containerRef.current || !containerReady) {
      return { nodes: [], links: [] };
    }

    const width = containerRef.current.clientWidth || 1920;
    const height = containerRef.current.clientHeight || 1080;

    return generateHierarchyGraph(tasks, width, height);
  }, [tasks, containerReady]);

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.3, zoom + delta), 2);
    setZoom(newZoom);
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setMouseDownPos({ x: e.clientX, y: e.clientY });
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
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger - pan
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      // Two fingers - pinch zoom
      setIsDragging(false);
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setLastTouchDistance(distance);

      // Center point between two fingers
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setTouchStartPos({ x: centerX, y: centerY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger pan
      const touch = e.touches[0];
      if (dragStart.x !== 0 || dragStart.y !== 0) {
        setPan({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        });
      }
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      const distance = getTouchDistance(e.touches[0], e.touches[1]);

      if (lastTouchDistance) {
        const delta = distance - lastTouchDistance;
        const zoomFactor = 1 + delta / 500; // Adjust sensitivity
        const newZoom = Math.min(Math.max(0.3, zoom * zoomFactor), 2);

        setZoom(newZoom);
        setLastTouchDistance(distance);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setLastTouchDistance(null);
      setTouchStartPos(null);
    } else if (e.touches.length === 1) {
      // One finger left after two-finger gesture
      setLastTouchDistance(null);
      // Resume panning with remaining finger
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  // Reset view
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Determine what to show based on zoom level
  const showDetails = zoom > 0.6;
  const showFullDetails = zoom > 0.8;

  return (
    <div className="relative w-screen h-screen overflow-hidden">
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

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full">
        {/* Starry background */}
        <StarryBackground />

        {/* Search and Filter */}
        <div
          className="absolute top-2 left-2 right-2 md:top-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 max-w-xl w-full md:w-auto md:min-w-[500px]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div
          className="backdrop-blur-md rounded-lg p-2 md:p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            boxShadow: '0 0 30px rgba(167, 139, 250, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.03)',
          }}
        >
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            taskCounts={taskCounts}
          />
        </div>
      </div>

      {/* View mode toggle button */}
      <button
        onClick={onViewModeToggle}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-4 md:top-4 md:left-4 md:bottom-auto z-50 backdrop-blur-md rounded-lg px-4 py-3 md:px-4 text-sm font-medium text-white transition-all flex items-center gap-2 min-h-[48px]"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 30px rgba(167, 139, 250, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.03)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)';
          e.currentTarget.style.boxShadow = '0 0 40px rgba(167, 139, 250, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(167, 139, 250, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.03)';
        }}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden md:inline">Kanban View</span>
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
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
          {/* Clickable background layer */}
          <div
            className="absolute inset-0"
            style={{
              width: '200%',
              height: '200%',
              left: '-50%',
              top: '-50%',
              zIndex: 0,
            }}
            onClick={(e) => {
              const deltaX = Math.abs(e.clientX - mouseDownPos.x);
              const deltaY = Math.abs(e.clientY - mouseDownPos.y);
              const wasDragging = deltaX > 5 || deltaY > 5;

              if (!wasDragging && onBackgroundClick) {
                onBackgroundClick();
              }
            }}
            onTouchEnd={(e) => {
              if (!isDragging && onBackgroundClick) {
                onBackgroundClick();
              }
            }}
          />

          {/* SVG for connection lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {hierarchyGraph.links.map((link, index) => {
              const sourceNode = hierarchyGraph.nodes.find((n) => n.id === link.source);
              const targetNode = hierarchyGraph.nodes.find((n) => n.id === link.target);

              if (!sourceNode || !targetNode) return null;

              // Calculate center points
              const fromX = sourceNode.x;
              const fromY = sourceNode.y;
              const toX = targetNode.x;
              const toY = targetNode.y;

              // Calculate control point for curve
              const dx = toX - fromX;
              const dy = toY - fromY;
              const controlX = fromX + dx * 0.5;
              const controlY = fromY + dy * 0.5 - Math.abs(dx) * 0.2;

              // Different styles for different connection types
              const isAtomicLink = link.type === 'subtask-atomic';
              const strokeColor = isAtomicLink ? '#22D3EE' : '#A78BFA'; // Cyan for atomic, Purple for subtask
              const glowColor = isAtomicLink ? '#06B6D4' : '#9f7aea';
              const dashArray = isAtomicLink ? '4 2' : 'none'; // Dashed for atomic
              const strokeWidth = isAtomicLink ? 1 : 2;

              // Hide atomic links when zoomed out
              if (isAtomicLink && zoom < 0.4) return null;

              return (
                <g key={`${link.source}-${link.target}-${index}`}>
                  {/* Outer glow effect */}
                  {showDetails && (
                    <path
                      d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                      fill="none"
                      stroke={glowColor}
                      strokeWidth={zoom > 0.7 ? (isAtomicLink ? 8 : 12) : (isAtomicLink ? 6 : 8)}
                      opacity="0.08"
                      filter="blur(4px)"
                    />
                  )}
                  {/* Inner glow */}
                  {showDetails && (
                    <path
                      d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={zoom > 0.7 ? (isAtomicLink ? 4 : 6) : (isAtomicLink ? 3 : 4)}
                      opacity="0.15"
                      filter="blur(2px)"
                    />
                  )}
                  {/* Main line */}
                  <path
                    d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={zoom > 0.7 ? strokeWidth : strokeWidth * 0.75}
                    strokeDasharray={dashArray}
                    opacity={showDetails ? '0.6' : '0.4'}
                  >
                    {showDetails && !isAtomicLink && (
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
                    r={showDetails ? (isAtomicLink ? 5 : 8) : (isAtomicLink ? 3 : 6)}
                    fill={glowColor}
                    opacity="0.15"
                    filter="blur(3px)"
                  />
                  {/* Connection point */}
                  <circle
                    cx={toX}
                    cy={toY}
                    r={showDetails ? (isAtomicLink ? 2.5 : 4) : (isAtomicLink ? 1.5 : 2.5)}
                    fill={strokeColor}
                    opacity={showDetails ? '0.8' : '0.6'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hierarchy nodes (Tasks, Subtasks, Atomics) */}
          {hierarchyGraph.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-white text-xl mb-2">No tasks found</p>
                <p className="text-purple-300 text-sm">
                  {statusFilter !== 'all' ? 'Try a different filter' : 'Create a new task to get started'}
                </p>
              </div>
            </div>
          ) : (
            hierarchyGraph.nodes.map((node) => {
              // Hide atomic nodes when zoomed out
              if (node.type === 'atomic' && zoom < 0.4) return null;

              // Handle click based on node type
              const handleNodeClick = () => {
                if (node.type === 'task') {
                  // Task click - use existing handler
                  onTaskClick((node.data as Task).id);
                } else if (onNodeClick) {
                  // Subtask or atomic click - construct NodeContext
                  const context: NodeContext = {
                    type: node.type,
                    taskId: node.parentId || (node.data as any).parentTaskId || '',
                    subtaskId: node.type === 'subtask' ? node.id : undefined,
                    atomicId: node.type === 'atomic' ? node.id : undefined,
                  };
                  onNodeClick(context);
                }
              };

              return (
                <div
                  key={node.id}
                  className="absolute pointer-events-auto"
                  style={{
                    left: node.x - node.size / 2,
                    top: node.y - node.size / 2,
                  }}
                >
                  {node.type === 'task' ? (
                    // Task nodes - use existing TaskCard/SimplifiedTaskNode/MinimalTaskNode
                    showFullDetails ? (
                      <TaskCard
                        task={node.data as Task}
                        isLinked={false}
                        onClick={handleNodeClick}
                        onEdit={onEditTask}
                      />
                    ) : showDetails ? (
                      <SimplifiedTaskNode
                        task={node.data as Task}
                        isLinked={false}
                        onClick={handleNodeClick}
                      />
                    ) : (
                      <MinimalTaskNode
                        task={node.data as Task}
                        isLinked={false}
                        onClick={handleNodeClick}
                      />
                    )
                  ) : (
                    // Subtask and Atomic nodes - new hierarchy nodes
                    <HierarchyNode node={node} onClick={handleNodeClick} zoom={zoom} />
                  )}
                </div>
              );
            })
          )}
        </div>
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

// Hierarchy node for Subtasks and Atomics
function HierarchyNode({ node, onClick, zoom }: { node: GraphNode; onClick?: () => void; zoom: number }) {
  const isSubtask = node.type === 'subtask';
  const isAtomic = node.type === 'atomic';
  const isCompleted = node.status === 'completed';

  // Colors
  const subtaskColor = isCompleted ? '#22C55E' : '#A78BFA'; // Green or Purple
  const atomicColor = isCompleted ? '#10B981' : '#22D3EE'; // Green or Cyan
  const color = isSubtask ? subtaskColor : atomicColor;
  const glowColor = isSubtask ? 'rgba(167, 139, 250, 0.4)' : 'rgba(34, 211, 238, 0.4)';

  // Show details based on zoom
  const showLabel = zoom > 0.6;
  const showFullLabel = zoom > 0.8;

  return (
    <div
      className="relative cursor-pointer hover:scale-110 transition-transform"
      style={{ width: node.size, height: node.size }}
      title={node.title}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(6px)',
          transform: 'scale(1.4)',
          opacity: isCompleted ? 0.3 : 0.6,
        }}
      />

      {/* Main circle */}
      <div
        className="relative rounded-full backdrop-blur-sm flex items-center justify-center"
        style={{
          width: node.size,
          height: node.size,
          backgroundColor: color,
          border: `2px solid ${color}`,
          opacity: isCompleted ? 0.6 : 1,
          boxShadow: `0 0 ${node.size / 2}px ${glowColor}`,
        }}
      >
        {/* Label for larger nodes */}
        {showLabel && isSubtask && (
          <div
            className="text-center px-2 overflow-hidden"
            style={{
              fontSize: showFullLabel ? '10px' : '8px',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              lineHeight: '1.2',
            }}
          >
            {showFullLabel ? (
              <span className="font-medium">{node.title}</span>
            ) : (
              <span>{node.title.slice(0, 8)}...</span>
            )}
          </div>
        )}

        {/* Completion checkmark */}
        {isCompleted && showLabel && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              fontSize: isSubtask ? '14px' : '8px',
            }}
          >
            ✓
          </div>
        )}
      </div>
    </div>
  );
}
