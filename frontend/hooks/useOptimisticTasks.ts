'use client';

import { useOptimistic } from 'react';
import { Task, Subtask } from '@/types';

/**
 * Optimistic UI for tasks - provides instant feedback for AI operations
 * Uses React 19's useOptimistic for perceived latency <1 second
 */
export function useOptimisticTasks(serverTasks: Task[]) {
  // Optimistic task creation
  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    serverTasks,
    (state, newTask: Task & { _isPending?: boolean }) => {
      // Instantly add new task to UI
      return [...state, { ...newTask, _isPending: true }];
    }
  );

  // Optimistic task update
  const [, updateOptimisticTask] = useOptimistic(
    optimisticTasks,
    (state, { taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      return state.map((task) =>
        task.id === taskId ? { ...task, ...updates, _isPending: true } : task
      );
    }
  );

  // Optimistic subtask addition
  const [, addOptimisticSubtasks] = useOptimistic(
    optimisticTasks,
    (
      state,
      {
        taskId,
        subtasks,
      }: {
        taskId: string;
        subtasks: (Subtask & { _isPending?: boolean })[];
      }
    ) => {
      return state.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: [
                ...task.subtasks,
                ...subtasks.map((st) => ({ ...st, _isPending: true })),
              ],
            }
          : task
      );
    }
  );

  // Optimistic AI breakdown (replace all subtasks)
  const [, setOptimisticBreakdown] = useOptimistic(
    optimisticTasks,
    (
      state,
      {
        taskId,
        subtasks,
      }: {
        taskId: string;
        subtasks: (Subtask & { _isPending?: boolean })[];
      }
    ) => {
      return state.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: subtasks.map((st) => ({ ...st, _isPending: true })),
            }
          : task
      );
    }
  );

  // Optimistic deep dive (add children to subtask)
  const [, addOptimisticChildren] = useOptimistic(
    optimisticTasks,
    (
      state,
      {
        taskId,
        subtaskId,
        children,
      }: {
        taskId: string;
        subtaskId: string;
        children: (Subtask & { _isPending?: boolean })[];
      }
    ) => {
      return state.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((st) =>
                st.id === subtaskId
                  ? {
                      ...st,
                      children: children.map((child) => ({ ...child, _isPending: true })),
                    }
                  : st
              ),
            }
          : task
      );
    }
  );

  return {
    optimisticTasks,
    addOptimisticTask,
    updateOptimisticTask,
    addOptimisticSubtasks,
    setOptimisticBreakdown,
    addOptimisticChildren,
  };
}

/**
 * Generate placeholder subtasks for optimistic UI
 * Shows "Analyzing..." immediately while AI generates real breakdown
 */
export function createPlaceholderSubtasks(count: number = 3): Subtask[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `temp-${Date.now()}-${i}`,
    title: '분석 중...',
    isCompleted: false,
    isArchived: false,
    parentTaskId: '',
    order: i,
    estimatedMinutes: 0,
    status: 'draft' as const,
    _isPending: true,
    depth: 0,
    children: [],
  }));
}

/**
 * Generate placeholder children for deep dive optimistic UI
 */
export function createPlaceholderChildren(count: number = 3): Subtask[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `temp-child-${Date.now()}-${i}`,
    title: '세부 분석 중...',
    isCompleted: false,
    isArchived: false,
    parentTaskId: '',
    parentSubtaskId: '',
    order: i,
    estimatedMinutes: 0,
    status: 'draft' as const,
    _isPending: true,
    depth: 1,
    children: [],
  }));
}
