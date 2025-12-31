'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCoachStore } from '@/store/useCoachStore';
import { Clock, X, Maximize2 } from 'lucide-react';

const POSITION_STORAGE_KEY = 'taskflow-floating-timer-position';

export function FloatingTimerWidget() {
  const { isTimerRunning, currentTimeLeft, isFocusMode, isPiPActive } = useCoachStore();
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved);
        setPosition({ x, y });
      } catch (error) {
        console.error('Failed to load widget position:', error);
      }
    }
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  // Handle dragging
  const handleDragEnd = (_event: any, info: any) => {
    setPosition({
      x: info.point.x,
      y: info.point.y,
    });
    setIsDragging(false);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Determine timer color based on time remaining
  const getTimerColor = () => {
    const percentage = currentTimeLeft / 60; // Rough percentage
    if (percentage > 10) return '#c084fc'; // Purple
    if (percentage > 5) return '#e879f9';  // Magenta
    return '#ef4444'; // Red
  };

  // Don't show if timer isn't running, in focus mode, or PiP is active
  if (!isTimerRunning || isFocusMode || isPiPActive || currentTimeLeft <= 0) {
    return null;
  }

  return (
    <motion.div
      ref={widgetRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9997,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="select-none"
    >
      {isMinimized ? (
        // Minimized view - just the icon
        <motion.div
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-br from-purple-900/95 to-purple-700/95 backdrop-blur-md border border-purple-500/30 rounded-full p-3 shadow-lg cursor-pointer hover:scale-110 transition-transform"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Clock className="w-5 h-5 text-white" style={{ color: getTimerColor() }} />
        </motion.div>
      ) : (
        // Expanded view - full timer
        <div
          className="bg-gradient-to-br from-purple-900/95 to-purple-700/95 backdrop-blur-md border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            boxShadow: `0 0 30px ${getTimerColor()}40`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-300" />
              <span className="text-xs font-medium text-purple-200">Focus Timer</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Minimize"
              >
                <Maximize2 className="w-3 h-3 text-purple-300" />
              </button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="px-6 py-4">
            <div className="text-center">
              <div
                className="text-4xl font-bold tabular-nums"
                style={{ color: getTimerColor() }}
              >
                {formatTime(currentTimeLeft)}
              </div>
              <div className="text-xs text-purple-300 mt-1">
                {currentTimeLeft > 60
                  ? `${Math.ceil(currentTimeLeft / 60)} minutes remaining`
                  : `${currentTimeLeft} seconds remaining`}
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 bg-black/20 border-t border-purple-500/20">
            <p className="text-[10px] text-purple-300/70 text-center">
              Drag to move • Synced across tabs
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
