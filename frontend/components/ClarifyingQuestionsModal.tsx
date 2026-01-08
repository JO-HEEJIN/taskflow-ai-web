'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Loader2, X, Send, Sparkles } from 'lucide-react';

interface ClarifyingQuestionsModalProps {
  taskTitle: string;
  taskDescription?: string;
  onComplete: (answers: Record<string, string>) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function ClarifyingQuestionsModal({
  taskTitle,
  taskDescription,
  onComplete,
  onSkip,
  onClose,
}: ClarifyingQuestionsModalProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch clarifying questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await api.getClarifyingQuestions(taskTitle, taskDescription);
        setQuestions(result.questions || []);

        // Initialize answers object
        const initialAnswers: Record<string, string> = {};
        result.questions?.forEach((q, i) => {
          initialAnswers[`q${i}`] = '';
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        console.error('Failed to fetch clarifying questions:', err);
        setError(err.message || 'Failed to generate questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [taskTitle, taskDescription]);

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [`q${questionIndex}`]: value,
    }));
  };

  const handleSubmit = () => {
    // Create enriched context from answers
    const enrichedAnswers: Record<string, string> = {};
    questions.forEach((q, i) => {
      if (answers[`q${i}`]?.trim()) {
        enrichedAnswers[q] = answers[`q${i}`].trim();
      }
    });

    onComplete(enrichedAnswers);
  };

  const hasAnyAnswer = Object.values(answers).some((a) => a.trim());
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[`q${i}`]?.trim());

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Quick Questions</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/80 mt-1">
            Help AI understand your task better
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Task Title Display */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Your Task</span>
            <p className="font-medium text-gray-800 mt-1">{taskTitle}</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
              <p className="text-gray-500 text-sm">Generating questions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={onSkip}
                className="text-sm text-purple-600 hover:underline"
              >
                Skip and continue with breakdown
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No questions needed for this task!</p>
              <button
                onClick={onSkip}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Continue to Breakdown
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {index + 1}. {question}
                  </label>
                  <textarea
                    value={answers[`q${index}`] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    placeholder="Your answer..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && questions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={!hasAnyAnswer}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{allAnswered ? 'Continue' : 'Continue with answers'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              More context = better breakdown
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
