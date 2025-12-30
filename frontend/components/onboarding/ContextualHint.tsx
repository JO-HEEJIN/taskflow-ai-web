'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

export interface ContextualHintProps {
  id: string; // Unique ID for localStorage tracking
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showOnce?: boolean; // Default true
  delay?: number; // Delay before showing (ms)
  autoHide?: number; // Auto hide after X seconds (0 = manual dismiss)
}

/**
 * ADHD-Friendly Contextual Hint
 * - Shows just-in-time learning hints
 * - Non-intrusive, easily dismissible
 * - Remembers if user dismissed it (localStorage)
 * - Optional auto-hide
 *
 * Usage:
 *   <div className="relative">
 *     <button>AI Breakdown</button>
 *     <ContextualHint
 *       id="ai-breakdown-hint"
 *       message="AI breaks tasks into 5-15 min steps!"
 *       position="top"
 *     />
 *   </div>
 */
export function ContextualHint({
  id,
  message,
  position = 'top',
  showOnce = true,
  delay = 1000,
  autoHide = 0,
}: ContextualHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `hint_dismissed_${id}`;

  useEffect(() => {
    // Check if already dismissed
    if (showOnce && typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(storageKey);
      if (dismissed) return;
    }

    // Show after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [id, showOnce, delay, storageKey]);

  useEffect(() => {
    // Auto hide
    if (isVisible && autoHide > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHide);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (showOnce && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  };

  const positionStyles = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-purple-600',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-purple-600',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-purple-600',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-purple-600',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
          className={`
            absolute ${positionStyles[position]}
            z-50
            max-w-xs
            pointer-events-auto
          `}
        >
          {/* Arrow */}
          <div className={`absolute w-0 h-0 ${arrowStyles[position]}`} />

          {/* Hint Card */}
          <div
            className="
              bg-gradient-to-br from-purple-600 to-purple-700
              text-white
              px-4 py-3
              rounded-lg
              shadow-xl
              flex items-start gap-3
              border-2 border-purple-400
            "
            style={{
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
            }}
          >
            {/* Icon */}
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />

            {/* Message */}
            <p className="text-sm font-medium flex-1 leading-relaxed">
              {message}
            </p>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="
                flex-shrink-0
                text-white/70
                hover:text-white
                transition-colors
                p-1
                hover:bg-white/10
                rounded
              "
              aria-label="Dismiss hint"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Preset hints for common features
 */
export const HintPresets = {
  AIBreakdown: (props?: Partial<ContextualHintProps>) => (
    <ContextualHint
      id="ai-breakdown"
      message="👈 Try me! AI breaks tasks into tiny 5-15 min steps"
      position="top"
      {...props}
    />
  ),

  FocusMode: (props?: Partial<ContextualHintProps>) => (
    <ContextualHint
      id="focus-mode"
      message="🎯 Focus Mode locks you in - one step at a time!"
      position="top"
      delay={2000}
      {...props}
    />
  ),

  KanbanView: (props?: Partial<ContextualHintProps>) => (
    <ContextualHint
      id="kanban-view"
      message="☰ Switch to Kanban for drag-and-drop organization"
      position="right"
      {...props}
    />
  ),

  FirstTask: (props?: Partial<ContextualHintProps>) => (
    <ContextualHint
      id="first-task"
      message="🎉 Great! Now let AI break it down into steps"
      position="bottom"
      autoHide={5000}
      {...props}
    />
  ),
};
