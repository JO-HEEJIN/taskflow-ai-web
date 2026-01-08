'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Eye, Edit3 } from 'lucide-react';
import { useNotesStore } from '@/store/useNotesStore';
import { Task } from '@/types';
import ReactMarkdown from 'react-markdown';

interface NotePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: Task;
}

export function NotePanel({ isOpen, onClose, currentTask }: NotePanelProps) {
  const { getNoteByTaskId, addNote, updateNote } = useNotesStore();
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  // Load or create note when panel opens
  useEffect(() => {
    if (isOpen && currentTask) {
      let note = getNoteByTaskId(currentTask.id);
      if (!note) {
        note = addNote(currentTask.id, currentTask.title);
      }
      setNoteId(note.id);
      setContent(note.content);
    }
  }, [isOpen, currentTask, getNoteByTaskId, addNote]);

  // Debounced auto-save
  useEffect(() => {
    if (!noteId || !isOpen) return;

    const timeoutId = setTimeout(() => {
      updateNote(noteId, content);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [content, noteId, isOpen, updateNote]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed right-0 top-0 h-full z-[9998] w-full md:w-96 flex flex-col"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(50, 40, 15, 0.98) 0%, rgba(20, 15, 5, 0.98) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            boxShadow: '0 0 40px rgba(234, 179, 8, 0.3), inset 0 0 40px rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            className="p-4 border-b"
            style={{ borderColor: 'rgba(234, 179, 8, 0.3)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3
                    className="text-yellow-400 font-semibold text-lg"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    Note
                  </h3>
                  <p
                    className="text-yellow-200/70 text-xs mt-0.5 truncate max-w-[200px]"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    {currentTask.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle Preview/Edit */}
                <button
                  onClick={() => setIsPreview(!isPreview)}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    background: isPreview ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  }}
                  title={isPreview ? 'Edit mode' : 'Preview mode'}
                >
                  {isPreview ? (
                    <Edit3 className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-yellow-200/70" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-4" style={{ minHeight: 0 }}>
            {isPreview ? (
              /* Markdown Preview */
              <div
                className="h-full overflow-y-auto prose prose-invert prose-yellow prose-sm max-w-none"
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {content ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-yellow-400 text-xl font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-yellow-300 text-lg font-semibold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-yellow-200 text-base font-medium mb-1">{children}</h3>,
                      p: ({ children }) => <p className="text-white/90 mb-2 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside text-white/80 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside text-white/80 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-white/80">{children}</li>,
                      code: ({ children }) => (
                        <code className="bg-yellow-900/30 text-yellow-200 px-1.5 py-0.5 rounded text-sm">{children}</code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-yellow-500 pl-4 italic text-white/70 my-2">{children}</blockquote>
                      ),
                      strong: ({ children }) => <strong className="text-yellow-300 font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="text-yellow-200/90">{children}</em>,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-white/40 italic">No notes yet. Switch to edit mode to start writing.</p>
                )}
              </div>
            ) : (
              /* Markdown Editor */
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Write your notes here...

Supports Markdown:
# Heading
**bold** *italic*
- bullet list
1. numbered list
> quote
`code`"
                className="w-full h-full resize-none rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              />
            )}
          </div>

          {/* Footer - Auto-save indicator */}
          <div
            className="p-3 border-t text-center"
            style={{ borderColor: 'rgba(234, 179, 8, 0.2)' }}
          >
            <p className="text-xs text-yellow-200/50">
              Auto-saved to this device
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
