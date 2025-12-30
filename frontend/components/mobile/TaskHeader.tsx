'use client';

interface TaskHeaderProps {
  taskName: string;
  taskDuration: string;
}

export function TaskHeader({ taskName, taskDuration }: TaskHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold mb-2 text-white drop-shadow-lg">
        {taskName}
      </h1>
      <p className="text-sm text-white/60 font-light tracking-wide">
        {taskDuration}
      </p>
    </div>
  );
}
