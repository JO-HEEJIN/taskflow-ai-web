'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CoachMessageContentProps {
  content: string;
  isUser?: boolean;
}

// Inline code block with copy button for coach messages
function InlineCodeBlock({ children, className }: { children: string; className?: string }) {
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
      <div className="flex items-center justify-between px-2 py-1 bg-white/5 border-b border-white/10">
        <span className="text-[10px] text-gray-400 font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-2 overflow-x-auto text-xs">
        <code className="text-gray-200 font-mono whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

export function CoachMessageContent({ content, isUser = false }: CoachMessageContentProps) {
  // For user messages, render as plain text
  if (isUser) {
    return <span>{content}</span>;
  }

  // For AI messages, render with markdown
  return (
    <div
      className="prose prose-invert prose-xs max-w-none text-white"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
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
                  className="bg-white/20 px-1 py-0.5 rounded text-pink-200 font-mono text-xs"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <InlineCodeBlock className={className}>{codeString}</InlineCodeBlock>;
          },
          // Style paragraphs
          p({ children }) {
            return <p className="mb-1.5 last:mb-0 text-sm leading-relaxed text-white">{children}</p>;
          },
          // Style lists
          ul({ children }) {
            return <ul className="list-disc list-inside mb-1.5 space-y-0.5 text-sm text-white">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-1.5 space-y-0.5 text-sm text-white">{children}</ol>;
          },
          // Style list items
          li({ children }) {
            return <li className="text-sm text-white">{children}</li>;
          },
          // Style headings
          h1({ children }) {
            return <h1 className="text-base font-bold mb-1.5 text-white">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-sm font-bold mb-1 text-white">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm font-semibold mb-1 text-white">{children}</h3>;
          },
          // Style strong/bold
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          // Style links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-blue-100 underline"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
