'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useCoachStore } from '@/store/useCoachStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Task, Subtask } from '@/types';
import { api } from '@/lib/api';

interface CoachViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: Task;
  currentSubtask: Subtask;
}

export function CoachView({ isOpen, onClose, currentTask, currentSubtask }: CoachViewProps) {
  const { messages, addMessage } = useCoachStore();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send welcome message when chat opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage('ai', `Hey! I'm here to help you with "${currentSubtask.title}". What's on your mind?`);
    }
  }, [isOpen, messages.length, currentSubtask.title, addMessage]);

  const handleSendMessage = async (userMessage: string) => {
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const response = await api.chatWithCoach(
        userMessage,
        currentTask.title,
        currentSubtask.title,
        messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      );

      addMessage('ai', response.message);
    } catch (error) {
      console.error('Failed to get coach response:', error);
      addMessage('ai', "Oops! I'm having trouble connecting. Can you try again?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed left-0 top-0 h-full z-[9998] w-full md:w-96 flex flex-col"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(30, 15, 50, 0.98) 0%, rgba(10, 5, 20, 0.98) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            boxShadow: '0 0 40px rgba(167, 139, 250, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            className="p-4 border-b"
            style={{
              borderColor: 'rgba(167, 139, 250, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-white font-semibold text-lg"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  AI Coach
                </h3>
                <p
                  className="text-blue-300 text-xs mt-1"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  Here to help you stay focused
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
            {messages.map((msg, index) => (
              <ChatMessage
                key={index}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="p-4 border-t"
            style={{
              borderColor: 'rgba(167, 139, 250, 0.3)',
            }}
          >
            <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading}
              placeholder="Ask for help..."
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
