'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NoSubtasksEmptyStateProps {
  onAIBreakdown: () => void;
}

/**
 * ADHD-Friendly Empty State for Task Detail (No Subtasks)
 * - Shows when a task has no subtasks yet
 * - Encourages AI breakdown with clear example
 * - Engaging animation to draw attention
 */
export function NoSubtasksEmptyState({ onAIBreakdown }: NoSubtasksEmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {/* Animated Icon */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="text-6xl mb-4"
      >
        ✨
      </motion.div>

      {/* Heading */}
      <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900">
        Ready to Break It Down?
      </h3>

      {/* Description */}
      <p className="text-gray-600 text-sm md:text-base mb-6 max-w-sm mx-auto leading-relaxed">
        AI will create a big-picture breakdown first. If any step is over 10 minutes,
        you can break it down further at your own pace—giving you full control.
      </p>

      {/* Example Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6 max-w-md mx-auto"
      >
        <p className="text-sm text-purple-800 text-left">
          <strong className="block mb-2">Example breakdown:</strong>
          <span className="block mb-1">Learning TensorRT becomes:</span>
          <span className="block ml-4 mb-1">1. Setup environment <span className="text-purple-600 font-medium">(15 min)</span></span>
          <span className="block ml-4 mb-1">2. Understand optimization basics <span className="text-purple-600 font-medium">(30 min)</span></span>
          <span className="block ml-4 mb-1">3. Build first model <span className="text-purple-600 font-medium">(45 min)</span></span>
          <span className="block ml-4 text-purple-500 italic">→ Break down large steps further!</span>
        </p>
      </motion.div>

      {/* CTA Button */}
      <Button
        variant="primary"
        size="lg"
        icon={<Sparkles className="w-5 h-5" />}
        onClick={onAIBreakdown}
      >
        Break Down with AI
      </Button>
    </div>
  );
}
