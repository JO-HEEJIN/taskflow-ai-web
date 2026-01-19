import { create } from 'zustand';
import { Textbook, Task } from '@/types';
import { api } from '@/lib/api';

interface TextbookStore {
  textbooks: Textbook[];
  selectedTextbook: Textbook | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTextbooks: () => Promise<void>;
  fetchTextbookById: (id: string) => Promise<Textbook | null>;
  createTextbook: (data: {
    title: string;
    author?: string;
    description?: string;
    chapters: { title: string; description?: string }[];
  }) => Promise<Textbook>;
  updateTextbook: (id: string, updates: Partial<Textbook>) => Promise<void>;
  deleteTextbook: (id: string) => Promise<void>;
  generateTasksFromTextbook: (id: string) => Promise<{ textbook: Textbook; tasks: Task[] }>;
  setSelectedTextbook: (textbook: Textbook | null) => void;
  clearError: () => void;
}

export const useTextbookStore = create<TextbookStore>((set, get) => ({
  textbooks: [],
  selectedTextbook: null,
  isLoading: false,
  error: null,

  fetchTextbooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { textbooks } = await api.getTextbooks();
      set({ textbooks, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchTextbookById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { textbook } = await api.getTextbookById(id);
      if (textbook) {
        set((state) => ({
          textbooks: state.textbooks.some((t) => t.id === id)
            ? state.textbooks.map((t) => (t.id === id ? textbook : t))
            : [...state.textbooks, textbook],
          selectedTextbook: textbook,
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
      return textbook;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  createTextbook: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { textbook } = await api.createTextbook(data);
      set((state) => ({
        textbooks: [...state.textbooks, textbook],
        isLoading: false,
      }));
      return textbook;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateTextbook: async (id: string, updates: Partial<Textbook>) => {
    set({ isLoading: true, error: null });
    try {
      const { textbook } = await api.updateTextbook(id, updates);
      set((state) => ({
        textbooks: state.textbooks.map((t) => (t.id === id ? textbook : t)),
        selectedTextbook:
          state.selectedTextbook?.id === id ? textbook : state.selectedTextbook,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteTextbook: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteTextbook(id);
      set((state) => ({
        textbooks: state.textbooks.filter((t) => t.id !== id),
        selectedTextbook:
          state.selectedTextbook?.id === id ? null : state.selectedTextbook,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  generateTasksFromTextbook: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.generateTasksFromTextbook(id);
      // Update the textbook with linked chapters
      set((state) => ({
        textbooks: state.textbooks.map((t) =>
          t.id === id ? result.textbook : t
        ),
        selectedTextbook:
          state.selectedTextbook?.id === id
            ? result.textbook
            : state.selectedTextbook,
        isLoading: false,
      }));
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setSelectedTextbook: (textbook: Textbook | null) => {
    set({ selectedTextbook: textbook });
  },

  clearError: () => {
    set({ error: null });
  },
}));
