'use client';

import { Task, NodeContext } from '@/types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { ZodiacIcon } from './ZodiacIcon';
import { MobileConstellationView } from './MobileConstellationView';

interface WeeklyTabProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  onBack?: () => void;
  onSettingsClick?: () => void;
  onCreateTask?: () => void;
  showCompletionAnimation?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onNodeClick?: (context: NodeContext) => void; // For constellation node interaction
}

export function WeeklyTab({ tasks, selectedTaskId, onTaskClick, onBack, onSettingsClick, onCreateTask, showCompletionAnimation, searchQuery = '', onSearchChange, onNodeClick }: WeeklyTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showTwinkle, setShowTwinkle] = useState(false);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const [constellationSize, setConstellationSize] = useState({ width: 320, height: 320 });

  // Filter tasks based on search query
  const filteredTasks = searchQuery.trim()
    ? tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tasks;

  // Check if all tasks are completed
  const allTasksCompleted = tasks.length > 0 && tasks.every(t => t.status === 'completed');

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
    const positions = generateConstellationPositions(filteredTasks.length, rect.width, rect.height);

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
      const task = filteredTasks[index];

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
  }, [filteredTasks]);

  // Trigger twinkle animation when completion animation is shown
  useEffect(() => {
    if (showCompletionAnimation) {
      setShowTwinkle(true);
    }
  }, [showCompletionAnimation]);

  // Measure constellation container size
  useEffect(() => {
    const updateSize = () => {
      const size = Math.min(window.innerWidth - 48, window.innerHeight * 0.5, 400);
      setConstellationSize({ width: size, height: size });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle node click from MobileConstellationView
  const handleNodeClick = useCallback((context: NodeContext) => {
    console.log('📱 [WeeklyTab] Node clicked:', context);
    if (onNodeClick) {
      onNodeClick(context);
    }
  }, [onNodeClick]);

  // Handle task switch (swipe gesture)
  const handleTaskSwitch = useCallback((direction: 'left' | 'right') => {
    if (!selectedTaskId) return;
    const currentIndex = filteredTasks.findIndex(t => t.id === selectedTaskId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'right'
      ? (currentIndex + 1) % filteredTasks.length
      : (currentIndex - 1 + filteredTasks.length) % filteredTasks.length;

    onTaskClick(filteredTasks[newIndex].id);
  }, [selectedTaskId, filteredTasks, onTaskClick]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const positions = generateConstellationPositions(filteredTasks.length, rect.width, rect.height);

    // Check if clicked on a star
    let clickedOnStar = false;
    positions.forEach((pos, index) => {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < 20) {
        onTaskClick(filteredTasks[index].id);
        clickedOnStar = true;
      }
    });

    // If clicked on empty space, create new task
    if (!clickedOnStar && onCreateTask) {
      onCreateTask();
    }
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
        <p className="text-sm text-white/40 text-center mb-4">
          {selectedTask ? calculateDuration(selectedTask) : 'Weekly Overview'}
        </p>

        {/* Search Input */}
        {onSearchChange && (
          <div className="max-w-md mx-auto mb-6">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-md text-sm"
            />
          </div>
        )}

        {/* Task Icons Row */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {filteredTasks.slice(0, Math.min(5, filteredTasks.length)).map((task, idx) => (
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
        <div className="w-full aspect-square max-h-[60vh] rounded-2xl overflow-hidden relative flex items-center justify-center">
          {/* Show MobileConstellationView when task is selected, otherwise show all-tasks canvas */}
          {selectedTask && selectedTask.subtasks.length > 0 ? (
            <MobileConstellationView
              task={selectedTask}
              onNodeClick={handleNodeClick}
              onTaskSwitch={handleTaskSwitch}
              width={constellationSize.width}
              height={constellationSize.height}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-pointer"
              onClick={handleCanvasClick}
            />
          )}

          {/* Completion Animation - Twinkling and "Tap here" hint */}
          {(showTwinkle || allTasksCompleted) && !selectedTask && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Twinkling star effect */}
              <div
                className="absolute w-32 h-32 rounded-full animate-pulse"
                style={{
                  background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
                  animation: 'twinkleBig 2s ease-in-out infinite',
                }}
              />

              {/* "Tap here for a new task!" text */}
              <p
                className="text-white text-lg font-bold text-center px-6 relative z-10"
                style={{
                  textShadow: '0 0 20px rgba(34, 197, 94, 0.8)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                Tap here for a new task!
              </p>
            </div>
          )}
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

      {/* Animations */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes twinkleBig {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.8;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
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
