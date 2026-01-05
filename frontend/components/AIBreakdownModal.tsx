'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useToast } from '@/contexts/ToastContext';
import { createPlaceholderSubtasks } from '@/hooks/useOptimisticTasks';
import { BreakdownSkeleton, SubtaskSkeleton } from './SubtaskSkeleton';
import { Sparkles } from 'lucide-react';
import { AISubtaskSuggestion } from '@/types';
import { useStreamingBreakdown } from '@/hooks/useStreamingBreakdown';

interface AIBreakdownModalProps {
  taskId: string;
  onClose: () => void;
}

export function AIBreakdownModal({ taskId, onClose }: AIBreakdownModalProps) {
  const { generateAIBreakdown, addSubtasks, tasks } = useTaskStore();
  const toast = useToast();
  const [suggestions, setSuggestions] = useState<AISubtaskSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showOptimisticSkeleton, setShowOptimisticSkeleton] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true); // ✅ ENABLED: Backend streaming now stable with CoT + CoV

  // Streaming hook for progressive rendering
  const {
    subtasks: streamedSubtasks,
    isStreaming,
    error: streamError,
    startBreakdown,
    stopBreakdown,
  } = useStreamingBreakdown();

  // Sync streamed subtasks to suggestions
  useEffect(() => {
    if (streamedSubtasks.length > 0) {
      console.log(`📥 [AIBreakdownModal] Syncing ${streamedSubtasks.length} streamed subtasks to suggestions`);
      setSuggestions(streamedSubtasks);
    }
  }, [streamedSubtasks]);

  // Handle streaming completion
  useEffect(() => {
    if (!isStreaming && useStreaming && streamedSubtasks.length > 0) {
      // Streaming completed successfully
      setIsGenerating(false);
      setShowOptimisticSkeleton(false);
    }
  }, [isStreaming, useStreaming, streamedSubtasks.length]);

  // Handle streaming errors
  useEffect(() => {
    if (streamError) {
      console.error('❌ [Streaming Error]:', streamError);
      // Automatically fallback to non-streaming mode on error
      setUseStreaming(false);
    }
  }, [streamError]);

  // Auto-generate on mount with optimistic UI + streaming
  useEffect(() => {
    const autoGenerate = async () => {
      setShowOptimisticSkeleton(true);
      setIsGenerating(true);

      if (useStreaming) {
        // STREAMING MODE: Progressive rendering (first subtask in ~1-2s)
        console.log('🎬 [AIBreakdownModal] Starting STREAMING mode');
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          console.log('📋 [AIBreakdownModal] Task:', task.title);
          startBreakdown(task.title, task.description);
          // Hide skeleton after 500ms (streaming will show results progressively)
          setTimeout(() => setShowOptimisticSkeleton(false), 500);
        }
      } else {
        console.log('🎬 [AIBreakdownModal] Starting FALLBACK mode (non-streaming)');
        // FALLBACK MODE: Traditional all-at-once (4s wait)
        startTransition(async () => {
          try {
            const result = await generateAIBreakdown(taskId);
            setSuggestions(result.suggestions || []);
          } catch (error) {
            console.error('AI breakdown error:', error);
          } finally {
            setIsGenerating(false);
            setShowOptimisticSkeleton(false);
          }
        });
      }
    };
    autoGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    // Show skeleton immediately for optimistic UI (<1s perceived latency)
    setShowOptimisticSkeleton(true);
    setIsGenerating(true);
    setSuggestions([]); // Clear previous

    if (useStreaming) {
      // STREAMING MODE: Progressive rendering
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        startBreakdown(task.title, task.description);
        setTimeout(() => setShowOptimisticSkeleton(false), 500);
      }
    } else {
      // FALLBACK MODE: Traditional
      startTransition(async () => {
        try {
          const result = await generateAIBreakdown(taskId);
          setSuggestions(result.suggestions || []);
        } catch (error) {
          console.error('AI breakdown error:', error);
          toast.error('AI got distracted by a supernova! Mind trying again?', {
            action: {
              label: 'Retry',
              onClick: handleGenerate,
            },
          });
          setSuggestions([]);
        } finally {
          setIsGenerating(false);
          setShowOptimisticSkeleton(false);
        }
      });
    }
  };

  /**
   * Flatten children into atomic constellation nodes
   * Children become top-level subtasks with "Atomic: " prefix
   */
  const flattenChildrenToAtomicTasks = (suggestions: AISubtaskSuggestion[]): AISubtaskSuggestion[] => {
    const flattened: AISubtaskSuggestion[] = [];

    suggestions.forEach((suggestion, parentIndex) => {
      // Add parent subtask (without "Atomic:" prefix)
      flattened.push({
        ...suggestion,
        order: parentIndex,
        // Remove children from parent (they'll be added separately)
        children: undefined,
      });

      // Add children as atomic constellation nodes
      if (suggestion.children && suggestion.children.length > 0) {
        suggestion.children.forEach((child: any, childIndex: number) => {
          flattened.push({
            title: `Atomic: ${child.title}`,  // ✅ "Atomic:" prefix
            estimatedMinutes: child.estimatedMinutes || 5,
            stepType: child.stepType || 'mental',
            order: flattened.length,
            // Link back to parent via parentSubtaskId
            // (This will be set properly when creating subtask with IDs)
            parentSubtaskId: suggestion.title, // Temporary - will be replaced with actual ID
            isAtomic: true, // Flag for styling
            depth: (child.depth || 1),
          });
        });
      }
    });

    return flattened;
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // ✅ Flatten children into atomic constellation nodes
      const flattenedSubtasks = flattenChildrenToAtomicTasks(suggestions);

      console.log(`📊 [AIBreakdownModal] Flattened ${suggestions.length} suggestions into ${flattenedSubtasks.length} total subtasks (including atomic)`);

      // Pass full suggestion objects (with estimatedMinutes and stepType)
      await addSubtasks(taskId, flattenedSubtasks);

      // Get updated task with new subtasks
      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        const { enterFocusMode } = useCoachStore.getState();
        enterFocusMode(taskId, updatedTask.subtasks);
      }

      onClose();
    } catch (error) {
      toast.error('Failed to add subtasks. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleEditSuggestion = (index: number, newTitle: string) => {
    const updated = [...suggestions];
    updated[index] = { ...updated[index], title: newTitle };
    setSuggestions(updated);
  };

  const handleRemoveSuggestion = (index: number) => {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800">AI Task Breakdown</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {showOptimisticSkeleton || (isStreaming && suggestions.length === 0) ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 animate-pulse">
                {useStreaming ? '✨ AI is analyzing your task...' : 'Generating AI subtasks...'}
              </p>
              <BreakdownSkeleton />
            </div>
          ) : isStreaming && suggestions.length > 0 ? (
            // PROGRESSIVE RENDERING: Show subtasks as they arrive
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-purple-600 border-r-transparent"></div>
                  Generating more subtasks...
                </span>
              </p>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 bg-gradient-to-r from-purple-50 to-transparent p-3 rounded-lg animate-in fade-in slide-in-from-left-2 duration-300"
                  >
                    <span className="text-purple-400 mt-1">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-gray-900">{suggestion.title}</p>
                      {suggestion.estimatedMinutes && (
                        <p className="text-xs text-gray-500 mt-1">{suggestion.estimatedMinutes} min</p>
                      )}
                    </div>
                  </div>
                ))}
                {/* Show skeleton for remaining expected subtasks */}
                {suggestions.length < 3 &&
                  Array.from({ length: 3 - suggestions.length }).map((_, i) => (
                    <SubtaskSkeleton key={`skeleton-${i}`} />
                  ))}
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">
                No suggestions generated. Try again?
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                Generate AI Breakdown
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Review and edit the AI-generated subtasks below:
              </p>

              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-400 mt-1">{index + 1}.</span>
                    <input
                      type="text"
                      value={suggestion.title}
                      onChange={(e) => handleEditSuggestion(index, e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-gray-900"
                    />
                    <button
                      onClick={() => handleRemoveSuggestion(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAccept}
                  disabled={isAccepting || suggestions.length === 0}
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isAccepting ? 'Adding...' : `Accept (${suggestions.length} subtasks)`}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                >
                  🔄 Regenerate
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
