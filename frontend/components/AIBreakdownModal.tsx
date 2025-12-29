'use client';

import { useState, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { AISubtaskSuggestion } from '@/types';

interface AIBreakdownModalProps {
  taskId: string;
  onClose: () => void;
}

export function AIBreakdownModal({ taskId, onClose }: AIBreakdownModalProps) {
  const { generateAIBreakdown, addSubtasks, tasks } = useTaskStore();
  const [suggestions, setSuggestions] = useState<AISubtaskSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Auto-generate on mount
  useEffect(() => {
    const autoGenerate = async () => {
      setIsGenerating(true);
      try {
        const result = await generateAIBreakdown(taskId);
        setSuggestions(result.suggestions || []);
      } catch (error) {
        console.error('AI breakdown error:', error);
      } finally {
        setIsGenerating(false);
      }
    };
    autoGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateAIBreakdown(taskId);
      // Completely replace suggestions (prevent duplicates)
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('AI breakdown error:', error);
      alert('Failed to generate AI breakdown');
      setSuggestions([]); // Clear on error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // Pass full suggestion objects (with estimatedMinutes and stepType)
      await addSubtasks(taskId, suggestions);

      // Get updated task with new subtasks
      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        const { enterFocusMode } = useCoachStore.getState();
        enterFocusMode(taskId, updatedTask.subtasks);
      }

      onClose();
    } catch (error) {
      alert('Failed to add subtasks');
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

          {isGenerating && suggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
                <p className="text-lg text-gray-700 font-medium">Generating AI subtasks...</p>
              </div>
              <p className="text-sm text-gray-500">This may take a few seconds</p>
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
                ✨ Generate AI Breakdown
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
