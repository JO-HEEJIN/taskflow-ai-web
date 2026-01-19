'use client';

import { useState, useRef } from 'react';
import { useTextbookStore } from '@/store/textbookStore';
import { useTaskStore } from '@/store/taskStore';
import { api } from '@/lib/api';

interface Chapter {
  title: string;
  description?: string;
}

interface AddTextbookModalProps {
  onClose: () => void;
}

type InputMode = 'auto' | 'manual';
type AutoInputType = 'pdf' | 'url' | 'text';

export function AddTextbookModal({ onClose }: AddTextbookModalProps) {
  const { createTextbook, generateTasksFromTextbook, isLoading } = useTextbookStore();
  const { fetchTasks } = useTaskStore();

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('auto');
  const [autoInputType, setAutoInputType] = useState<AutoInputType>('pdf');

  // Auto input states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Form states (populated from auto or manual input)
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([{ title: '' }]);
  const [generateTasks, setGenerateTasks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addChapter = () => {
    setChapters([...chapters, { title: '' }]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter((_, i) => i !== index));
    }
  };

  const updateChapter = (index: number, field: keyof Chapter, value: string) => {
    setChapters(chapters.map((ch, i) => (i === index ? { ...ch, [field]: value } : ch)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setParseError(null);
    } else {
      setParseError('Please select a PDF file');
    }
  };

  const handleParse = async () => {
    setIsParsing(true);
    setParseError(null);

    try {
      let result;

      if (autoInputType === 'pdf' && pdfFile) {
        result = await api.parseTextbookPDF(pdfFile);
      } else if (autoInputType === 'url' && urlInput) {
        result = await api.parseTextbookURL(urlInput);
      } else if (autoInputType === 'text' && textInput) {
        result = await api.parseTextbookText(textInput);
      } else {
        throw new Error('Please provide input to parse');
      }

      // Populate form with parsed data
      setTitle(result.title || '');
      setAuthor(result.author || '');
      setDescription(result.description || '');
      setChapters(
        result.chapters?.length > 0
          ? result.chapters.map((ch: any) => ({
              title: ch.title || '',
              description: ch.description || '',
            }))
          : [{ title: '' }]
      );

      // Switch to manual mode to review/edit
      setInputMode('manual');
    } catch (error: any) {
      console.error('Parse error:', error);
      setParseError(error.message || 'Failed to parse content');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;
    const validChapters = chapters.filter((ch) => ch.title.trim());
    if (validChapters.length === 0) return;

    try {
      const textbook = await createTextbook({
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        chapters: validChapters.map((ch) => ({
          title: ch.title.trim(),
          description: ch.description?.trim(),
        })),
      });

      if (generateTasks) {
        setIsGenerating(true);
        await generateTasksFromTextbook(textbook.id);
        await fetchTasks();
      }

      onClose();
    } catch (error) {
      console.error('Failed to create textbook:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.95) 0%, rgba(20, 10, 40, 0.98) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 className="text-xl font-bold text-white">Add New Textbook</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            disabled={isLoading || isGenerating || isParsing}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Input Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setInputMode('auto')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                inputMode === 'auto'
                  ? 'bg-purple-500/30 text-white border border-purple-500/50'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Auto-Extract
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                inputMode === 'manual'
                  ? 'bg-purple-500/30 text-white border border-purple-500/50'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Manual Entry
            </button>
          </div>

          {/* Auto Input Mode */}
          {inputMode === 'auto' && (
            <div className="space-y-4">
              {/* Auto Input Type Tabs */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAutoInputType('pdf')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    autoInputType === 'pdf' ? 'bg-purple-500/50 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  PDF Upload
                </button>
                <button
                  type="button"
                  onClick={() => setAutoInputType('url')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    autoInputType === 'url' ? 'bg-purple-500/50 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setAutoInputType('text')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    autoInputType === 'text' ? 'bg-purple-500/50 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {/* PDF Upload */}
              {autoInputType === 'pdf' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-500/30 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <svg className="w-12 h-12 mx-auto mb-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {pdfFile ? (
                    <div>
                      <p className="text-white font-medium">{pdfFile.name}</p>
                      <p className="text-purple-300/60 text-sm mt-1">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white font-medium">Click to upload PDF</p>
                      <p className="text-purple-300/60 text-sm mt-1">or drag and drop</p>
                    </div>
                  )}
                </div>
              )}

              {/* URL Input */}
              {autoInputType === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Webpage URL (syllabus, course page, etc.)
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/course-syllabus"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/60 transition-all"
                  />
                </div>
              )}

              {/* Text Input */}
              {autoInputType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Paste table of contents or syllabus
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Chapter 1: Introduction&#10;Chapter 2: Getting Started&#10;Chapter 3: Advanced Topics..."
                    rows={8}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/60 transition-all resize-none font-mono text-sm"
                  />
                </div>
              )}

              {/* Parse Error */}
              {parseError && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                  {parseError}
                </div>
              )}

              {/* Parse Button */}
              <button
                type="button"
                onClick={handleParse}
                disabled={
                  isParsing ||
                  (autoInputType === 'pdf' && !pdfFile) ||
                  (autoInputType === 'url' && !urlInput) ||
                  (autoInputType === 'text' && !textInput)
                }
                className="w-full py-3 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
                  border: '1px solid rgba(167, 139, 250, 0.5)',
                }}
              >
                {isParsing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    AI is analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Extract Chapters with AI
                  </>
                )}
              </button>

              <p className="text-center text-purple-300/50 text-sm">
                AI will analyze the content and extract chapters automatically
              </p>
            </div>
          )}

          {/* Manual Input Mode */}
          {inputMode === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Textbook Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Machine Learning"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/60 transition-all"
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g., Andrew Ng"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/60 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the textbook..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/60 transition-all resize-none"
                />
              </div>

              {/* Chapters */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-purple-300">
                    Chapters <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addChapter}
                    className="px-3 py-1 text-xs rounded-lg text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 transition-all flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Chapter
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {chapters.map((chapter, index) => (
                    <div key={index} className="flex items-start gap-3 group">
                      <span className="text-purple-300/50 text-sm pt-3 w-6">{index + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={chapter.title}
                          onChange={(e) => updateChapter(index, 'title', e.target.value)}
                          placeholder={`Chapter ${index + 1} title`}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500/60 transition-all text-sm"
                        />
                        <input
                          type="text"
                          value={chapter.description || ''}
                          onChange={(e) => updateChapter(index, 'description', e.target.value)}
                          placeholder="Brief description (optional)"
                          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-purple-500/20 text-white/80 placeholder-purple-300/40 focus:outline-none focus:border-purple-500/40 transition-all text-xs"
                        />
                      </div>
                      {chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChapter(index)}
                          className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Tasks Option */}
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateTasks}
                    onChange={(e) => setGenerateTasks(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-purple-500/30 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                  />
                  <div>
                    <span className="text-white font-medium">Generate AI Study Tasks</span>
                    <p className="text-sm text-purple-300/70 mt-1">
                      Let AI create structured study tasks for each chapter with learning strategies
                    </p>
                  </div>
                </label>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {inputMode === 'manual' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-purple-500/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
              disabled={isLoading || isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || isGenerating || !title.trim() || !chapters.some((ch) => ch.title.trim())}
              className="px-6 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)',
                border: '1px solid rgba(167, 139, 250, 0.5)',
              }}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Generating Tasks...
                </>
              ) : isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Textbook
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
