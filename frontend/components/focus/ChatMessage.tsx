'use client';

import { motion } from 'framer-motion';

interface ChatMessageProps {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isAI = role === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isAI
            ? 'rounded-tl-none'
            : 'rounded-tr-none'
        }`}
        style={{
          background: isAI
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)'
            : 'linear-gradient(135deg, rgba(192, 132, 252, 0.3) 0%, rgba(232, 121, 249, 0.3) 100%)',
          border: `1px solid ${isAI ? 'rgba(59, 130, 246, 0.4)' : 'rgba(192, 132, 252, 0.4)'}`,
          boxShadow: isAI
            ? '0 0 20px rgba(59, 130, 246, 0.3)'
            : '0 0 20px rgba(192, 132, 252, 0.3)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p
          className="text-white text-sm md:text-base leading-relaxed"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          {content}
        </p>
        <p
          className={`text-xs mt-1 ${isAI ? 'text-blue-300' : 'text-purple-300'} opacity-70`}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          {timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  );
}
