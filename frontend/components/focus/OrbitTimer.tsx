'use client';

import { motion } from 'framer-motion';

interface OrbitTimerProps {
  duration: number; // minutes
  timeLeft: number; // seconds - from useReliableTimer hook
  isPlaying: boolean;
  onComplete: () => void;
  onToggle: () => void;
  color?: string;
}

export function OrbitTimer({
  duration,
  timeLeft: timeLeftProp,
  isPlaying,
  onComplete,
  onToggle,
  color = '#c084fc',
}: OrbitTimerProps) {
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Use timeLeft from props (passed from useReliableTimer hook)
  const timeLeft = timeLeftProp;

  // NOTE: Timer completion, sound, and vibration are now handled by useReliableTimer hook
  // OrbitTimer is now a pure presentation component that displays the timer visually

  const totalSeconds = duration * 60;
  const percentage = (timeLeft / totalSeconds) * 100;
  const strokeDashoffset = circumference - (timeLeft / totalSeconds) * circumference;

  // Dynamic color based on time remaining
  const getTimerColor = (): string => {
    if (percentage > 50) return '#c084fc'; // Purple
    if (percentage > 20) return '#e879f9'; // Magenta
    return '#ef4444'; // Red
  };

  const timerColor = getTimerColor();
  const isLowTime = percentage <= 20;

  // Format time display
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="relative flex items-center justify-center w-full max-w-[300px] aspect-square">
      {/* SVG Timer */}
      <svg
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        className="w-full h-full rotate-[-90deg]"
        style={{
          filter: `drop-shadow(0 0 15px ${timerColor}80)`,
        }}
      >
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient */}
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        {/* Background circle (dimmed) */}
        <circle
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        {/* Progress circle */}
        <motion.circle
          stroke={percentage > 50 ? "url(#timerGradient)" : timerColor}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          fill="transparent"
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          filter="url(#glow)"
          initial={{ strokeDashoffset: 0 }}
          animate={{
            strokeDashoffset,
            rotate: isPlaying ? 360 : 0,
          }}
          transition={{
            strokeDashoffset: { duration: 1, ease: "linear" },
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
          }}
        />
      </svg>

      {/* Center content - clickable */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10"
        onClick={onToggle}
      >
        {/* Time display */}
        <motion.span
          className="text-5xl md:text-6xl font-extralight tracking-tighter font-mono text-white"
          style={{ textShadow: `0 0 20px ${timerColor}` }}
          animate={isLowTime ? {
            opacity: [0.8, 1, 0.8],
            scale: [0.98, 1, 0.98],
          } : {}}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          {timeDisplay}
        </motion.span>

        {/* Status text */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-xs text-blue-300 mt-2 uppercase tracking-widest"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          {isPlaying ? 'System Active' : 'Click to Start'}
        </motion.div>

        {/* Progress percentage */}
        <div
          className="text-sm text-blue-200 mt-1 font-light"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          {Math.round(percentage)}%
        </div>
      </div>

      {/* Hover hint (only when not playing) */}
      {!isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-sm pointer-events-none"
        >
          <span className="text-white text-sm font-medium" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            TAP TO START
          </span>
        </motion.div>
      )}
    </div>
  );
}
