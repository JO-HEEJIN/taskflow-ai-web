'use client';

import { Task, TaskStatus, NodeContext } from '@/types';
import { StarryBackground } from './StarryBackground';
import { SearchFilter } from './SearchFilter';
import { LayoutGrid } from 'lucide-react';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  generateHierarchyGraph,
  GraphNode,
  GraphLink,
  getConnectedNodes,
} from './graph/hierarchyUtils';

interface TaskGraphViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onNodeClick?: (context: NodeContext) => void;
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

/**
 * Obsidian-style Galaxy View
 *
 * Key features:
 * - Clean circles (no text inside nodes)
 * - Hover to show label + highlight connected nodes
 * - Bloom/glow effect like stars
 * - Smooth zoom/pan interactions
 */
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // View state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });

  // Node dragging state (for repositioning tasks)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Hover state for Obsidian-style interaction
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

  // Touch gesture states
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  // Graph data
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  // Track previous task IDs to detect new tasks
  const prevTaskIdsRef = useRef<Set<string>>(new Set());

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });

  // Animated glow intensities and radii for smooth fade-in/fade-out
  const glowIntensitiesRef = useRef<Map<string, number>>(new Map());
  const nodeRadiiRef = useRef<Map<string, number>>(new Map());

  // LocalStorage key for node positions
  const NODE_POSITIONS_KEY = 'taskflow_node_positions';

  // Load saved node positions from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(NODE_POSITIONS_KEY);
      if (saved) {
        setNodePositions(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load node positions:', e);
    }
  }, []);

  // Save node positions to localStorage
  const saveNodePositions = useCallback((positions: Record<string, { x: number; y: number }>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(NODE_POSITIONS_KEY, JSON.stringify(positions));
    } catch (e) {
      console.error('Failed to save node positions:', e);
    }
  }, []);

  // Generate hierarchy graph when tasks change
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 1920;
    const height = containerRef.current.clientHeight || 1080;
    setCanvasSize({ width: width * 2, height: height * 2 }); // 2x for pan space

    const graph = generateHierarchyGraph(tasks, width * 2, height * 2);

    // Apply saved positions to task nodes and move all descendants accordingly
    const taskOffsets = new Map<string, { dx: number; dy: number }>();

    // First pass: calculate offsets for tasks that have saved positions
    graph.nodes.forEach(node => {
      if (node.type === 'task' && nodePositions[node.id]) {
        const dx = nodePositions[node.id].x - node.x;
        const dy = nodePositions[node.id].y - node.y;
        taskOffsets.set(node.id, { dx, dy });
      }
    });

    // Helper to find the root task for any node
    const findRootTaskId = (nodeId: string): string | null => {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node) return null;
      if (node.type === 'task') return node.id;
      if (node.parentId) return findRootTaskId(node.parentId);
      return null;
    };

    // Apply offsets to all nodes based on their root task
    const finalNodes = graph.nodes.map(node => {
      if (node.type === 'task' && nodePositions[node.id]) {
        return { ...node, x: nodePositions[node.id].x, y: nodePositions[node.id].y };
      }
      // For subtasks and atomics, find their root task and apply the offset
      const rootTaskId = findRootTaskId(node.id);
      if (rootTaskId && taskOffsets.has(rootTaskId)) {
        const { dx, dy } = taskOffsets.get(rootTaskId)!;
        return { ...node, x: node.x + dx, y: node.y + dy };
      }
      return node;
    });

    setNodes(finalNodes);
    setLinks(graph.links);

    // Detect newly created tasks and center view on them
    const currentTaskIds = new Set(tasks.map(t => t.id));
    const newTaskIds = [...currentTaskIds].filter(id => !prevTaskIdsRef.current.has(id));

    if (newTaskIds.length > 0 && prevTaskIdsRef.current.size > 0) {
      // New task(s) created - center on the first new task
      const newTaskId = newTaskIds[0];
      const newTaskNode = finalNodes.find(n => n.type === 'task' && n.id === newTaskId);

      if (newTaskNode) {
        console.log(`🎯 Centering view on new task: ${newTaskNode.title.substring(0, 30)}`);
        setPan({
          x: width / 2 - newTaskNode.x,
          y: height / 2 - newTaskNode.y,
        });
      }
    } else if (finalNodes.length > 0 && pan.x === 0 && pan.y === 0) {
      // Center view on first load (no previous tasks)
      const avgX = finalNodes.reduce((sum, n) => sum + n.x, 0) / finalNodes.length;
      const avgY = finalNodes.reduce((sum, n) => sum + n.y, 0) / finalNodes.length;
      setPan({
        x: width / 2 - avgX,
        y: height / 2 - avgY,
      });
    }

    // Update previous task IDs reference
    prevTaskIdsRef.current = currentTaskIds;
  }, [tasks, nodePositions]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const render = (time: number) => {
      // Clear canvas with dark background
      ctx.fillStyle = '#0a0118';
      ctx.fillRect(0, 0, width, height);

      // Apply transform (pan + zoom)
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 1. Draw connection lines (nearly transparent until hover)
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (!source || !target) return;

        // Check if connected to hovered node
        const isHighlighted =
          highlightedNodes.has(link.source) && highlightedNodes.has(link.target);
        const hasHover = highlightedNodes.size > 0;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isHighlighted) {
          // Bright when this connection is highlighted
          ctx.strokeStyle = 'rgba(200, 200, 230, 0.7)';
          ctx.lineWidth = 1.5;
        } else if (hasHover) {
          // Very dim when something else is hovered
          ctx.strokeStyle = 'rgba(80, 80, 100, 0.05)';
          ctx.lineWidth = 0.5;
        } else {
          // Default - nearly transparent (like distant star dust)
          ctx.strokeStyle = 'rgba(120, 120, 150, 0.08)';
          ctx.lineWidth = 0.5;
        }

        ctx.stroke();
      });

      // 2. Draw nodes as stars with bloom effect
      // Helper to parse hex color
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
      };

      nodes.forEach(node => {
        const isHovered = hoveredNode?.id === node.id;
        const isConnected = highlightedNodes.has(node.id);
        const isDimmed = highlightedNodes.size > 0 && !isConnected;

        // Calculate pulse animation for incomplete nodes
        const pulsePhase = (time / 1000 + node.x / 100) % (Math.PI * 2);
        const pulse = node.isCompleted ? 1 : Math.sin(pulsePhase) * 0.2 + 0.8;

        // Node base radius with smooth scaling on hover (gradual star brightening)
        const baseRadius = node.size / 2;
        const targetRadius = isHovered ? baseRadius * 1.5 : baseRadius;
        const currentRadius = nodeRadiiRef.current.get(node.id) ?? baseRadius;
        const radius = currentRadius + (targetRadius - currentRadius) * 0.04;
        nodeRadiiRef.current.set(node.id, radius);

        // Skip very small nodes when zoomed out
        if (zoom < 0.4 && node.type === 'atomic') return;

        const rgb = hexToRgb(node.color);

        // Target glow intensity hierarchy: Task (brightest) → Subtask (dimmer) → Atomic (very dim)
        let targetGlowIntensity: number;
        if (isHovered || isConnected) {
          targetGlowIntensity = 1.0; // Bright when hovered
        } else if (node.type === 'task') {
          targetGlowIntensity = 0.9;
        } else if (node.type === 'subtask') {
          targetGlowIntensity = 0.4;
        } else {
          targetGlowIntensity = 0.1; // Very dim like distant star
        }

        // Smooth interpolation for glow fade-in/fade-out (like a star slowly brightening)
        const currentGlow = glowIntensitiesRef.current.get(node.id) ?? targetGlowIntensity;
        const lerpSpeed = 0.025; // Slow transition for gradual star glow (~1 second fade)
        const glowIntensity = currentGlow + (targetGlowIntensity - currentGlow) * lerpSpeed;
        glowIntensitiesRef.current.set(node.id, glowIntensity);

        // === BLOOM/GLOW EFFECT ===
        if (!isDimmed) {
          // Outer glow (soft, large)
          const glowRadius = radius * (isHovered ? 10 : 6);
          const gradient1 = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, glowRadius
          );
          gradient1.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 * pulse * glowIntensity})`);
          gradient1.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 * pulse * glowIntensity})`);
          gradient1.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.1 * pulse * glowIntensity})`);
          gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient1;
          ctx.fill();

          // Inner bright glow (only for non-atomic or when hovered)
          if (node.type !== 'atomic' || isHovered || isConnected) {
            const innerGlowRadius = radius * (isHovered ? 4 : 2.5);
            const gradient2 = ctx.createRadialGradient(
              node.x, node.y, 0,
              node.x, node.y, innerGlowRadius
            );
            gradient2.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pulse * glowIntensity})`);
            gradient2.addColorStop(0.25, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.6 * pulse * glowIntensity})`);
            gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.beginPath();
            ctx.arc(node.x, node.y, innerGlowRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient2;
            ctx.fill();
          }
        }

        // === MAIN STAR POINT (bright dot) ===
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        if (isDimmed) {
          ctx.fillStyle = 'rgba(80, 80, 100, 0.3)';
        } else {
          ctx.fillStyle = node.color;
        }
        ctx.fill();

        // White core for star effect
        if (!isDimmed) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * pulse})`;
          ctx.fill();
        }
      });

      // 3. Draw hover label (Obsidian style - only on hover)
      if (hoveredNode) {
        const labelX = hoveredNode.x;
        const labelY = hoveredNode.y - hoveredNode.size - 25; // Above the node

        // Label background
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const textMetrics = ctx.measureText(hoveredNode.title);
        const padding = 12;
        const bgWidth = Math.min(textMetrics.width + padding * 2, 300);
        const bgHeight = 30;

        // Dark background with rounded corners effect
        ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
        ctx.fillRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight);

        // Colored border (top accent)
        ctx.fillStyle = hoveredNode.color;
        ctx.fillRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, 3);

        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayTitle = hoveredNode.title.length > 35
          ? hoveredNode.title.slice(0, 35) + '...'
          : hoveredNode.title;
        ctx.fillText(displayTitle, labelX, labelY);

        // Show time estimate for subtasks/atomics
        if (hoveredNode.estimatedMinutes) {
          const timeText = `${hoveredNode.estimatedMinutes} min`;
          ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(timeText, labelX, labelY + 22);
        }
      }

      ctx.restore();

      // Continue animation loop
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links, zoom, pan, hoveredNode, highlightedNodes]);

  // Find node at canvas coordinates
  const findNodeAtCanvasPos = useCallback(
    (clientX: number, clientY: number): GraphNode | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      // Convert to canvas coordinates, accounting for pan and zoom
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;

      // Find node at position (priority: atomic > subtask > task)
      const hitRadius = 20 / zoom; // Larger hit area for easier interaction

      // Check atomic nodes first (smallest)
      for (const node of nodes.filter(n => n.type === 'atomic')) {
        const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        if (dist < node.size / 2 + hitRadius) return node;
      }

      // Then subtasks
      for (const node of nodes.filter(n => n.type === 'subtask')) {
        const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        if (dist < node.size / 2 + hitRadius) return node;
      }

      // Finally tasks
      for (const node of nodes.filter(n => n.type === 'task')) {
        const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        if (dist < node.size / 2 + hitRadius) return node;
      }

      return null;
    },
    [nodes, pan, zoom]
  );

  // Mouse move handler (hover detection + node dragging)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // If dragging a node, move it
      if (draggingNodeId) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const newX = (e.clientX - rect.left - pan.x) / zoom;
        const newY = (e.clientY - rect.top - pan.y) / zoom;

        // Update node position in state
        setNodes(prevNodes => {
          const draggedNode = prevNodes.find(n => n.id === draggingNodeId);
          if (!draggedNode) return prevNodes;

          const deltaX = newX - draggedNode.x;
          const deltaY = newY - draggedNode.y;

          // Find all descendants (subtasks and their atomics)
          const getDescendantIds = (parentId: string): string[] => {
            const children = prevNodes.filter(n => n.parentId === parentId);
            return children.flatMap(c => [c.id, ...getDescendantIds(c.id)]);
          };
          const descendantIds = new Set(getDescendantIds(draggingNodeId));

          return prevNodes.map(node => {
            if (node.id === draggingNodeId) {
              return { ...node, x: newX, y: newY };
            }
            // Move all descendants (subtasks + atomics) together
            if (descendantIds.has(node.id)) {
              return { ...node, x: node.x + deltaX, y: node.y + deltaY };
            }
            return node;
          });
        });
        return;
      }

      // If dragging canvas (panning)
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
        return;
      }

      // Detect hover
      const node = findNodeAtCanvasPos(e.clientX, e.clientY);
      setHoveredNode(node);

      if (node) {
        // Highlight connected nodes (Obsidian style)
        const connected = getConnectedNodes(node.id, nodes, links);
        setHighlightedNodes(connected);
      } else {
        setHighlightedNodes(new Set());
      }
    },
    [isDragging, dragStart, findNodeAtCanvasPos, nodes, links, draggingNodeId, pan, zoom]
  );

  // Mouse down handler (start drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if clicking on a task node (for node dragging)
    const node = findNodeAtCanvasPos(e.clientX, e.clientY);
    if (node && node.type === 'task') {
      // Start dragging the node
      setDraggingNodeId(node.id);
      setMouseDownPos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Otherwise, start canvas panning
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  }, [pan, findNodeAtCanvasPos]);

  // Mouse up handler (click detection + save node position)
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Check if it was a click (not a drag)
      const deltaX = Math.abs(e.clientX - mouseDownPos.x);
      const deltaY = Math.abs(e.clientY - mouseDownPos.y);
      const wasClick = deltaX < 5 && deltaY < 5;

      // If we were dragging a node, save its position
      if (draggingNodeId) {
        const wasDragged = !wasClick;
        if (wasDragged) {
          // Save the new position
          const draggedNode = nodes.find(n => n.id === draggingNodeId);
          if (draggedNode) {
            const newPositions = {
              ...nodePositions,
              [draggingNodeId]: { x: draggedNode.x, y: draggedNode.y },
            };
            setNodePositions(newPositions);
            saveNodePositions(newPositions);
            console.log(`📍 Saved position for task: ${draggedNode.title.substring(0, 20)}`);
          }
        } else {
          // It was a click on the task, trigger task click
          onTaskClick(draggingNodeId);
        }
        setDraggingNodeId(null);
        return;
      }

      setIsDragging(false);

      if (wasClick) {
        const node = findNodeAtCanvasPos(e.clientX, e.clientY);
        if (node) {
          // Handle node click based on type
          if (node.type === 'task') {
            onTaskClick((node.data as Task).id);
          } else if (onNodeClick) {
            // Helper to find root task ID by traversing up the parent chain
            const findRootTaskId = (nodeId: string): string => {
              const currentNode = nodes.find(n => n.id === nodeId);
              if (!currentNode) return '';
              if (currentNode.type === 'task') return currentNode.id;
              if (currentNode.parentId) return findRootTaskId(currentNode.parentId);
              return '';
            };

            const rootTaskId = findRootTaskId(node.id);

            // Create context based on actual node type
            // All children are stored in task.subtasks[] array
            // For atomic nodes, set both subtaskId (for adding children) and atomicId (for display)
            const context: NodeContext = {
              type: node.type as 'subtask' | 'atomic', // Use actual type
              taskId: rootTaskId,
              subtaskId: node.id, // Always set - needed for adding children to this node
              atomicId: node.type === 'atomic' ? node.id : undefined,
            };

            console.log(`🎯 Node click: ${node.title} (type: ${node.type}) → taskId: ${rootTaskId}, subtaskId: ${context.subtaskId}, atomicId: ${context.atomicId}`);
            onNodeClick(context);
          }
        } else if (onBackgroundClick) {
          onBackgroundClick();
        }
      }
    },
    [mouseDownPos, findNodeAtCanvasPos, nodes, onTaskClick, onNodeClick, onBackgroundClick, draggingNodeId, nodePositions, saveNodePositions]
  );

  // Wheel handler (zoom)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.2, zoom + delta), 3);
    setZoom(newZoom);
  }, [zoom]);

  // Touch handlers for mobile
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      setLastTouchDistance(getTouchDistance(e.touches[0], e.touches[1]));
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && lastTouchDistance) {
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const delta = distance - lastTouchDistance;
      const zoomFactor = 1 + delta / 500;
      const newZoom = Math.min(Math.max(0.2, zoom * zoomFactor), 3);
      setZoom(newZoom);
      setLastTouchDistance(distance);
    }
  }, [isDragging, dragStart, lastTouchDistance, zoom]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouchDistance(null);
  }, []);

  // Reset view
  const handleReset = () => {
    setZoom(1);
    if (nodes.length > 0) {
      const container = containerRef.current;
      if (container) {
        const avgX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
        const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
        setPan({
          x: container.clientWidth / 2 - avgX,
          y: container.clientHeight / 2 - avgY,
        });
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Dark background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: '#0a0118' }}
      />

      {/* Starry background */}
      <StarryBackground />

      {/* Search and Filter */}
      <div
        className="absolute top-2 left-2 right-2 md:top-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 max-w-xl w-full md:w-auto md:min-w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="backdrop-blur-md rounded-lg p-2 md:p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            boxShadow: '0 0 30px rgba(167, 139, 250, 0.3)',
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
        className="absolute bottom-4 left-4 md:top-4 md:left-4 md:bottom-auto z-50 backdrop-blur-md rounded-lg px-4 py-3 text-sm font-medium text-white transition-all flex items-center gap-2 min-h-[48px]"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
        }}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden md:inline">Kanban View</span>
      </button>

      {/* Reset view button */}
      <button
        onClick={handleReset}
        className="absolute bottom-4 right-4 z-50 backdrop-blur-md rounded-lg px-4 py-3 text-sm font-medium text-white transition-all min-h-[48px]"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
        }}
      >
        Reset View
      </button>

      {/* Zoom indicator */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/50 text-xs"
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`absolute inset-0 z-10 ${
          draggingNodeId ? 'cursor-grabbing' :
          isDragging ? 'cursor-grabbing' :
          (hoveredNode?.type === 'task') ? 'cursor-grab' :
          hoveredNode ? 'cursor-pointer' :
          'cursor-default'
        }`}
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setDraggingNodeId(null);
            setHoveredNode(null);
            setHighlightedNodes(new Set());
          }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full"
        />
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center">
            <p className="text-white text-xl mb-2">No tasks found</p>
            <p className="text-purple-300 text-sm">
              {statusFilter !== 'all'
                ? 'Try a different filter'
                : 'Create a new task to get started'}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="absolute top-20 right-4 z-50 backdrop-blur-md rounded-lg p-3 text-xs text-white/70 hidden md:block"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#FFF8E7]" style={{ boxShadow: '0 0 8px rgba(255, 248, 231, 0.8)' }} />
          <span>Task (bright star)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#C4D4F2]" style={{ boxShadow: '0 0 4px rgba(196, 212, 242, 0.5)' }} />
          <span>Subtask</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6B7B9E]" />
          <span>Atomic (distant)</span>
        </div>
      </div>
    </div>
  );
}
