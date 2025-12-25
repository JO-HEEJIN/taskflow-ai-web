'use client';

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 140,
  strokeWidth = 8,
  className = ''
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <defs>
        {/* Glow filter for progress */}
        <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth={strokeWidth}
      />

      {/* Progress circle with glow */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        filter={`url(#glow-${size})`}
        className="transition-all duration-300"
      />

      {/* Gradient definition - warmer colors with yellow */}
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
}
