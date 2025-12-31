'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TaskCarousel } from './TaskCarousel';

interface EmptyStateWithActionsProps {
  onCreateSample: (sampleTask: string) => void;
  onCreateOwn: () => void;
  onShowTour?: () => void;
}

/**
 * ADHD-Friendly Empty State
 * - Engaging visual (not boring text)
 * - Realistic task examples in carousel
 * - Immediate action buttons (no reading required)
 * - Optional tour link (skippable)
 */
export function EmptyStateWithActions({
  onCreateSample,
  onCreateOwn,
  onShowTour,
}: EmptyStateWithActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      {/* Animated Constellation Illustration */}
      <motion.div
        className="mb-8"
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <CosmicIllustration />
      </motion.div>

      {/* Heading */}
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center">
        Your Cosmic Task Board Awaits
      </h2>

      {/* Subheading */}
      <p className="text-blue-200 text-sm md:text-base mb-8 max-w-md mx-auto text-center leading-relaxed">
        Try a realistic example or create your own task.
        Watch AI break it down into achievable steps.
      </p>

      {/* Task Carousel */}
      <div className="w-full mb-6">
        <TaskCarousel onSelectTask={onCreateSample} />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full max-w-md mb-6">
        <div className="flex-1 h-px bg-purple-400/20" />
        <span className="text-purple-300/60 text-sm">Or</span>
        <div className="flex-1 h-px bg-purple-400/20" />
      </div>

      {/* Create Your Own Button */}
      <div className="w-full max-w-sm mb-6">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={<Sparkles className="w-5 h-5" />}
          onClick={onCreateOwn}
        >
          Create Your Own Task
        </Button>
      </div>

      {/* Optional Tour Link */}
      {onShowTour && (
        <button
          onClick={onShowTour}
          className="text-sm text-purple-300 hover:text-purple-200 underline transition-colors"
        >
          New here? Watch 20-sec demo
        </button>
      )}
    </motion.div>
  );
}

/**
 * Cosmic Illustration Component
 * Simple SVG constellation that represents task connections
 */
function CosmicIllustration() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_20px_rgba(167,139,250,0.4)]"
    >
      {/* Background glow */}
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Connection lines */}
      <motion.line
        x1="100"
        y1="60"
        x2="60"
        y2="120"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      <motion.line
        x1="100"
        y1="60"
        x2="140"
        y2="120"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 1, delay: 0.7 }}
      />
      <motion.line
        x1="60"
        y1="120"
        x2="100"
        y2="160"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 1, delay: 0.9 }}
      />
      <motion.line
        x1="140"
        y1="120"
        x2="100"
        y2="160"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 1, delay: 1.1 }}
      />

      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Stars/Nodes */}
      {[
        { x: 100, y: 60, delay: 0 },
        { x: 60, y: 120, delay: 0.2 },
        { x: 140, y: 120, delay: 0.4 },
        { x: 100, y: 160, delay: 0.6 },
      ].map((star, i) => (
        <g key={i}>
          {/* Glow */}
          <motion.circle
            cx={star.x}
            cy={star.y}
            r="20"
            fill="url(#starGlow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, delay: star.delay },
              opacity: { duration: 2, repeat: Infinity, delay: star.delay },
            }}
          />
          {/* Star */}
          <motion.circle
            cx={star.x}
            cy={star.y}
            r="8"
            fill="#a78bfa"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: star.delay }}
          />
          {/* Inner shine */}
          <motion.circle
            cx={star.x}
            cy={star.y}
            r="4"
            fill="#ffffff"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: star.delay + 0.1 }}
          />
        </g>
      ))}
    </svg>
  );
}
