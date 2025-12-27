'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

interface KanbanSidePanelProps {
  taskId: string;
  onClose: () => void;
}

export function KanbanSidePanel({ taskId, onClose }: KanbanSidePanelProps) {
  const { tasks, updateTask } = useTaskStore();
  const task = tasks.find((t) => t.id === taskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  // Image upload function
  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);
      const response = await api.uploadImage(file);
      const imageUrl = response.imageUrl;

      // Insert markdown image syntax at cursor position
      const imageMarkdown = `\n![${file.name}](${imageUrl})\n`;
      setDescription((prev) => prev + imageMarkdown);
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Add paste event listener to catch images in MDEditor
  useEffect(() => {
    if (!isEditingDescription) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            uploadImage(file);
          }
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [isEditingDescription, uploadImage]);

  if (!task) return null;

  const handleTitleSave = async () => {
    if (title.trim() && title !== task.title) {
      await updateTask(task.id, { title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = async () => {
    if (description !== task.description) {
      await updateTask(task.id, { description: description || undefined });
    }
    setIsEditingDescription(false);
  };

  // Handle drag and drop
  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await uploadImage(file);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Handle file input (click to upload)
  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await uploadImage(file);
      }
    }

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-[9998]"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[9999] flex flex-col animate-slideInRight"
        style={{
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
            <span className="text-sm text-gray-500">
              {task.status === 'pending' ? 'Tasks' : task.status === 'in_progress' ? 'In Progress' : 'Completed'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Title */}
          <div className="mb-6">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setTitle(task.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full text-4xl font-bold text-gray-900 border-none outline-none focus:ring-0 px-0"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-4xl font-bold text-gray-900 cursor-text hover:bg-gray-50 px-2 py-1 -mx-2 rounded"
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Description
            </h2>
            {isEditingDescription ? (
              <div>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="markdown-editor-wrapper rounded-lg overflow-hidden"
                  style={{
                    border: '1px solid #d1d5db',
                  }}
                >
                  <MDEditor
                    value={description}
                    onChange={(val) => setDescription(val || '')}
                    preview="edit"
                    height={300}
                    textareaProps={{
                      placeholder: 'Add a description... Drag & drop images, paste (Ctrl+V), or click the image button below.',
                      disabled: uploadingImage,
                    }}
                    data-color-mode="light"
                  />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {uploadingImage && (
                    <p className="text-sm text-blue-600">Uploading image...</p>
                  )}
                  <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <span>📎</span>
                    <span>Click to upload images</span>
                  </label>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleDescriptionSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setDescription(task.description || '');
                      setIsEditingDescription(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                className="prose prose-sm max-w-none cursor-text hover:bg-gray-50 px-4 py-3 rounded-lg min-h-[100px]"
              >
                {description ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {description}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">
                    Click to add a description... (Markdown supported)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Subtasks ({task.subtasks.filter((st) => st.isCompleted).length}/{task.subtasks.length})
            </h2>
            <div className="space-y-2">
              {task.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={subtask.isCompleted}
                    onChange={() => {
                      const updatedSubtasks = task.subtasks.map((st) =>
                        st.id === subtask.id
                          ? { ...st, isCompleted: !st.isCompleted }
                          : st
                      );
                      updateTask(task.id, { subtasks: updatedSubtasks });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`flex-1 ${subtask.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Progress
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {task.progress}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
