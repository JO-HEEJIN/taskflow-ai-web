'use client';

import { CheckCircle, Clock, BarChart3, Zap } from 'lucide-react';
import { Task } from '@/types';

interface QuickActionsProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
}

export function QuickActions({ tasks, selectedTaskId, onTaskSelect }: QuickActionsProps) {
  // Show up to 4 most relevant tasks
  const quickTasks = tasks.slice(0, 4);

  return (
    <div className="flex justify-center gap-6 mb-6">
      {quickTasks.map((task, index) => (
        <button
          key={task.id}
          onClick={() => onTaskSelect(task.id)}
          className={`p-3 rounded-full transition-all ${
            task.id === selectedTaskId
              ? 'bg-purple-500/30 border-2 border-purple-400 scale-110'
              : 'bg-white/10 border border-white/20 hover:bg-white/20'
          }`}
        >
          {getIconForTask(task, index)}
        </button>
      ))}
    </div>
  );
}

function getIconForTask(task: Task, index: number) {
  const icons = [
    <CheckCircle key="check" className="w-5 h-5" />,
    <Clock key="clock" className="w-5 h-5" />,
    <BarChart3 key="chart" className="w-5 h-5" />,
    <Zap key="zap" className="w-5 h-5" />,
  ];

  // Use task status to determine icon
  if (task.status === 'completed') {
    return <CheckCircle className="w-5 h-5 text-green-400" />;
  } else if (task.status === 'in_progress') {
    return <Zap className="w-5 h-5 text-yellow-400" />;
  } else {
    return icons[index % icons.length];
  }
}
