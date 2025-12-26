'use client';

import { Task } from '@/types';
import { CircularProgress } from './CircularProgress';
import { useTaskStore } from '@/store/taskStore';
import { useState, useRef, useEffect } from 'react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onEdit?: (taskId: string) => void;
  isLinked?: boolean;
}

export function TaskCard({ task, onClick, onEdit, isLinked = false }: TaskCardProps) {
  const { deleteTask } = useTaskStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this task and all subtasks?')) {
      setIsDeleting(true);
      await deleteTask(task.id);
    }
  };

  // Handle click outside on mobile to close hover state
  useEffect(() => {
    if (!isHovered) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsHovered(false);
      }
    };

    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHovered]);

  const getStatusColor = () => {
    if (task.status === 'completed') return 'border-green-400/40';
    if (task.status === 'in_progress') return 'border-purple-400/40';
    return 'border-white/30';
  };

  const getGlassBg = () => {
    if (task.status === 'completed') return 'rgba(34, 197, 94, 0.15)';
    if (task.status === 'in_progress') return 'rgba(168, 85, 247, 0.15)';
    return 'rgba(255, 255, 255, 0.1)';
  };

  const size = isLinked ? 120 : 160;
  const innerSize = size;

  const radius = (size + 60) / 2; // Increased for more spacing
  const buttonRadius = size / 2 + 40; // Distance from center to buttons
  const centerX = 30 + size / 2; // Center X of the main circle
  const centerY = 30 + size / 2; // Center Y of the main circle

  // Calculate positions for radial buttons in a circular pattern
  const deletePos = {
    top: centerY - buttonRadius - 20,
    left: centerX - 20,
  };

  const editPos = {
    top: centerY - Math.cos(Math.PI / 4) * buttonRadius - 20,
    left: centerX + Math.sin(Math.PI / 4) * buttonRadius,
  };

  const infoPos = {
    top: centerY + Math.cos(Math.PI / 4) * buttonRadius - 20,
    left: centerX - Math.sin(Math.PI / 4) * buttonRadius - 40,
  };

  return (
    <div
      ref={cardRef}
      onClick={(e) => {
        e.stopPropagation(); // Prevent background click
        // Only trigger onClick if not clicking on buttons
        if ((e.target as HTMLElement).closest('button')) return;
        if (onClick) onClick();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation(); // Prevent background click on mobile
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => {
        // Toggle hover state on mobile
        setIsHovered(true);
      }}
      className={`relative cursor-pointer transition-all duration-300 ${
        isDeleting ? 'opacity-50' : ''
      } ${isHovered ? 'scale-105' : ''}`}
      style={{ width: size + 60, height: size + 60, padding: '30px' }}
    >
      {/* Radial menu buttons - Unified glassmorphism style */}
      {/* Delete button - top */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleDelete(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleDelete(e as any);
        }}
        disabled={isDeleting}
        className={`absolute rounded-full w-12 h-12 flex items-center justify-center text-xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
        }`}
        style={{
          ...deletePos,
          background: 'rgba(239, 68, 68, 0.25)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.05)',
          transitionDelay: isHovered ? '0ms' : '0ms',
          zIndex: 100,
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.05)';
        }}
        title="Delete Task"
      >
        <span style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>✕</span>
      </button>

      {/* Edit button - right */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onEdit) onEdit(task.id);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onEdit) onEdit(task.id);
        }}
        className={`absolute rounded-full w-12 h-12 flex items-center justify-center text-xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
        }`}
        style={{
          ...editPos,
          background: 'rgba(168, 85, 247, 0.25)',
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.05)',
          transitionDelay: isHovered ? '50ms' : '0ms',
          zIndex: 100,
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.35)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.05)';
        }}
        title="Edit Task"
      >
        <span style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>✏️</span>
      </button>

      {/* Info button - bottom left */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onClick) onClick();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onClick) onClick();
        }}
        className={`absolute rounded-full w-12 h-12 flex items-center justify-center text-xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
        }`}
        style={{
          ...infoPos,
          background: 'rgba(255, 255, 255, 0.2)',
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.05)',
          transitionDelay: isHovered ? '100ms' : '0ms',
          zIndex: 100,
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.05)';
        }}
        title="View Details"
      >
        <span style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>ℹ️</span>
      </button>

      {/* Outer glow effect - constellation star */}
      <div
        className="absolute rounded-full transition-all duration-300 animate-starPulse"
        style={{
          left: '15px',
          top: '15px',
          width: size + 30,
          height: size + 30,
          background: isHovered
            ? 'radial-gradient(circle, rgba(167, 139, 250, 0.3) 0%, rgba(167, 139, 250, 0.1) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0.05) 40%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
          animationDelay: `${Math.random() * 2}s`, // Random delay for more natural twinkling
        }}
      />

      {/* Inner glow effect */}
      <div
        className="absolute rounded-full transition-all duration-300 animate-starPulse"
        style={{
          left: '22px',
          top: '22px',
          width: size + 16,
          height: size + 16,
          background: isHovered
            ? 'radial-gradient(circle, rgba(196, 181, 253, 0.4) 0%, rgba(196, 181, 253, 0.15) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(196, 181, 253, 0.25) 0%, rgba(196, 181, 253, 0.08) 50%, transparent 70%)',
          filter: 'blur(4px)',
          pointerEvents: 'none',
          animationDelay: `${Math.random() * 2}s`, // Random delay for more natural twinkling
        }}
      />

      {/* Circular progress ring - perfectly aligned */}
      <div className="absolute" style={{ left: '30px', top: '30px' }}>
        <CircularProgress progress={task.progress} size={size} strokeWidth={isLinked ? 7 : 9} />
      </div>

      {/* Main circular node with glassmorphism */}
      <div
        className={`absolute flex items-center justify-center`}
        style={{
          width: innerSize,
          height: innerSize,
          left: '30px',
          top: '30px',
        }}
      >
        <div
          className={`w-full h-full rounded-full border ${getStatusColor()} transition-all duration-300 flex flex-col items-center justify-center p-4 relative backdrop-blur-md`}
          style={{
            background: getGlassBg(),
            boxShadow: isHovered
              ? '0 0 30px rgba(167, 139, 250, 0.4), 0 0 60px rgba(167, 139, 250, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.05)'
              : '0 0 20px rgba(167, 139, 250, 0.2), 0 0 40px rgba(167, 139, 250, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.03)',
          }}
        >

          {/* Task content */}
          <div className="flex flex-col items-center justify-center text-center gap-1 w-full">
            <h3
              className={`font-semibold text-white drop-shadow-lg line-clamp-2 break-words ${
                isLinked ? 'text-xs' : 'text-sm'
              }`}
              style={{
                maxWidth: '90%',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 10px rgba(167, 139, 250, 0.3)',
              }}
            >
              {task.title}
            </h3>

            <div
              className={`font-bold text-white ${
                isLinked ? 'text-lg' : 'text-2xl'
              }`}
              style={{
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6), 0 0 20px rgba(196, 181, 253, 0.5)',
              }}
            >
              {task.progress}%
            </div>

            <div
              className={`text-gray-200 ${isLinked ? 'text-[10px]' : 'text-xs'}`}
              style={{
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
              }}
            >
              {task.subtasks.filter((st) => st.isCompleted).length}/{task.subtasks.length} tasks
            </div>

            {isLinked && (
              <div
                className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[10px] text-purple-200 backdrop-blur-sm px-2 py-0.5 rounded-full border border-purple-400/30"
                style={{
                  background: 'rgba(168, 85, 247, 0.2)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                }}
              >
                🔗 Linked
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover tooltip with full title */}
      {isHovered && task.title.length > 30 && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 max-w-xs truncate">
          {task.title}
        </div>
      )}
    </div>
  );
}
