'use client';

import { useState, useCallback } from 'react';
import { AISubtaskSuggestion } from '@/types';

interface UseStreamingBreakdownResult {
  subtasks: AISubtaskSuggestion[];
  isStreaming: boolean;
  error: string | null;
  startBreakdown: (taskTitle: string, taskDescription?: string) => void;
  stopBreakdown: () => void;
}

/**
 * Hook for consuming Server-Sent Events (SSE) from AI breakdown streaming endpoint
 * Progressive rendering: First subtask appears in ~1-2s instead of waiting 4s for all 3
 */
export function useStreamingBreakdown(): UseStreamingBreakdownResult {
  const [subtasks, setSubtasks] = useState<AISubtaskSuggestion[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const stopBreakdown = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsStreaming(false);
  }, [eventSource]);

  const startBreakdown = useCallback((taskTitle: string, taskDescription?: string) => {
    // Reset state
    setSubtasks([]);
    setError(null);
    setIsStreaming(true);

    // Build query params
    const params = new URLSearchParams({ taskTitle });
    if (taskDescription) {
      params.append('taskDescription', taskDescription);
    }

    // Use backend URL for EventSource (cannot be proxied by Next.js)
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = `${API_BASE_URL}/api/ai/breakdown-stream?${params.toString()}`;
    console.log('🔄 [Streaming] Starting SSE connection to:', url);
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'subtask') {
          // Progressive update: Add each subtask as it arrives
          console.log('✨ [Streaming] Received subtask:', data.subtask.title);
          setSubtasks((prev) => [...prev, data.subtask]);
        } else if (data.type === 'complete') {
          // Final result: Replace with complete parsed subtasks
          console.log('✅ [Streaming] Complete! Total subtasks:', data.subtasks?.length);
          setSubtasks(data.subtasks || []);
          setIsStreaming(false);
          es.close();
        } else if (data.type === 'error') {
          console.error('❌ [Streaming] Error:', data.error);
          setError(data.error || 'Streaming failed');
          setIsStreaming(false);
          es.close();
        } else if (data.type === 'chunk') {
          // Debug: Show chunk progress
          process.stdout?.write?.('.') || console.log('.');
        }
      } catch (err) {
        console.error('❌ [Streaming] Failed to parse SSE event:', err);
      }
    };

    es.onerror = (err) => {
      console.error('EventSource error:', err);
      setError('Connection to AI service lost');
      setIsStreaming(false);
      es.close();
    };

    setEventSource(es);

    // Cleanup on unmount
    return () => {
      es.close();
    };
  }, []);

  return {
    subtasks,
    isStreaming,
    error,
    startBreakdown,
    stopBreakdown,
  };
}
