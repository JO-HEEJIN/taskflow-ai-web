'use client';

import { motion } from 'framer-motion';

interface AudioPermissionScreenProps {
  onAllow: () => void;
}

export function AudioPermissionScreen({ onAllow }: AudioPermissionScreenProps) {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="max-w-md w-full px-6 text-center"
      >
        {/* Main text */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.5 }}
          className="text-4xl md:text-5xl font-bold text-white mb-12"
        >
          Do you really wanna beat?
        </motion.h1>

        {/* YES button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 1.5 }}
          onClick={onAllow}
          className="text-2xl font-bold text-white hover:opacity-70 transition-opacity"
        >
          Click YES
        </motion.button>
      </motion.div>
    </div>
  );
}
