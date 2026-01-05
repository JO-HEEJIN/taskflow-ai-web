'use client';

import { Task, NodeContext } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useToast } from '@/contexts/ToastContext';
import { unlockTimerCompletionAudio } from '@/lib/sounds';
import { createPlaceholderChildren } from '@/hooks/useOptimisticTasks';
import { ChildSubtaskSkeleton } from './SubtaskSkeleton';
import { ProgressBar } from './ProgressBar';
import { AIBreakdownModal } from './AIBreakdownModal';
import { NoSubtasksEmptyState } from './onboarding/NoSubtasksEmptyState';
import { X, GripVertical, Link2, Unlink, Archive, Map, List as ListIcon, Sparkles, ChevronDown, ChevronRight, ChevronUp, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect, useTransition } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

// Lazy load TaskMindMap for code splitting
const TaskMindMap = dynamic(() => import('./graph/TaskMindMap').then(mod => ({ default: mod.TaskMindMap })), {
  loading: () => <div className="w-full h-96 flex items-center justify-center text-gray-400">Loading mind map...</div>,
  ssr: false,
});

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  initialContext?: NodeContext; // Context of what was clicked (task/subtask/atomic)
}

export function TaskDetail({ taskId, onClose, initialContext }: TaskDetailProps) {
  const { tasks, toggleSubtask, addSubtasks, deleteSubtask, reorderSubtasks, archiveSubtask, createLinkedTask, approveBreakdown, deepDiveBreakdown } = useTaskStore();
  const toast = useToast();
  const [showAIModal, setShowAIModal] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [hoveredSubtaskId, setHoveredSubtaskId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState<string | null>(null);
  const [showMindMap, setShowMindMap] = useState(false);
  const [creatingLinkedTask, setCreatingLinkedTask] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [breakingDownSubtaskId, setBreakingDownSubtaskId] = useState<string | null>(null);
  const [showOptimisticChildren, setShowOptimisticChildren] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isGuest = typeof window !== 'undefined' && !localStorage.getItem('userId');

  // Get live task from store (ensures real-time updates)
  const task = tasks.find((t) => t.id === taskId);

  // Cleanup hover timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  if (!task) {
    return null; // Task not found or deleted
  }

  // Separate active and archived subtasks
  const allActiveSubtasks = task.subtasks.filter((st) => !st.isArchived);
  const archivedSubtasks = task.subtasks.filter((st) => st.isArchived);

  // Filter subtasks based on click context (Orion's Belt Perspective)
  const getVisibleSubtasks = (): typeof allActiveSubtasks => {
    if (!initialContext) return allActiveSubtasks; // Show all (backward compatible)

    switch (initialContext.type) {
      case 'task':
        // Clicked task itself → Show full hierarchy
        return allActiveSubtasks;

      case 'subtask':
        const targetSubtask = allActiveSubtasks.find((st) => st.id === initialContext.subtaskId);
        if (!targetSubtask) return [];

        // Show clicked subtask + its children (if any)
        const childrenOfTarget = allActiveSubtasks.filter(
          (st) => st.parentSubtaskId === targetSubtask.id
        );
        return [targetSubtask, ...childrenOfTarget];

      case 'atomic':
        // Clicked atomic → Show only that atomic
        const atomic = allActiveSubtasks.find((st) => st.id === initialContext.atomicId);
        if (!atomic) return [];
        return [atomic];

      default:
        return allActiveSubtasks;
    }
  };

  const activeSubtasks = getVisibleSubtasks();

  const handleToggleSubtask = async (subtaskId: string) => {
    await toggleSubtask(task.id, subtaskId);
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    setIsAddingSubtask(true);
    try {
      await addSubtasks(task.id, [newSubtaskTitle.trim()]);
      setNewSubtaskTitle('');
    } catch (error) {
      console.error('Failed to add subtask:', error);
      toast.error('Failed to add subtask. Please try again.');
    } finally{
      setIsAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Delete this subtask?')) return;
    try {
      await deleteSubtask(task.id, subtaskId);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      toast.error('Failed to delete subtask. Please try again.');
    }
  };

  const handleDragStart = (subtaskId: string) => {
    setDraggedSubtaskId(subtaskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = async (targetSubtaskId: string) => {
    if (!draggedSubtaskId || draggedSubtaskId === targetSubtaskId) {
      setDraggedSubtaskId(null);
      return;
    }

    // Only reorder active subtasks
    const sortedActive = [...activeSubtasks].sort((a, b) => a.order - b.order);
    const draggedIndex = sortedActive.findIndex((st) => st.id === draggedSubtaskId);
    const targetIndex = sortedActive.findIndex((st) => st.id === targetSubtaskId);

    console.log('🔍 Drag & Drop Debug:', {
      draggedSubtaskId,
      targetSubtaskId,
      draggedIndex,
      targetIndex,
      sortedActive: sortedActive.map(st => ({ id: st.id, title: st.title, order: st.order }))
    });

    if (draggedIndex === -1 || targetIndex === -1) {
      console.error('❌ Invalid drag indices');
      setDraggedSubtaskId(null);
      return;
    }

    // Reorder active subtasks
    const reordered = [...sortedActive];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Create new order mapping for ALL subtasks (active + archived)
    const subtaskOrders = task.subtasks.map((st) => {
      // If it's in the reordered active list, use new order
      const reorderedIndex = reordered.findIndex((r) => r.id === st.id);
      if (reorderedIndex !== -1) {
        return { id: st.id, order: reorderedIndex };
      }
      // Keep archived subtasks' original order
      return { id: st.id, order: st.order };
    });

    console.log('📤 Sending reorder request:', subtaskOrders);

    try {
      await reorderSubtasks(task.id, subtaskOrders);
      console.log('✅ Reorder successful');
    } catch (error) {
      console.error('❌ Failed to reorder subtasks:', error);
    }

    setDraggedSubtaskId(null);
  };

  const handleArchiveSubtask = async (subtaskId: string, archived: boolean) => {
    try {
      await archiveSubtask(task.id, subtaskId, archived);
    } catch (error) {
      console.error('Failed to archive subtask:', error);
      toast.error('Failed to archive subtask. Please try again.');
    }
  };

  const handleSubtaskMouseEnter = (subtaskId: string) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    // Don't show prompt if dragging or subtask already linked
    if (draggedSubtaskId || subtask?.linkedTaskId) return;

    setHoveredSubtaskId(subtaskId);
    hoverTimerRef.current = setTimeout(() => {
      setShowPrompt(subtaskId);
    }, 2000); // 2 second delay
  };

  const handleSubtaskMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    setHoveredSubtaskId(null);
    setShowPrompt(null); // Hide immediately when mouse leaves
  };

  const handleSubtaskTouchStart = (subtaskId: string) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask?.linkedTaskId) return;

    longPressTimerRef.current = setTimeout(() => {
      setShowPrompt(subtaskId);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500); // 500ms for long press
  };

  const handleSubtaskTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleCreateLinkedTask = async (subtaskId: string) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    setShowPrompt(null);
    setCreatingLinkedTask(true);
    try {
      const newTask = await createLinkedTask(task.id, subtaskId, subtask.title);
      // Show success with task title
      toast.success(`Created new task: "${newTask.title}"`, {
        duration: 6000,
      });
    } catch (error) {
      console.error('Failed to create linked task:', error);
      toast.error('Failed to create linked task. Please try again.');
    } finally {
      setCreatingLinkedTask(false);
    }
  };

  const handleClearBrokenLink = async (subtaskId: string) => {
    if (!confirm('Clear this broken link?')) return;

    try {
      // Update the subtask to remove linkedTaskId
      const updatedSubtasks = task.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, linkedTaskId: undefined } : st
      );

      await useTaskStore.getState().updateTask(task.id, { subtasks: updatedSubtasks });
    } catch (error) {
      console.error('Failed to clear broken link:', error);
      toast.error('Failed to clear broken link. Please try again.');
    }
  };

  const handleMoveSubtask = async (subtaskId: string, direction: 'up' | 'down') => {
    const sortedActive = [...activeSubtasks].sort((a, b) => a.order - b.order);
    const currentIndex = sortedActive.findIndex((st) => st.id === subtaskId);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedActive.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reordered = [...sortedActive];
    const [removed] = reordered.splice(currentIndex, 1);
    reordered.splice(newIndex, 0, removed);

    const subtaskOrders = task.subtasks.map((st) => {
      const reorderedIndex = reordered.findIndex((r) => r.id === st.id);
      if (reorderedIndex !== -1) {
        return { id: st.id, order: reorderedIndex };
      }
      return { id: st.id, order: st.order };
    });

    try {
      await reorderSubtasks(task.id, subtaskOrders);
    } catch (error) {
      console.error('Failed to move subtask:', error);
    }
  };

  const handleEnterFocusMode = () => {
    // Unlock timer-complete.mp3 for iOS
    unlockTimerCompletionAudio();

    const { enterFocusMode } = useCoachStore.getState();
    // Pass context to focus mode (Phase 5 will update coach store to accept this)
    enterFocusMode(task.id, task.subtasks, initialContext);
    onClose();
  };

  const handleApproveBreakdown = async () => {
    setIsApproving(true);
    try {
      await approveBreakdown(task.id);
      toast.success('AI breakdown approved! Subtasks are now active.');
    } catch (error) {
      console.error('Failed to approve breakdown:', error);
      toast.error('Failed to approve breakdown. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeepDive = async (subtaskId: string) => {
    // Show optimistic skeleton children immediately (<1s perceived latency)
    setShowOptimisticChildren(subtaskId);
    setBreakingDownSubtaskId(subtaskId);

    startTransition(async () => {
      try {
        await deepDiveBreakdown(task.id, subtaskId);
        toast.success('Subtask broken down into smaller steps!');
      } catch (error) {
        console.error('Failed to break down subtask:', error);
        toast.error('Failed to break down subtask. Please try again.');
      } finally {
        setBreakingDownSubtaskId(null);
        setShowOptimisticChildren(null);
      }
    });
  };

  // Check if task has incomplete subtasks for Focus Mode
  const hasIncompleteSubtasks = activeSubtasks.some(st => !st.isCompleted);

  // Check if task has draft subtasks that need approval
  const hasDraftSubtasks = activeSubtasks.some(st => st.status === 'draft');

  return (
    <>
      {/* Modal backdrop - click/touch outside to close */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        onClick={onClose}
        onTouchEnd={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        {/* Modal content - prevent close when clicking inside */}
        <div
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{task.title}</h2>
                {task.description && (
                  <div className="prose prose-sm max-w-none text-gray-600">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                      {task.description}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl ml-4 p-3 min-w-[48px] min-h-[48px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Section */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-2xl font-bold text-primary-600">{task.progress}%</span>
              </div>
              <ProgressBar progress={task.progress} className="h-3" />
              <div className="mt-2 text-xs text-gray-500">
                {task.subtasks.filter((st) => st.isCompleted).length} of {task.subtasks.length} subtasks completed
              </div>
            </div>

            {/* Active Subtasks */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Subtasks</h3>
                <div className="flex gap-2">
                  {activeSubtasks.length > 0 && (
                    <>
                      {hasDraftSubtasks && (
                        <button
                          onClick={handleApproveBreakdown}
                          disabled={isApproving}
                          className="text-sm px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApproving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Approving...</span>
                            </>
                          ) : (
                            <>
                              <span>✅</span>
                              <span>Approve AI Plan</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setShowMindMap(!showMindMap)}
                        className="text-sm px-3 py-1 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1"
                      >
                        {showMindMap ? (
                          <>
                            <ListIcon className="w-4 h-4" />
                            <span>List View</span>
                          </>
                        ) : (
                          <>
                            <Map className="w-4 h-4" />
                            <span>Mind Map</span>
                          </>
                        )}
                      </button>
                      {hasIncompleteSubtasks && !hasDraftSubtasks && (
                        <button
                          onClick={handleEnterFocusMode}
                          className="text-sm px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 font-medium shadow-md"
                        >
                          <span>🎯</span>
                          <span>Focus Mode</span>
                        </button>
                      )}
                    </>
                  )}
                  {activeSubtasks.length === 0 && (
                    <button
                      onClick={() => setShowAIModal(true)}
                      className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      AI Breakdown
                    </button>
                  )}
                </div>
              </div>

              {activeSubtasks.length === 0 ? (
                <NoSubtasksEmptyState onAIBreakdown={() => setShowAIModal(true)} />
              ) : showMindMap ? (
                <TaskMindMap taskId={task.id} />
              ) : (
                <div className="space-y-2">
                  {activeSubtasks
                    .sort((a, b) => a.order - b.order)
                    .map((subtask, index) => (
                      <div
                        key={subtask.id}
                        draggable
                        onDragStart={() => handleDragStart(subtask.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(subtask.id)}
                        onMouseEnter={() => handleSubtaskMouseEnter(subtask.id)}
                        onMouseLeave={handleSubtaskMouseLeave}
                        onTouchStart={() => handleSubtaskTouchStart(subtask.id)}
                        onTouchEnd={handleSubtaskTouchEnd}
                        className={`relative flex items-start gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors group ${
                          draggedSubtaskId === subtask.id ? 'opacity-50' : ''
                        } ${
                          subtask.title.startsWith('Atomic: ')
                            ? 'ml-6 bg-purple-50 border-l-4 border-purple-400'
                            : 'bg-gray-50'
                        }`}
                      >
                        {/* Desktop: Drag handle */}
                        <GripVertical className="hidden md:block text-gray-400 cursor-grab active:cursor-grabbing mt-1 w-5 h-5" />

                        {/* Mobile: Up/Down buttons */}
                        <div className="flex flex-col gap-1 md:hidden">
                          <button
                            onClick={() => handleMoveSubtask(subtask.id, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-3 text-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveSubtask(subtask.id, 'down')}
                            disabled={index === activeSubtasks.length - 1}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-3 text-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="checkbox"
                          checked={subtask.isCompleted}
                          onChange={() => handleToggleSubtask(subtask.id)}
                          className="mt-1 h-6 w-6 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0"
                        />
                        <span
                          className={`flex-1 flex items-center gap-2 ${
                            subtask.isCompleted
                              ? 'line-through text-gray-400'
                              : 'text-gray-700'
                          }`}
                        >
                          {/* ✅ CONSTELLATION: Atomic tasks show atom icon */}
                          {subtask.title.startsWith('Atomic: ') && (
                            <span className="text-purple-500" title="Atomic constellation node">⚛️</span>
                          )}
                          <span className={subtask.title.startsWith('Atomic: ') ? 'text-purple-700' : ''}>
                            {subtask.title}
                          </span>
                          {/* Show parent relationship for atomic tasks */}
                          {subtask.parentSubtaskId && (() => {
                            const parentSubtask = activeSubtasks.find(s => s.id === subtask.parentSubtaskId);
                            if (parentSubtask) {
                              return (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium" title={`Child of: ${parentSubtask.title}`}>
                                  ↳ {parentSubtask.title.substring(0, 20)}{parentSubtask.title.length > 20 ? '...' : ''}
                                </span>
                              );
                            }
                          })()}
                          {subtask.status === 'draft' && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                              Draft
                            </span>
                          )}
                          {/* ✅ ALWAYS show estimated time */}
                          {subtask.estimatedMinutes && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              subtask.isComposite && !subtask.children?.length
                                ? 'bg-orange-100 text-orange-800'  // Composite: orange (needs breakdown)
                                : 'bg-gray-100 text-gray-600'      // Atomic: gray (ready to do)
                            }`}>
                              {subtask.estimatedMinutes}min
                            </span>
                          )}
                          {subtask.linkedTaskId && (() => {
                            const linkedTask = tasks.find(t => t.id === subtask.linkedTaskId);
                            if (linkedTask) {
                              return (
                                <span className="text-xs text-blue-600" title={`Linked to: ${linkedTask.title}`}>
                                  <Link2 className="w-3.5 h-3.5 inline" />
                                </span>
                              );
                            } else {
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearBrokenLink(subtask.id);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800"
                                  title="Broken link - click to clear"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              );
                            }
                          })()}
                        </span>
                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleArchiveSubtask(subtask.id, true)}
                            className="text-gray-400 hover:text-blue-600 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Archive subtask"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="text-gray-400 hover:text-red-600 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Delete subtask"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Hover Prompt */}
                        {showPrompt === subtask.id && !subtask.linkedTaskId && (
                          <div className="absolute right-2 top-2 z-[100] bg-primary-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 animate-fadeIn">
                            <button
                              onClick={() => handleCreateLinkedTask(subtask.id)}
                              disabled={creatingLinkedTask}
                              className="hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {creatingLinkedTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              <span>{creatingLinkedTask ? 'Creating...' : 'New task from this?'}</span>
                            </button>
                            {!creatingLinkedTask && (
                              <button
                                onClick={() => setShowPrompt(null)}
                                className="text-white/80 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}

                      {/* Break Down Further Button */}
                      {subtask.isComposite && !subtask.children?.length && (
                        <div className="ml-14 mt-2">
                          <button
                            onClick={() => handleDeepDive(subtask.id)}
                            disabled={breakingDownSubtaskId === subtask.id}
                            className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                          >
                            {breakingDownSubtaskId === subtask.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Breaking down...</span>
                              </>
                            ) : (
                              <>
                                <span>🔍</span>
                                <span>Break Down Further</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Optimistic Skeleton for Deep Dive */}
                      {showOptimisticChildren === subtask.id && (
                        <div className="ml-14 mt-2 space-y-2">
                          <ChildSubtaskSkeleton />
                          <ChildSubtaskSkeleton />
                          <ChildSubtaskSkeleton />
                        </div>
                      )}

                      {/* ✅ CONSTELLATION: Children are flattened into main subtasks array with "Atomic: " prefix */}
                      {/* No nested rendering - atomic tasks appear as constellation nodes */}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Subtask Input */}
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="Add a new subtask..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  disabled={isAddingSubtask}
                />
                <button
                  onClick={handleAddSubtask}
                  disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingSubtask ? '...' : '+ Add'}
                </button>
              </div>
            </div>

            {/* Archived Subtasks */}
            {archivedSubtasks.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"
                >
                  {showArchived ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>Archived ({archivedSubtasks.length})</span>
                </button>
                {showArchived && (
                  <div className="space-y-2 pl-4">
                    {archivedSubtasks
                      .sort((a, b) => a.order - b.order)
                      .map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg opacity-60"
                        >
                          <Archive className="w-4 h-4 text-gray-400 mt-1" />
                          <span className="flex-1 text-gray-500 line-through">
                            {subtask.title}
                          </span>
                          <button
                            onClick={() => handleArchiveSubtask(subtask.id, false)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                            title="Unarchive"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete permanently"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Breakdown Button (if has subtasks) */}
            {activeSubtasks.length > 0 && (
              <button
                onClick={() => setShowAIModal(true)}
                className="w-full text-sm text-primary-600 border border-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                Add More with AI
              </button>
            )}

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Breakdown Modal */}
      {showAIModal && (
        <AIBreakdownModal
          taskId={task.id}
          onClose={() => {
            setShowAIModal(false);
            onClose(); // Also close TaskDetail modal when entering Focus Mode
          }}
        />
      )}
    </>
  );
}
