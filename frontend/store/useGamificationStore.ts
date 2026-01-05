import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DailyActivity {
  date: string; // ISO date string (YYYY-MM-DD)
  completions: number;
  xpEarned: number;
}

interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastCompletionDate: string | null;
  activityHistory: DailyActivity[]; // Last 30 days of activity
  accumulatedFocusTime: number; // ✅ NEW: Total focused minutes (resets after level up)

  // Actions
  addXp: (amount: number) => void;
  addFocusTime: (minutes: number) => void; // ✅ NEW: Add focused time and check for level up
  checkStreak: () => void;
  resetProgress: () => void;
  getActivityForLast30Days: () => DailyActivity[];
}

// XP required for each level (exponential growth)
const getXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      streak: 0,
      lastCompletionDate: null,
      activityHistory: [],
      accumulatedFocusTime: 0, // ✅ NEW

      addXp: (amount: number) => {
        const { xp, level, activityHistory } = get();
        const newXp = xp + amount;
        const xpForNextLevel = getXPForLevel(level + 1);

        // Track daily activity
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const todayActivity = activityHistory.find(a => a.date === today);

        let newHistory = [...activityHistory];
        if (todayActivity) {
          // Update today's activity
          newHistory = newHistory.map(a =>
            a.date === today
              ? { ...a, completions: a.completions + 1, xpEarned: a.xpEarned + amount }
              : a
          );
        } else {
          // Add new day
          newHistory.push({ date: today, completions: 1, xpEarned: amount });
        }

        // Keep only last 90 days (to be safe, we'll show 30)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        newHistory = newHistory.filter(a => new Date(a.date) >= ninetyDaysAgo);

        // Check for level up
        if (newXp >= xpForNextLevel) {
          set({
            xp: newXp - xpForNextLevel,
            level: level + 1,
            activityHistory: newHistory,
          });

          // Trigger level up celebration
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('levelup', {
              detail: { newLevel: level + 1 }
            }));
          }
        } else {
          set({ xp: newXp, activityHistory: newHistory });
        }

        // Update streak
        get().checkStreak();
      },

      addFocusTime: (minutes: number) => {
        // ✅ NEW: Time-based level up system
        const { accumulatedFocusTime, level } = get();
        const newAccumulatedTime = accumulatedFocusTime + minutes;

        console.log(`⏱️  [Gamification] Focus time: +${minutes}min (Total: ${newAccumulatedTime}min)`);

        // Level up every 60 minutes of focused work
        if (newAccumulatedTime >= 60) {
          const newLevel = level + 1;
          const remainingTime = newAccumulatedTime - 60;

          console.log(`🎉 [LEVEL UP] ${level} → ${newLevel}`);

          set({
            level: newLevel,
            accumulatedFocusTime: remainingTime, // Carry over extra time
          });

          // Trigger level up celebration
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('levelup', {
              detail: { newLevel, focusTimeMinutes: 60 }
            }));
          }

          // Update streak
          get().checkStreak();
        } else {
          set({ accumulatedFocusTime: newAccumulatedTime });
        }
      },

      checkStreak: () => {
        const today = new Date().toDateString();
        const { lastCompletionDate } = get();

        if (!lastCompletionDate) {
          // First completion
          set({ streak: 1, lastCompletionDate: today });
        } else {
          const lastDate = new Date(lastCompletionDate);
          const todayDate = new Date(today);
          const diffTime = todayDate.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            // Same day, no change
            return;
          } else if (diffDays === 1) {
            // Consecutive day, increment streak
            set((state) => ({
              streak: state.streak + 1,
              lastCompletionDate: today
            }));
          } else {
            // Streak broken, reset to 1
            set({ streak: 1, lastCompletionDate: today });
          }
        }
      },

      resetProgress: () => {
        set({ xp: 0, level: 1, streak: 0, lastCompletionDate: null, activityHistory: [], accumulatedFocusTime: 0 });
      },

      getActivityForLast30Days: () => {
        const { activityHistory } = get();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fill in missing days with 0 completions
        const last30Days: DailyActivity[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const existingActivity = activityHistory.find(a => a.date === dateStr);
          last30Days.push(
            existingActivity || { date: dateStr, completions: 0, xpEarned: 0 }
          );
        }

        return last30Days;
      },
    }),
    {
      name: 'gamification-storage',
    }
  )
);

// Helper to get progress to next level
export const getLevelProgress = (): number => {
  const { xp, level } = useGamificationStore.getState();
  const xpForNextLevel = getXPForLevel(level + 1);
  return (xp / xpForNextLevel) * 100;
};
