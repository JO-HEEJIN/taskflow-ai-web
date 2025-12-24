interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  // Color based on progress
  const getColor = () => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 67) return 'bg-blue-500';
    if (progress >= 34) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${getColor()}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
