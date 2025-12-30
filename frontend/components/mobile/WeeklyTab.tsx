'use client';

import { Task } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { ZodiacIcon } from './ZodiacIcon';

interface WeeklyTabProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  onBack?: () => void;
  onSettingsClick?: () => void;
}

export function WeeklyTab({ tasks, selectedTaskId, onTaskClick, onBack, onSettingsClick }: WeeklyTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Calculate task duration
  const calculateDuration = (task: Task): string => {
    const totalMinutes = task.subtasks.reduce((sum, st) => {
      return sum + (st.estimatedMinutes || 5);
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Generate constellation positions for tasks
    const positions = generateConstellationPositions(tasks.length, rect.width, rect.height);

    // Draw connections first (behind stars)
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < positions.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(positions[i].x, positions[i].y);
      ctx.lineTo(positions[i + 1].x, positions[i + 1].y);
      ctx.stroke();
    }

    // Draw stars
    positions.forEach((pos, index) => {
      const task = tasks[index];

      // Outer glow
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 15);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Star color based on status
      let starColor = 'rgba(255, 255, 255, 0.9)';
      if (task.status === 'completed') {
        starColor = 'rgba(34, 197, 94, 0.9)';
      } else if (task.status === 'in_progress') {
        starColor = 'rgba(168, 85, 247, 0.9)';
      }

      // Main star
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Inner shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [tasks]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const positions = generateConstellationPositions(tasks.length, rect.width, rect.height);

    positions.forEach((pos, index) => {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < 20) {
        onTaskClick(tasks[index].id);
      }
    });
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background - dark with stars */}
      <div className="absolute inset-0 bg-[#0a0118]">
        {/* Small stars scattered */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Back Button - Top Left */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 p-3 text-white/60 hover:text-white transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6" strokeWidth={2} />
      </button>

      {/* Settings Icon - Top Right */}
      <button
        onClick={onSettingsClick}
        className="absolute top-4 right-4 z-50 p-2 text-white/60 hover:text-white transition-colors"
      >
        <Settings className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Main Content */}
      <div className="relative z-10 pt-12 pb-32 px-6">
        {/* Task Name */}
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          {selectedTask?.title || 'All Tasks'}
        </h1>

        {/* Task Duration */}
        <p className="text-sm text-white/40 text-center mb-8">
          {selectedTask ? calculateDuration(selectedTask) : 'Weekly Overview'}
        </p>

        {/* Task Icons Row */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {tasks.slice(0, Math.min(5, tasks.length)).map((task, idx) => (
            <button
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className={`transition-all ${
                task.id === selectedTaskId ? 'scale-125' : 'scale-100 hover:scale-110'
              }`}
            >
              <ZodiacIcon
                index={idx}
                size={task.id === selectedTaskId ? 40 : 32}
                isActive={task.id === selectedTaskId}
              />
            </button>
          ))}
        </div>

        {/* Constellation View */}
        <div className="w-full aspect-square max-h-[60vh] rounded-2xl overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
            onClick={handleCanvasClick}
          />
        </div>
      </div>

      {/* Bottom Search/Filter Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0118] via-[#0a0118] to-transparent z-40">
        <div className="max-w-md mx-auto px-4">
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      {/* Twinkle animation */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function generateConstellationPositions(count: number, width: number, height: number) {
  const positions = [];
  const padding = 60;

  for (let i = 0; i < count; i++) {
    // Create a constellation-like pattern
    const angle = (i / count) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.35;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;

    positions.push({
      x: Math.max(padding, Math.min(width - padding, x)),
      y: Math.max(padding, Math.min(height - padding, y)),
    });
  }

  return positions;
}
