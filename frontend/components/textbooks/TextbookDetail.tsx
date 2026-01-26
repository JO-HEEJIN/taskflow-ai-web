'use client';

import { useState } from 'react';
import { Textbook, Chapter } from '@/types';
import { useTextbookStore } from '@/store/textbookStore';
import { useTaskStore } from '@/store/taskStore';

interface TextbookDetailProps {
  textbook: Textbook;
  onClose: () => void;
  onBack: () => void;
}

export function TextbookDetail({ textbook, onClose, onBack }: TextbookDetailProps) {
  const { generateTasksFromTextbook, fetchTextbookById, isLoading } = useTextbookStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTextbook, setCurrentTextbook] = useState(textbook);

  // Check if any chapters have linked tasks
  const hasLinkedTasks = currentTextbook.chapters.some((ch) => ch.linkedTaskId);

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTasksFromTextbook(currentTextbook.id);
      setCurrentTextbook(result.textbook);
      await fetchTasks();
    } catch (error) {
      console.error('Failed to generate tasks:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getLinkedTask = (chapter: Chapter) => {
    if (!chapter.linkedTaskId) return null;
    return tasks.find((t) => t.id === chapter.linkedTaskId);
  };

  const getChapterProgress = (chapter: Chapter) => {
    const linkedTask = getLinkedTask(chapter);
    if (!linkedTask) return 0;
    return linkedTask.progress || 0;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-purple-500';
  };

  const getStatusBadge = (chapter: Chapter) => {
    if (chapter.isCompleted) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
          Completed
        </span>
      );
    }
    const linkedTask = getLinkedTask(chapter);
    if (linkedTask) {
      const progress = linkedTask.progress || 0;
      if (progress > 0) {
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
            In Progress
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
          Ready
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/50">
        Not Started
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.95) 0%, rgba(20, 10, 40, 0.98) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">{currentTextbook.title}</h2>
                {currentTextbook.author && (
                  <p className="text-sm text-purple-300/70 mt-1">by {currentTextbook.author}</p>
                )}
                {currentTextbook.description && (
                  <p className="text-sm text-purple-300/50 mt-2 max-w-lg">{currentTextbook.description}</p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Overall Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-purple-300">Overall Progress</span>
              <span className="text-white font-medium">{currentTextbook.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(currentTextbook.progress)}`}
                style={{ width: `${currentTextbook.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-purple-300/50 mt-1">
              <span>{currentTextbook.chapters.filter((ch) => ch.isCompleted).length} of {currentTextbook.chapters.length} chapters completed</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {/* Generate/Regenerate Tasks Button - Always visible */}
          <div className={`mb-6 p-4 rounded-xl border ${hasLinkedTasks ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30' : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">
                  {hasLinkedTasks ? 'Regenerate Study Tasks' : 'Generate Study Tasks'}
                </h3>
                <p className="text-sm text-purple-300/70 mt-1">
                  {hasLinkedTasks
                    ? 'Create new tasks for all chapters (existing task links will be updated)'
                    : 'Let AI create a structured learning plan for each chapter'}
                </p>
              </div>
              <button
                onClick={handleGenerateTasks}
                disabled={isGenerating || isLoading}
                className="px-4 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: hasLinkedTasks
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(6, 182, 212, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
                  border: hasLinkedTasks
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid rgba(167, 139, 250, 0.5)',
                }}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={hasLinkedTasks ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                    </svg>
                    {hasLinkedTasks ? 'Regenerate Tasks' : 'Generate Tasks'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Chapters List */}
          <div>
            <h3 className="text-sm font-medium text-purple-300 mb-4">Chapters</h3>
            <div className="space-y-3">
              {currentTextbook.chapters
                .sort((a, b) => a.order - b.order)
                .map((chapter, index) => {
                  const linkedTask = getLinkedTask(chapter);
                  const progress = getChapterProgress(chapter);

                  return (
                    <div
                      key={chapter.id}
                      className="p-4 rounded-xl transition-all"
                      style={{
                        background: chapter.isCompleted
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(40, 30, 60, 0.6) 0%, rgba(30, 20, 50, 0.6) 100%)',
                        border: `1px solid ${chapter.isCompleted ? 'rgba(34, 197, 94, 0.3)' : 'rgba(167, 139, 250, 0.2)'}`,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                              chapter.isCompleted
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {chapter.isCompleted ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-medium ${chapter.isCompleted ? 'text-green-300' : 'text-white'}`}>
                                {chapter.title}
                              </h4>
                              {getStatusBadge(chapter)}
                            </div>
                            {chapter.description && (
                              <p className="text-sm text-purple-300/60 mt-1">{chapter.description}</p>
                            )}
                            {linkedTask && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-purple-300/60">
                                    {linkedTask.subtasks.filter((s) => s.isCompleted).length} / {linkedTask.subtasks.length} subtasks
                                  </span>
                                  <span className="text-purple-300">{progress}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="text-sm text-purple-300/50">
              {hasLinkedTasks && (
                <span>Click on tasks in the main view to start studying</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
