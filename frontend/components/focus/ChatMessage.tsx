'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Code block component with copy button
function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded-lg overflow-hidden bg-black/40 border border-white/10">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="text-xs text-gray-400 font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-3 overflow-x-auto text-sm">
        <code className="text-gray-200 font-mono whitespace-pre">{children}</code>
      </pre>
    </div>
  );
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
        className={`max-w-[90%] px-4 py-3 rounded-2xl ${
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
        <div
          className="text-white text-sm md:text-base leading-relaxed prose prose-invert prose-sm max-w-none"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          <ReactMarkdown
            components={{
              // Custom code block rendering
              code({ node, className, children, ...props }) {
                const isInline = !className;
                const codeString = String(children).replace(/\n$/, '');

                if (isInline) {
                  return (
                    <code
                      className="bg-white/10 px-1.5 py-0.5 rounded text-pink-300 font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return <CodeBlock className={className}>{codeString}</CodeBlock>;
              },
              // Style paragraphs
              p({ children }) {
                return <p className="mb-2 last:mb-0">{children}</p>;
              },
              // Style lists
              ul({ children }) {
                return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <p
          className={`text-xs mt-2 ${isAI ? 'text-blue-300' : 'text-purple-300'} opacity-70`}
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
