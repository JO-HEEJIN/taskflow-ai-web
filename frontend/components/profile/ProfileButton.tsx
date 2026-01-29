'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, LogIn, LogOut, Trophy, Volume2, VolumeX, FileText, Menu, Star, Trash2, Database, ChevronRight, BookOpen, Calendar } from 'lucide-react';
import { useNotesStore, Note } from '@/store/useNotesStore';
import ReactMarkdown from 'react-markdown';
import { useGamificationStore, getLevelProgress } from '@/store/useGamificationStore';
import { useTaskStore } from '@/store/taskStore';
import { TaskHistory } from '@/components/TaskHistory';
import { TextbookLibrary } from '@/components/textbooks';
import { CalendarSettings } from '@/components/settings/CalendarSettings';
import { CalendarView } from '@/components/calendar/CalendarView';

interface ProfileButtonProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProfileButton({ isOpen: externalIsOpen, onOpenChange }: ProfileButtonProps = {}) {
  const { data: session, status } = useSession();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { xp, level, streak, getActivityForLast30Days } = useGamificationStore();
  const { getAllNotes, toggleFavorite, deleteNote } = useNotesStore();
  const { tasks, deleteAllTasks, fetchDeletedTasks, deletedTasks } = useTaskStore();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [continuousMusicEnabled, setContinuousMusicEnabled] = useState(true);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [isDataManagementExpanded, setIsDataManagementExpanded] = useState(false);
  const [showTextbookLibrary, setShowTextbookLibrary] = useState(false);
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const isGuest = status !== 'authenticated';
  const activityData = getActivityForLast30Days();
  const levelProgress = getLevelProgress();

  // Load music preferences from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('musicEnabled');
    if (savedPreference !== null) {
      setMusicEnabled(savedPreference === 'true');
    }

