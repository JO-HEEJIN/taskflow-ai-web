'use client';

import { useEffect, useState } from 'react';
import { useTextbookStore } from '@/store/textbookStore';
import { Textbook } from '@/types';
import { AddTextbookModal } from './AddTextbookModal';
import { TextbookDetail } from './TextbookDetail';

interface TextbookLibraryProps {
  onClose: () => void;
}

export function TextbookLibrary({ onClose }: TextbookLibraryProps) {
  const { textbooks, fetchTextbooks, deleteTextbook, isLoading, error } = useTextbookStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);

  useEffect(() => {
    fetchTextbooks();
  }, [fetchTextbooks]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this textbook?')) {
      await deleteTextbook(id);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-purple-500';
  };

  if (selectedTextbook) {
    return (
      <TextbookDetail
        textbook={selectedTextbook}
        onClose={() => setSelectedTextbook(null)}
        onBack={() => setSelectedTextbook(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.95) 0%, rgba(20, 10, 40, 0.98) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)',
              }}
            >
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Textbook Library</h2>
              <p className="text-sm text-purple-300/70">{textbooks.length} textbook{textbooks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
                border: '1px solid rgba(167, 139, 250, 0.5)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Textbook
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading && textbooks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => fetchTextbooks()}
                className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all"
              >
                Retry
              </button>
            </div>
          ) : textbooks.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                }}
              >
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No textbooks yet</h3>
              <p className="text-purple-300/70 mb-6">
                Add your first textbook and let AI create a structured study plan
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 rounded-lg text-white font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
                  border: '1px solid rgba(167, 139, 250, 0.5)',
                }}
              >
                Add Your First Textbook
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {textbooks.map((textbook) => (
                <div
                  key={textbook.id}
                  onClick={() => setSelectedTextbook(textbook)}
                  className="group relative p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(40, 30, 60, 0.8) 0%, rgba(30, 20, 50, 0.8) 100%)',
                    border: '1px solid rgba(167, 139, 250, 0.2)',
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(textbook.id, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-red-400 hover:bg-red-500/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  {/* Content */}
                  <div className="mb-3">
                    <h3 className="text-white font-medium truncate pr-6">{textbook.title}</h3>
                    {textbook.author && (
                      <p className="text-sm text-purple-300/60 truncate">by {textbook.author}</p>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-purple-300/70">{textbook.chapters.length} chapters</span>
                      <span className="text-purple-300">{textbook.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(textbook.progress)}`}
                        style={{ width: `${textbook.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 text-xs text-purple-300/50">
                    <span>{textbook.chapters.filter(c => c.isCompleted).length}/{textbook.chapters.length} completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Textbook Modal */}
      {showAddModal && (
        <AddTextbookModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
