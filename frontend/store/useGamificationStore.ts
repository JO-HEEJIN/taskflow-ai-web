import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastCompletionDate: string | null;

  // Actions
  addXp: (amount: number) => void;
  checkStreak: () => void;
  resetProgress: () => void;
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

      addXp: (amount: number) => {
        const { xp, level } = get();
        const newXp = xp + amount;
        const xpForNextLevel = getXPForLevel(level + 1);

        // Check for level up
        if (newXp >= xpForNextLevel) {
          set({
            xp: newXp - xpForNextLevel,
            level: level + 1,
          });

          // Trigger level up celebration
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('levelup', {
              detail: { newLevel: level + 1 }
            }));
          }
        } else {
          set({ xp: newXp });
        }

        // Update streak
        get().checkStreak();
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
        set({ xp: 0, level: 1, streak: 0, lastCompletionDate: null });
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
