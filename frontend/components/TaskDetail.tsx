'use client';

import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { ProgressBar } from './ProgressBar';
import { AIBreakdownModal } from './AIBreakdownModal';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy load TaskMindMap for code splitting
const TaskMindMap = dynamic(() => import('./graph/TaskMindMap').then(mod => ({ default: mod.TaskMindMap })), {
  loading: () => <div className="w-full h-96 flex items-center justify-center text-gray-400">Loading mind map...</div>,
  ssr: false,
});

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, toggleSubtask, addSubtasks, deleteSubtask, reorderSubtasks, archiveSubtask, createLinkedTask } = useTaskStore();
  const [showAIModal, setShowAIModal] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [hoveredSubtaskId, setHoveredSubtaskId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState<string | null>(null);
  const [showMindMap, setShowMindMap] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get live task from store (ensures real-time updates)
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return null; // Task not found or deleted
  }

  // Separate active and archived subtasks
  const activeSubtasks = task.subtasks.filter((st) => !st.isArchived);
  const archivedSubtasks = task.subtasks.filter((st) => st.isArchived);

  // Cleanup hover timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

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
      alert('Failed to add subtask');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Delete this subtask?')) return;
    try {
      await deleteSubtask(task.id, subtaskId);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      alert('Failed to delete subtask');
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
      alert('Failed to archive subtask');
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
    // Keep prompt visible if already shown (user can click)
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
    try {
      const newTask = await createLinkedTask(task.id, subtaskId, subtask.title);
      // Optionally, could open the new task in a modal here
      alert(`✅ Created linked task: "${newTask.title}"`);
    } catch (error) {
      console.error('Failed to create linked task:', error);
      alert('Failed to create linked task');
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

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{task.title}</h2>
                {task.description && (
                  <p className="text-gray-600">{task.description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl ml-4"
              >
                ✕
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
                    <button
                      onClick={() => setShowMindMap(!showMindMap)}
                      className="text-sm px-3 py-1 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1"
                    >
                      {showMindMap ? (
                        <>
                          <span>📋</span>
                          <span>List View</span>
                        </>
                      ) : (
                        <>
                          <span>🗺️</span>
                          <span>Mind Map</span>
                        </>
                      )}
                    </button>
                  )}
                  {activeSubtasks.length === 0 && (
                    <button
                      onClick={() => setShowAIModal(true)}
                      className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      ✨ AI Breakdown
                    </button>
                  )}
                </div>
              </div>

              {activeSubtasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No subtasks yet</p>
                  <p className="text-sm mt-1">Use AI to break down this task!</p>
                </div>
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
                        className={`relative flex items-start gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group ${
                          draggedSubtaskId === subtask.id ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Desktop: Drag handle */}
                        <span className="hidden md:block text-gray-400 cursor-grab active:cursor-grabbing mt-1">☰</span>

                        {/* Mobile: Up/Down buttons */}
                        <div className="flex flex-col gap-1 md:hidden">
                          <button
                            onClick={() => handleMoveSubtask(subtask.id, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-1 text-xs"
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveSubtask(subtask.id, 'down')}
                            disabled={index === activeSubtasks.length - 1}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-1 text-xs"
                            title="Move down"
                          >
                            ▼
                          </button>
                        </div>

                        <input
                          type="checkbox"
                          checked={subtask.isCompleted}
                          onChange={() => handleToggleSubtask(subtask.id)}
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0"
                        />
                        <span
                          className={`flex-1 flex items-center gap-2 ${
                            subtask.isCompleted
                              ? 'line-through text-gray-400'
                              : 'text-gray-700'
                          }`}
                        >
                          <span>{subtask.title}</span>
                          {subtask.linkedTaskId && (
                            <span className="text-xs text-blue-600" title="Linked to another task">
                              🔗
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleArchiveSubtask(subtask.id, true)}
                            className="text-gray-400 hover:text-blue-600 p-1"
                            title="Archive subtask"
                          >
                            📦
                          </button>
                          <button
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Delete subtask"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Hover Prompt */}
                        {showPrompt === subtask.id && !subtask.linkedTaskId && (
                          <div className="absolute right-2 top-2 z-10 bg-primary-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 animate-fadeIn">
                            <button
                              onClick={() => handleCreateLinkedTask(subtask.id)}
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>✨</span>
                              <span>New task from this?</span>
                            </button>
                            <button
                              onClick={() => setShowPrompt(null)}
                              className="text-white/80 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                        )}
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
                  <span>{showArchived ? '▼' : '▶'}</span>
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
                          <span className="text-gray-400">📦</span>
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
                            ✕
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
                ✨ Add More with AI
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
          onClose={() => setShowAIModal(false)}
        />
      )}
    </>
  );
}
