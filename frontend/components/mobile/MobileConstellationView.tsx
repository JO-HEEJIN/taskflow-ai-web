'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Task, NodeContext } from '@/types';
import {
  generateMobileHierarchyGraph,
  findNodeAtPoint,
  GraphNode,
  GraphLink,
} from '../graph/hierarchyUtils';

interface MobileConstellationViewProps {
  task: Task;
  onNodeClick: (context: NodeContext) => void;
  onTaskSwitch?: (direction: 'left' | 'right') => void;
  width?: number;
  height?: number;
}

/**
 * Mobile Solar System View
 * Shows single task (Sun) with orbiting subtasks (Planets) and atomics (Moons)
 * Inspired by "Orion's Belt Perspective" - same task data, executor's viewpoint
 */
export function MobileConstellationView({
  task,
  onNodeClick,
  onTaskSwitch,
  width = 400,
  height = 400,
}: MobileConstellationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [opacity, setOpacity] = useState(1);

  // Generate hierarchy graph when task changes
  useEffect(() => {
    if (!task) return;

    const graph = generateMobileHierarchyGraph(task, width, height);
    setNodes(graph.nodes);
    setLinks(graph.links);
  }, [task, width, height]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Set global opacity for fade animations
      ctx.globalAlpha = opacity;

      // 1. Draw connection lines first (behind nodes)
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        // Line style based on type
        if (link.type === 'task-subtask') {
          ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)'; // Purple
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)'; // Cyan
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 2]);
        }

        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
      });

      // 2. Draw nodes
      nodes.forEach((node) => {
        const radius = node.size / 2;

        // Glow effect for incomplete tasks (pulsing)
        if (!node.isCompleted && node.type !== 'task') {
          const glowRadius = radius + 4 + Math.sin(Date.now() / 500) * 2;
          const gradient = ctx.createRadialGradient(
            node.x,
            node.y,
            radius,
            node.x,
            node.y,
            glowRadius
          );
          gradient.addColorStop(0, `${node.color}80`);
          gradient.addColorStop(1, `${node.color}00`);

          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        // Fill with semi-transparent color
        ctx.fillStyle = `${node.color}33`; // 20% opacity
        ctx.fill();

        // Stroke (border)
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Label (only for task and subtask on mobile)
        if (node.type !== 'atomic') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = `${node.type === 'task' ? '12px' : '10px'} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          const label =
            node.title.length > 12
              ? node.title.slice(0, 12) + '...'
              : node.title;
          const labelY = node.y + radius + 6;

          // Text shadow for readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText(label, node.x, labelY);
          ctx.shadowBlur = 0;
        }
      });

      // Reset global alpha
      ctx.globalAlpha = 1;

      // Continue animation loop if there are incomplete tasks (for pulsing glow)
      const hasIncomplete = nodes.some((n) => !n.isCompleted);
      if (hasIncomplete) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, links, width, height, opacity]);

  // Handle touch/click
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if ('touches' in event) {
        // Touch event
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        // Mouse event
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Find node at click position (with generous hit area for mobile)
      const clickedNode = findNodeAtPoint(x, y, nodes, 2.5);

      if (!clickedNode) return;

      // Build NodeContext based on what was clicked
      const context: NodeContext = {
        type: clickedNode.type,
        taskId: task.id,
      };

      if (clickedNode.type === 'subtask') {
        context.subtaskId = clickedNode.id;
      } else if (clickedNode.type === 'atomic') {
        context.atomicId = clickedNode.id;
        // Find parent subtask
        const parentSubtask = nodes.find(
          (n) => n.type === 'subtask' && n.id === clickedNode.parentId
        );
        if (parentSubtask) {
          context.subtaskId = parentSubtask.id;
        }
      }

      onNodeClick(context);
    },
    [nodes, task, onNodeClick]
  );

  // Swipe gesture detection
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    if (touchStartX.current === null || !onTaskSwitch) return;

    const touchEndX = event.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    // Swipe threshold: 50px
    if (Math.abs(diff) > 50) {
      const direction = diff > 0 ? 'right' : 'left';

      // Trigger rotation animation
      setOpacity(0);

      setTimeout(() => {
        onTaskSwitch(direction);

        // Fade back in
        setTimeout(() => {
          setOpacity(1);
        }, 100);
      }, 300);
    }

    touchStartX.current = null;
  };

  return (
    <div className="relative w-full overflow-hidden bg-transparent">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="cursor-pointer touch-none"
        style={{
          transition: 'opacity 300ms ease-in-out',
        }}
      />

      {/* Swipe hint (optional - show on first visit) */}
      {onTaskSwitch && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400 pointer-events-none">
          ← Swipe to switch tasks →
        </div>
      )}
    </div>
  );
}
