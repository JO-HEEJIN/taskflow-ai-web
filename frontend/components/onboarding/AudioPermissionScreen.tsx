'use client';

import { motion } from 'framer-motion';

interface AudioPermissionScreenProps {
  onAllow: () => void;
}

export function AudioPermissionScreen({ onAllow }: AudioPermissionScreenProps) {
  const handleClick = () => {
    console.log('Audio permission clicked');
    onAllow();
  };

  return (
    <div
      className="min-h-screen w-full bg-black flex items-center justify-center cursor-pointer"
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.preventDefault();
        console.log('Audio permission touched');
        handleClick();
      }}
    >
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
          Do you want to outdo yourself?
        </motion.h1>

        {/* YES text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 1.5 }}
          className="text-2xl font-bold text-white"
        >
          YES
        </motion.p>
      </motion.div>
    </div>
  );
}
