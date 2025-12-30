'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTaskStore } from '@/store/taskStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useToast } from '@/contexts/ToastContext';
import { Task } from '@/types';
import { api } from '@/lib/api';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

interface TaskFormProps {
  task?: Task;
  onClose?: () => void;
}

export function TaskForm({ task, onClose }: TaskFormProps) {
  const { createTask, createTaskWithAutoFocus, updateTask, isLoading } = useTaskStore();
  const { enterFocusMode } = useCoachStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const isEditMode = !!task;
  const isGuest = typeof window !== 'undefined' && !localStorage.getItem('userId');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  // Moved uploadImage function before useEffect so it can be used
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
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Add paste event listener to catch images in MDEditor (disabled in guest mode)
  useEffect(() => {
    if (isGuest) return; // Skip in guest mode

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
  }, [uploadImage, isGuest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning('Task title is required');
      return;
    }

    if (isEditMode && task) {
      await updateTask(task.id, { title, description: description || undefined });
      setTitle('');
      setDescription('');
      if (onClose) onClose();
    } else {
      // Use auto-focus flow for new tasks
      try {
        const taskId = await createTaskWithAutoFocus(title, description || undefined);

        setTitle('');
        setDescription('');
        if (onClose) onClose();

        // Enter focus mode if task was created with subtasks
        if (taskId) {
          setTimeout(() => {
            const createdTask = useTaskStore.getState().tasks.find(t => t.id === taskId);
            if (createdTask && createdTask.subtasks.length > 0) {
              enterFocusMode(taskId, createdTask.subtasks);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Failed to create task:', error);
        toast.error('Failed to create task. Please try again.');
      }
    }
  };

  // Handle image paste and upload
  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await uploadImage(file);
        }
      }
    }
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
          Task Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Build TaskFlow AI web app"
          className="w-full px-4 py-3 rounded-lg backdrop-blur-md text-white placeholder:text-gray-400 transition-all focus:outline-none"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.2)',
          }}
          onFocus={(e) => {
            e.target.style.border = '1px solid rgba(167, 139, 250, 0.5)';
            e.target.style.boxShadow = '0 0 20px rgba(167, 139, 250, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            e.target.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.2)';
          }}
          disabled={isLoading}
          maxLength={200}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
          Description (Optional){!isGuest && ' - Drag & drop images, paste, or click to upload'}
        </label>
        <div
          onPaste={isGuest ? undefined : handlePaste}
          onDrop={isGuest ? undefined : handleDrop}
          onDragOver={isGuest ? undefined : handleDragOver}
          className="markdown-editor-wrapper rounded-lg overflow-hidden relative"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <MDEditor
            value={description}
            onChange={(val) => setDescription(val || '')}
            preview="edit"
            height={300}
            textareaProps={{
              placeholder: 'Add details... Drag & drop images, paste (Ctrl+V), or click the image button below.',
              disabled: isLoading || uploadingImage,
            }}
            data-color-mode="dark"
          />
        </div>
        <div className="flex items-center gap-3 mt-2">
          {uploadingImage && (
            <p className="text-sm text-purple-300">Uploading image...</p>
          )}
          {!isGuest ? (
            <label className="cursor-pointer text-sm text-purple-300 hover:text-purple-200 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                className="hidden"
                disabled={isLoading || uploadingImage}
              />
              <span>📎</span>
              <span>Click to upload images</span>
            </label>
          ) : (
            <p className="text-sm text-gray-400">
              📎 Image uploads available after signing in
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.8)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.6)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Task')}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-lg text-white font-medium transition-all"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
