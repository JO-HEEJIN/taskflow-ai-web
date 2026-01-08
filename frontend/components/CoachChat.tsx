'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { CoachMessageContent } from './CoachMessageContent';
import { api } from '@/lib/api';
import { loadChatHistory, saveChatHistory, clearChatHistory } from '@/utils/chatStorage';

interface Message {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
}

interface CoachChatProps {
  taskId: string;
  taskTitle: string;
  subtaskTitle?: string;
}

export function CoachChat({ taskId, taskTitle, subtaskTitle }: CoachChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persisted chat history on mount
  useEffect(() => {
    const persisted = loadChatHistory(taskId);
    if (persisted.length > 0) {
      setMessages(persisted);
    }
  }, [taskId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isExpanded) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Send welcome message when chat expands for the first time
  useEffect(() => {
    if (isExpanded && messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'ai',
        content: `Hey! I'm your AI coach. What's on your mind about "${taskTitle}"?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      saveChatHistory(taskId, [welcomeMessage]);
    }
  }, [isExpanded, messages.length, taskTitle, taskId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveChatHistory(taskId, updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.chatWithCoach(
        userMessage.content,
        taskTitle,
        subtaskTitle,
        messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      );

      const aiMessage: Message = {
        role: 'ai',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      saveChatHistory(taskId, finalMessages);
    } catch (error) {
      console.error('Failed to get coach response:', error);
      const errorMessage: Message = {
        role: 'ai',
        content: "Oops! I'm having trouble connecting. Can you try again?",
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveChatHistory(taskId, finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear chat history for this task?')) {
      setMessages([]);
      clearChatHistory(taskId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border border-purple-200 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-white">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-gray-800">AI Coach</span>
          {messages.length > 0 && !isExpanded && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {messages.length} messages
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-purple-200">
          {/* Messages Area */}
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-white/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'text-white rounded-bl-none'
                  }`}
                  style={msg.role === 'ai' ? {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(99, 102, 241, 0.4) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
                  } : undefined}
                >
                  <CoachMessageContent content={msg.content} isUser={msg.role === 'user'} />
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded-lg rounded-bl-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(99, 102, 241, 0.4) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                  }}
                >
                  <Loader2 className="w-4 h-4 text-blue-300 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-purple-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for help..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="px-3 py-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Socratic coaching - asks questions to help you think
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
