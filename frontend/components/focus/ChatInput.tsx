'use client';

import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Ask your coach...' }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="flex items-center gap-2 p-3 rounded-2xl"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(167, 139, 250, 0.3)',
        boxShadow: '0 0 20px rgba(167, 139, 250, 0.2)',
      }}
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white text-sm md:text-base outline-none placeholder-gray-400"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="p-2 rounded-full transition-all disabled:opacity-30"
        style={{
          background: message.trim() && !disabled
            ? 'linear-gradient(135deg, #c084fc 0%, #e879f9 100%)'
            : 'rgba(100, 100, 100, 0.3)',
          boxShadow: message.trim() && !disabled
            ? '0 0 15px rgba(192, 132, 252, 0.5)'
            : 'none',
        }}
      >
        <Send className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}
