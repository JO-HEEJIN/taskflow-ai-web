'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, LogIn, LogOut, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useGamificationStore, getLevelProgress } from '@/store/useGamificationStore';

interface ProfileButtonProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProfileButton({ isOpen: externalIsOpen, onOpenChange }: ProfileButtonProps = {}) {
  const { data: session, status } = useSession();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { xp, level, streak, getActivityForLast30Days } = useGamificationStore();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [continuousMusicEnabled, setContinuousMusicEnabled] = useState(false);

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
              className="w-full max-w-md mt-16 md:mt-20 rounded-2xl p-6 md:p-8"
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

              {/* Music Toggle Section */}
              <div className="mb-6 p-4 rounded-xl space-y-4" style={{ background: 'rgba(167, 139, 250, 0.1)' }}>
                {/* Loading Screen Music */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {musicEnabled ? (
                      <Volume2 className="w-5 h-5 text-purple-300" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">Loading Music</p>
                      <p className="text-xs text-gray-400">Plays during loading</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleMusic}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{
                      background: musicEnabled
                        ? 'linear-gradient(135deg, #c084fc 0%, #e879f9 100%)'
                        : 'rgba(100, 100, 100, 0.5)',
                    }}
                  >
                    <motion.div
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{ x: musicEnabled ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Continuous Background Music */}
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
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
    </>
  );
}
