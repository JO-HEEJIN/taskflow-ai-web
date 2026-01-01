'use client';

import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';

interface AudioPermissionScreenProps {
  onAllow: () => void;
}

export function AudioPermissionScreen({ onAllow }: AudioPermissionScreenProps) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(30, 15, 50, 1) 0%, rgba(10, 5, 20, 1) 100%)',
      }}
    >
      {/* Animated background stars */}
      <div className="absolute inset-0 opacity-50 mix-blend-screen pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full px-6 text-center"
      >
        {/* Sound icon with pulse animation */}
        <motion.div
          className="mb-8 flex justify-center"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative">
            {/* Outer glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(192, 132, 252, 0.3)',
                  '0 0 60px rgba(192, 132, 252, 0.6)',
                  '0 0 20px rgba(192, 132, 252, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Volume2 className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
          </div>
        </motion.div>

        {/* Main text */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-bold text-white mb-4"
          style={{
            textShadow: '0 0 30px rgba(192, 132, 252, 0.5)',
          }}
        >
          Do you really wanna beat?
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-purple-200 mb-12"
        >
          Enable sound to experience the full power of focus mode
        </motion.p>

        {/* YES button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAllow}
          className="w-full py-5 px-8 rounded-2xl text-xl font-bold text-white relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #c084fc 0%, #60a5fa 100%)',
            boxShadow: '0 0 40px rgba(192, 132, 252, 0.5), inset 0 0 40px rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
            animate={{
              x: ['-200%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <span className="relative z-10">YES, LET'S GO</span>
        </motion.button>

        {/* Small disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-white/40 mt-6"
        >
          We'll play completion sounds to keep you motivated
        </motion.p>
      </motion.div>
    </div>
  );
}
