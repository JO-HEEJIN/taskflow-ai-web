'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Task, NodeContext } from '@/types';
import {
  generateMobileHierarchyGraph,
  findNodeAtPoint,
  getConnectedNodes,
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
 *
 * Shows single task (Sun) with orbiting subtasks (Planets) and atomics (Moons)
 * Inspired by "Orion's Belt Perspective" - same task data, executor's viewpoint
 *
 * Features:
 * - Touch-optimized hit areas
 * - Bloom/glow effects like stars
 * - Swipe to switch between tasks
 * - Tap node to interact
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Generate hierarchy graph when task changes
  useEffect(() => {
    if (!task) return;

    const graph = generateMobileHierarchyGraph(task, width, height);
    setNodes(graph.nodes);
    setLinks(graph.links);
    setSelectedNodeId(null);
  }, [task, width, height]);

  // Render loop with bloom effects
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

    const render = (time: number) => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Set global opacity for fade animations
      ctx.globalAlpha = opacity;

      // Get highlighted nodes (connected to selected)
      const highlightedNodes = selectedNodeId
        ? getConnectedNodes(selectedNodeId, nodes, links)
        : new Set<string>();

      // 1. Draw connection lines (nearly invisible like desktop - real constellation style)
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (!source || !target) return;

        const isHighlighted =
          highlightedNodes.has(link.source) && highlightedNodes.has(link.target);
        const isDimmed = selectedNodeId && !isHighlighted;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isHighlighted) {
          // Bright when selected
          ctx.strokeStyle = 'rgba(200, 200, 230, 0.5)';
          ctx.lineWidth = 1;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(80, 80, 100, 0.03)';
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
        const isSelected = node.id === selectedNodeId;
        const isConnected = highlightedNodes.has(node.id);
        const isDimmed = selectedNodeId && !isConnected;

        // Pulse animation for incomplete nodes
        const pulsePhase = (time / 1000 + node.x / 100) % (Math.PI * 2);
        const pulse = node.isCompleted ? 1 : Math.sin(pulsePhase) * 0.2 + 0.8;

        const baseRadius = node.size / 2;
        const radius = isSelected ? baseRadius * 1.3 : baseRadius;
        const rgb = hexToRgb(node.color);

        // Glow intensity hierarchy: Task (brightest) → Subtask (dimmer) → Atomic (very dim)
        // Match desktop's subtle star-like appearance
        let glowIntensity: number;
        if (isSelected || isConnected) {
          glowIntensity = 1.0;
        } else if (node.type === 'task') {
          glowIntensity = 0.9;
        } else if (node.type === 'subtask') {
          glowIntensity = 0.4;
        } else {
          glowIntensity = 0.1; // Very dim like distant star (match desktop)
        }

        // === BLOOM/GLOW EFFECT (subtle like desktop) ===
        if (!isDimmed) {
          // Atomic nodes get wider, softer glow to distinguish from background stars
          const isAtomic = node.type === 'atomic';
          const glowMultiplier = isAtomic ? 12 : 6; // Wider glow for atomics
          const glowRadius = radius * (isSelected ? 10 : glowMultiplier);

          const gradient1 = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, glowRadius
          );

          if (isAtomic && !isSelected && !isConnected) {
            // Soft, diffuse glow for atomic nodes - more spread out
            gradient1.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 * pulse})`);
            gradient1.addColorStop(0.2, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.25 * pulse})`);
            gradient1.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.08 * pulse})`);
            gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            gradient1.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 * pulse * glowIntensity})`);
            gradient1.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 * pulse * glowIntensity})`);
            gradient1.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.1 * pulse * glowIntensity})`);
            gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient1;
          ctx.fill();

          // Inner bright glow (for all nodes now, but softer for atomics)
          const innerGlowRadius = isAtomic
            ? radius * (isSelected ? 4 : 3)
            : radius * (isSelected ? 4 : 2.5);
          const gradient2 = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, innerGlowRadius
          );

          if (isAtomic && !isSelected && !isConnected) {
            // Softer inner glow for atomics
            gradient2.addColorStop(0, `rgba(255, 255, 255, ${0.6 * pulse})`);
            gradient2.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.3 * pulse})`);
            gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            gradient2.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pulse * glowIntensity})`);
            gradient2.addColorStop(0.25, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.6 * pulse * glowIntensity})`);
            gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, innerGlowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient2;
          ctx.fill();
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

        // White core for star effect (smaller and more subtle)
        if (!isDimmed) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * pulse})`;
          ctx.fill();
        }
      });

      // 3. Draw label for selected node
      if (selectedNodeId) {
        const selectedNode = nodes.find(n => n.id === selectedNodeId);
        if (selectedNode) {
          const labelX = selectedNode.x;
          const labelY = selectedNode.y - selectedNode.size - 25;

          // Label background
          ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
          const text = selectedNode.title;
          const textMetrics = ctx.measureText(text);
          const padding = 12;
          const bgWidth = Math.min(textMetrics.width + padding * 2, width - 20);
          const bgHeight = 32;

          // Dark background
          ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
          ctx.fillRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight);

          // Colored top accent
          ctx.fillStyle = selectedNode.color;
          ctx.fillRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, 3);

          // Label text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const truncatedText = text.length > 25 ? text.slice(0, 25) + '...' : text;
          ctx.fillText(truncatedText, labelX, labelY);

          // Time estimate
          if (selectedNode.estimatedMinutes) {
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(`${selectedNode.estimatedMinutes} min`, labelX, labelY + 24);
          }
        }
      }

      // Reset global alpha
      ctx.globalAlpha = 1;

      // Continue animation loop
      const hasIncomplete = nodes.some(n => !n.isCompleted);
      if (hasIncomplete || selectedNodeId) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, links, width, height, opacity, selectedNodeId]);

  // Handle touch/click - Single tap opens directly
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if ('touches' in event) {
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Find node at click position
      const clickedNode = findNodeAtPoint(x, y, nodes, 3); // Generous hit area for mobile

      if (clickedNode) {
        // Single tap - directly trigger action
        const context: NodeContext = {
          type: clickedNode.type,
          taskId: task.id,
        };

        if (clickedNode.type === 'subtask') {
          context.subtaskId = clickedNode.id;
        } else if (clickedNode.type === 'atomic') {
          context.atomicId = clickedNode.id;
          const parentSubtask = nodes.find(n => n.id === clickedNode.parentId);
          if (parentSubtask) {
            context.subtaskId = parentSubtask.id;
          }
        }

        // Highlight briefly then open
        setSelectedNodeId(clickedNode.id);
        setTimeout(() => {
          onNodeClick(context);
        }, 150); // Brief highlight before opening
      } else {
        // Clicked on empty space - deselect
        setSelectedNodeId(null);
      }
    },
    [nodes, task, onNodeClick]
  );

  // Swipe gesture detection
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    if (touchStartX.current === null || touchStartY.current === null || !onTaskSwitch) {
      handleCanvasClick(event);
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = Math.abs(touchStartY.current - touchEndY);

    // Horizontal swipe detection (threshold: 50px horizontal, less than 50px vertical)
    if (Math.abs(diffX) > 50 && diffY < 50) {
      const direction = diffX > 0 ? 'right' : 'left';

      // Trigger fade animation
      setOpacity(0);

      setTimeout(() => {
        onTaskSwitch(direction);
        setTimeout(() => setOpacity(1), 100);
      }, 200);
    } else {
      // Not a swipe - treat as click
      handleCanvasClick(event);
    }

    touchStartX.current = null;
    touchStartY.current = null;
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
          transition: 'opacity 200ms ease-in-out',
          opacity,
        }}
      />

      {/* Swipe hint */}
      {onTaskSwitch && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/30 pointer-events-none">
          ← Swipe to switch tasks →
        </div>
      )}
    </div>
  );
}
