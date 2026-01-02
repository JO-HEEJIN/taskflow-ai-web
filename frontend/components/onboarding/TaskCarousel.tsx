'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { exampleTasks } from '@/lib/exampleTasks';

interface TaskCarouselProps {
  onSelectTask: (taskTitle: string) => void;
}

export function TaskCarousel({ onSelectTask }: TaskCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const currentTask = exampleTasks[currentIndex];

  // Navigate to next task
  const nextTask = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % exampleTasks.length);
  };

  // Navigate to previous task
  const prevTask = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + exampleTasks.length) % exampleTasks.length);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Only trigger swipe if horizontal movement is greater than vertical
    // This allows vertical scrolling while enabling horizontal swipe
    if (absDeltaX > absDeltaY && absDeltaX > 50) {
      if (deltaX > 0) {
        // Swiped left - go to next
        nextTask();
      } else {
        // Swiped right - go to previous
        prevTask();
      }
    }
  };

  // Slide animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        {/* Task Card */}
        <div
          className="px-4 py-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              <button
                onClick={() => onSelectTask(currentTask.title)}
                className="w-full text-left p-6 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)',
                }}
              >
                {/* Urgency Badge */}
                {currentTask.urgency === 'high' && (
                  <div className="flex items-center gap-1 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400 font-semibold uppercase">Urgent</span>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2">
                  {currentTask.title}
                </h3>

                {/* Description */}
                <p className="text-blue-200 text-sm mb-4 leading-relaxed">
                  {currentTask.description}
                </p>

                {/* Time Estimate */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-300" />
                  <span className="text-sm text-purple-300">
                    Estimated: {currentTask.estimatedTime}
                  </span>
                </div>
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {exampleTasks.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-purple-400 w-6'
                : 'bg-purple-400/30 hover:bg-purple-400/50'
            }`}
            aria-label={`Go to task ${index + 1}`}
          />
        ))}
      </div>

      {/* Helper Text */}
      <p className="text-center text-purple-300/60 text-xs mt-3">
        <span className="hidden md:inline">Tap dots to browse examples</span>
        <span className="md:hidden">Swipe or tap dots to browse examples</span>
      </p>
    </div>
  );
}