    const savedContinuousMusic = localStorage.getItem('continuousMusicEnabled');
    if (savedContinuousMusic !== null) {
      setContinuousMusicEnabled(savedContinuousMusic === 'true');
    }
  }, []);

  // Toggle music and save to localStorage
  const toggleMusic = () => {
    const newValue = !musicEnabled;
    setMusicEnabled(newValue);
    localStorage.setItem('musicEnabled', String(newValue));
  };

  // Toggle continuous music and save to localStorage
  const toggleContinuousMusic = () => {
    const newValue = !continuousMusicEnabled;
    setContinuousMusicEnabled(newValue);
    localStorage.setItem('continuousMusicEnabled', String(newValue));

    // Trigger custom event for background music player
    window.dispatchEvent(new CustomEvent('continuousMusicToggle', { detail: { enabled: newValue } }));
  };

  // Calculate max completions for heatmap intensity
  const maxCompletions = Math.max(...activityData.map(d => d.completions), 1);

  // Get color intensity based on completions
  const getHeatmapColor = (completions: number): string => {
    if (completions === 0) return 'rgba(100, 100, 100, 0.2)';
    const intensity = completions / maxCompletions;
    if (intensity > 0.75) return 'rgba(34, 197, 94, 1)'; // Very active - bright green
    if (intensity > 0.5) return 'rgba(34, 197, 94, 0.7)'; // Active - medium green
    if (intensity > 0.25) return 'rgba(34, 197, 94, 0.4)'; // Light activity
    return 'rgba(34, 197, 94, 0.2)'; // Minimal activity
  };

  const handleAuthAction = async () => {
    if (isGuest) {
      await signIn('google');
    } else {
      await signOut();
    }
  };

  const handleDeleteAllTasks = async () => {
    if (tasks.length === 0) {
      alert('No tasks to delete');
      return;
    }

    if (confirm(`Delete all ${tasks.length} tasks? They will be moved to trash and can be restored within 30 days.`)) {
      try {
        await deleteAllTasks();
        alert('All tasks moved to trash');
      } catch (error) {
        console.error('Failed to delete all tasks:', error);
        alert('Failed to delete tasks. Please try again.');
      }
    }
  };

  const handleOpenTrash = async () => {
    await fetchDeletedTasks();
    setShowTaskHistory(true);
    setIsOpen(false); // Close profile modal
  };

  return (
    <>
      {/* Profile Button - only show if not externally controlled */}
      {externalIsOpen === undefined && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed top-16 right-4 md:top-6 md:right-6 z-[9998] p-3 rounded-full backdrop-blur-md transition-all"
          style={{
            background: isGuest
              ? 'rgba(100, 100, 100, 0.3)'
              : 'linear-gradient(135deg, rgba(192, 132, 252, 0.5) 0%, rgba(232, 121, 249, 0.5) 100%)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 0 20px rgba(192, 132, 252, 0.4)',
          }}
        >
          <div className="relative">
            <User className="w-6 h-6 text-white" />
            {!isGuest && (
              <div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  boxShadow: '0 0 10px rgba(251, 191, 36, 0.6)',
                }}
              >
                {level}
              </div>
            )}
          </div>
        </motion.button>
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-start justify-end p-4 md:p-6"
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md mt-16 md:mt-20 rounded-2xl p-6 md:p-8 max-h-[calc(100vh-8rem)] overflow-y-auto"
              style={{
                background: 'rgba(0, 0, 0, 0.95)',
                border: '2px solid rgba(167, 139, 250, 0.4)',
                boxShadow: '0 0 40px rgba(167, 139, 250, 0.5), inset 0 0 40px rgba(255, 255, 255, 0.03)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  Profile
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* User Info */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(167, 139, 250, 0.1)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: isGuest
                        ? 'rgba(100, 100, 100, 0.5)'
                        : 'linear-gradient(135deg, #c084fc 0%, #e879f9 100%)',
                    }}
                  >
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {isGuest ? 'Guest User' : session?.user?.name || 'User'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {isGuest ? 'Not logged in' : session?.user?.email || ''}
                    </p>
                  </div>
                </div>

                {/* Auth Button */}
                <button
                  onClick={handleAuthAction}
                  className="w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    background: isGuest
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : 'rgba(239, 68, 68, 0.8)',
                    color: 'white',
                    boxShadow: isGuest
                      ? '0 0 20px rgba(34, 197, 94, 0.4)'
                      : '0 0 20px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  {isGuest ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Login with Google</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </>
                  )}
                </button>
              </div>

              {/* Textbook Library Section - Blue theme */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                <button
                  onClick={() => {
                    setShowTextbookLibrary(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <div className="text-left">
                      <p className="text-blue-400 font-medium">Textbook Library</p>
                      <p className="text-xs text-blue-200/60">Manage your study materials</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                </button>
              </div>

              {/* Calendar Section - Cyan theme */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-cyan-400 font-medium">Smart Scheduling</p>
                    <p className="text-xs text-cyan-200/60">Auto-schedule with Google Calendar</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowCalendarView(true);
                      setIsOpen(false);
                    }}
                    className="w-full p-2 rounded-lg flex items-center justify-between transition-all hover:bg-cyan-500/10"
                    style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    <span className="text-white text-sm">View Calendar</span>
                    <ChevronRight className="w-4 h-4 text-cyan-300" />
                  </button>
                  <button
                    onClick={() => {
                      setShowCalendarSettings(true);
                      setIsOpen(false);
                    }}
                    className="w-full p-2 rounded-lg flex items-center justify-between transition-all hover:bg-cyan-500/10"
                    style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    <span className="text-white text-sm">Calendar Settings</span>
                    <ChevronRight className="w-4 h-4 text-cyan-300" />
                  </button>
                </div>
              </div>

              {/* Notes Section - Yellow theme */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-medium">Notes</p>
                      <p className="text-xs text-yellow-200/60">{getAllNotes().length} notes saved</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isNotesExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                </div>

                {/* Expandable Notes List */}
                <AnimatePresence>
                  {isNotesExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t space-y-2 max-h-60 overflow-y-auto" style={{ borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                        {getAllNotes().length === 0 ? (
                          <p className="text-yellow-200/50 text-sm text-center py-4">
                            No notes yet. Create notes in Focus Mode!
                          </p>
                        ) : (
                          getAllNotes().map((note) => (
                            <motion.div
                              key={note.id}
                              className="p-3 rounded-lg cursor-pointer transition-all hover:bg-yellow-500/10"
                              style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                              onClick={() => setSelectedNote(note)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium text-sm truncate">
                                    {note.taskTitle}
                                  </p>
                                  <p className="text-yellow-200/60 text-xs mt-1 line-clamp-2">
                                    {note.content || 'Empty note'}
                                  </p>
                                </div>
                                {note.isFavorite && (
                                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-yellow-200/40 text-xs mt-2">
                                {new Date(note.updatedAt).toLocaleDateString()}
                              </p>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Music Toggle Section */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(167, 139, 250, 0.1)' }}>
                {/* Continuous Background Music */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {continuousMusicEnabled ? (
                      <Volume2 className="w-5 h-5 text-purple-300" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">Ambient Music</p>
                      <p className="text-xs text-gray-400">Plays except in Focus Mode</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleContinuousMusic}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{
                      background: continuousMusicEnabled
                        ? 'linear-gradient(135deg, #c084fc 0%, #e879f9 100%)'
                        : 'rgba(100, 100, 100, 0.5)',
                    }}
                  >
                    <motion.div
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{ x: continuousMusicEnabled ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

              {/* Data Management Section - Red theme */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsDataManagementExpanded(!isDataManagementExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-red-400 font-medium">Data Management</p>
                      <p className="text-xs text-red-200/60">{tasks.length} active tasks</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isDataManagementExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-5 h-5 text-red-400" />
                  </motion.div>
                </div>

                {/* Expandable Data Management Actions */}
                <AnimatePresence>
                  {isDataManagementExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        {/* Trash Button */}
                        <button
                          onClick={handleOpenTrash}
                          className="w-full p-3 rounded-lg flex items-center justify-between transition-all hover:bg-red-500/10"
                          style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                        >
                          <div className="flex items-center gap-3">
                            <Trash2 className="w-5 h-5 text-red-300" />
                            <div className="text-left">
                              <p className="text-white font-medium text-sm">Trash</p>
                              <p className="text-red-200/60 text-xs">View and restore deleted tasks</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-red-300" />
                        </button>

                        {/* Delete All Tasks Button */}
                        <button
                          onClick={handleDeleteAllTasks}
                          disabled={tasks.length === 0}
                          className="w-full p-3 rounded-lg flex items-center justify-between transition-all hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <div className="text-left">
                              <p className="text-red-300 font-medium text-sm">Delete All Tasks</p>
                              <p className="text-red-200/60 text-xs">Move all tasks to trash</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Level & XP Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-semibold">Level {level}</span>
                  </div>
                  <span className="text-sm text-gray-400">{Math.floor(levelProgress)}% to next level</span>
                </div>

                {/* XP Progress Bar */}
                <div
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{ background: 'rgba(100, 100, 100, 0.3)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #c084fc 0%, #e879f9 50%, #fbbf24 100%)',
                      boxShadow: '0 0 10px rgba(192, 132, 252, 0.6)',
                    }}
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(167, 139, 250, 0.15)' }}>
                    <p className="text-2xl font-bold text-purple-300">{xp}</p>
                    <p className="text-xs text-gray-400">XP</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                    <p className="text-2xl font-bold text-yellow-300">{streak}</p>
                    <p className="text-xs text-gray-400">Day Streak 🔥</p>
                  </div>
                </div>
              </div>

              {/* 30-Day Activity Heatmap */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>Activity (Last 30 Days)</span>
                  <span className="text-xs text-gray-400">🌱</span>
                </h3>

                {/* Heatmap Grid */}
                <div className="grid grid-cols-10 gap-1.5">
                  {activityData.map((day, index) => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                      <motion.div
                        key={day.date}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="aspect-square rounded-sm cursor-pointer relative group"
                        style={{
                          background: getHeatmapColor(day.completions),
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                        title={`${day.date}: ${day.completions} tasks completed`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {dayName} {date.getDate()}: {day.completions} tasks
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-400">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(100, 100, 100, 0.2)' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34, 197, 94, 0.2)' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34, 197, 94, 0.4)' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34, 197, 94, 0.7)' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34, 197, 94, 1)' }} />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note View Modal */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedNote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden flex flex-col"
              style={{ background: '#ffffff' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                {/* Left - Favorite Star */}
                <button
                  onClick={() => {
                    toggleFavorite(selectedNote.id);
                    setSelectedNote({
                      ...selectedNote,
                      isFavorite: !selectedNote.isFavorite,
                    });
                  }}
                  className="p-2 rounded-lg hover:bg-yellow-50 transition-colors"
                  title={selectedNote.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`w-5 h-5 ${
                      selectedNote.isFavorite
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-400'
                    }`}
                  />
                </button>

                {/* Title */}
                <h3 className="text-gray-900 font-semibold text-lg flex-1 text-center truncate px-2">
                  {selectedNote.taskTitle}
                </h3>

                {/* Right - Delete & Close */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (confirm('Delete this note?')) {
                        deleteNote(selectedNote.id);
                        setSelectedNote(null);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
                  </button>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Markdown Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedNote.content ? (
                  <div className="prose prose-sm max-w-none text-gray-900">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-gray-900 text-xl font-bold mb-3">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-gray-800 text-lg font-semibold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-gray-700 text-base font-medium mb-2">{children}</h3>,
                        p: ({ children }) => <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-700">{children}</li>,
                        code: ({ children }) => (
                          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-3 text-sm">{children}</pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-yellow-400 pl-4 italic text-gray-600 my-3">{children}</blockquote>
                        ),
                        strong: ({ children }) => <strong className="text-gray-900 font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="text-gray-700">{children}</em>,
                      }}
                    >
                      {selectedNote.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">This note is empty.</p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                  Last updated: {new Date(selectedNote.updatedAt).toLocaleString()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task History Modal */}
      {showTaskHistory && (
        <TaskHistory onClose={() => setShowTaskHistory(false)} />
      )}

      {/* Textbook Library Modal */}
      {showTextbookLibrary && (
        <TextbookLibrary onClose={() => setShowTextbookLibrary(false)} />
      )}

      {/* Calendar View Modal */}
      {showCalendarView && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCalendarView(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-6xl h-[85vh] rounded-2xl overflow-hidden"
            style={{ background: '#111827' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Calendar</h2>
              <button
                onClick={() => setShowCalendarView(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="h-[calc(100%-64px)]">
              <CalendarView />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Calendar Settings Modal */}
      {showCalendarSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCalendarSettings(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg max-h-[85vh] rounded-2xl overflow-auto"
            style={{ background: '#111827' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-xl font-semibold text-white">Calendar Settings</h2>
              <button
                onClick={() => setShowCalendarSettings(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <CalendarSettings />
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
