'use client';

import { useEffect, useState } from 'react';
import { Play, Pause, X } from 'lucide-react';

interface PiPTimerProps {
  taskTitle: string;
  subtaskTitle: string;
  currentTimeLeft: number;
  isTimerRunning: boolean;
  initialDuration: number;
  onClose: () => void;
  onToggleTimer: () => void;
}

/**
 * Minimal timer UI for Picture-in-Picture window
 * Displays in an always-on-top floating window with horizontal progress bar
 */
export function PiPTimer({
  taskTitle,
  subtaskTitle,
  currentTimeLeft: initialTimeLeft,
  isTimerRunning: initialIsRunning,
  initialDuration,
  onClose,
  onToggleTimer,
}: PiPTimerProps) {
  // Local state for independent countdown
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [isRunning, setIsRunning] = useState(initialIsRunning);

  // Sync with props
  useEffect(() => {
    setTimeLeft(initialTimeLeft);
  }, [initialTimeLeft]);

  useEffect(() => {
    setIsRunning(initialIsRunning);
  }, [initialIsRunning]);

  // Independent countdown
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate progress percentage (0-100)
  const progressPercentage = initialDuration > 0
    ? Math.max(0, Math.min(100, (timeLeft / initialDuration) * 100))
    : 0;

  // Get color based on progress (blue → purple → red)
  const getProgressColor = () => {
    if (progressPercentage > 66) {
      return 'rgb(96, 165, 250)'; // blue-400
    } else if (progressPercentage > 33) {
      return 'rgb(192, 132, 252)'; // purple-400
    } else {
      return 'rgb(239, 68, 68)'; // red-500
    }
  };

  // Get pulse animation speed based on remaining time
  const getPulseSpeed = () => {
    if (progressPercentage > 50) return '3s';
    if (progressPercentage > 25) return '2s';
    if (progressPercentage > 10) return '1s';
    return '0.5s'; // Very fast when almost done
  };

  // Auto-close PiP if timer completes
  useEffect(() => {
    if (timeLeft <= 0) {
      setTimeout(() => onClose(), 1000);
    }
  }, [timeLeft, onClose]);

  const color = getProgressColor();
  const pulseSpeed = getPulseSpeed();
  const shouldPulse = progressPercentage < 50;

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center px-6 py-2 text-white relative overflow-visible">
      {/* Animated background glow */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />

      {/* Header with close button */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
          title="Close Picture-in-Picture"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Timer display */}
      <div className="w-full flex flex-col items-center gap-3 z-10">
        {/* Time */}
        <div
          className="text-5xl font-bold tabular-nums"
          style={{
            color,
            textShadow: `0 0 20px ${color}, 0 0 30px ${color}`,
            transition: 'color 0.5s ease',
          }}
        >
          {formatTime(timeLeft)}
        </div>

        {/* Horizontal Progress Bar */}
        <div className="w-full relative" style={{ padding: '0 8px' }}>
          {/* Background bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-visible relative">
            {/* Progress bar with glow */}
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear relative"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: color,
                boxShadow: `
                  0 0 8px ${color},
                  0 0 16px ${color},
                  0 0 24px ${color}40
                `,
                animation: shouldPulse ? `pulse-bar ${pulseSpeed} ease-in-out infinite` : 'none',
              }}
            >
              {/* Extra glow on the right edge */}
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `
                    0 0 12px ${color},
                    0 0 20px ${color},
                    0 0 28px ${color}60
                  `,
                }}
              />
            </div>
          </div>
        </div>

        {/* Task info */}
        <div className="text-center max-w-[280px]">
          <div className="text-xs text-white/90 font-medium truncate mb-0.5">
            {taskTitle}
          </div>
          <div className="text-[10px] text-white/60 truncate">
            {subtaskTitle}
          </div>
        </div>

        {/* Play/Pause button */}
        <button
          onClick={onToggleTimer}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm border border-white/20 text-sm"
          style={{
            boxShadow: `0 0 16px ${color}30`,
          }}
        >
          {isRunning ? (
            <>
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Resume</span>
            </>
          )}
        </button>
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse-bar {
          0%, 100% {
            opacity: 1;
            box-shadow:
              0 0 8px ${color},
              0 0 16px ${color},
              0 0 24px ${color}40;
          }
          50% {
            opacity: 0.7;
            box-shadow:
              0 0 16px ${color},
              0 0 28px ${color},
              0 0 40px ${color}60;
          }
        }
      `}</style>
    </div>
  );
}
