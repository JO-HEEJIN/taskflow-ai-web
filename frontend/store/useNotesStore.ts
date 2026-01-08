import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string;
  taskId: string;
  taskTitle: string;
  content: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotesState {
  notes: Note[];

  // Actions
  addNote: (taskId: string, taskTitle: string) => Note;
  updateNote: (noteId: string, content: string) => void;
  deleteNote: (noteId: string) => void;
  toggleFavorite: (noteId: string) => void;

  // Queries
  getNoteByTaskId: (taskId: string) => Note | undefined;
  getNotesByTaskId: (taskId: string) => Note[];
  getAllNotes: () => Note[];
  getFavoriteNotes: () => Note[];
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (taskId: string, taskTitle: string) => {
        const existingNote = get().notes.find(n => n.taskId === taskId);
        if (existingNote) return existingNote;

        const newNote: Note = {
          id: crypto.randomUUID(),
          taskId,
          taskTitle,
          content: '',
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set(state => ({
          notes: [...state.notes, newNote],
        }));

        return newNote;
      },

      updateNote: (noteId: string, content: string) => {
        set(state => ({
          notes: state.notes.map(note =>
            note.id === noteId
              ? { ...note, content, updatedAt: new Date().toISOString() }
              : note
          ),
        }));
      },

      deleteNote: (noteId: string) => {
        set(state => ({
          notes: state.notes.filter(note => note.id !== noteId),
        }));
      },

      toggleFavorite: (noteId: string) => {
        set(state => ({
          notes: state.notes.map(note =>
            note.id === noteId
              ? { ...note, isFavorite: !note.isFavorite, updatedAt: new Date().toISOString() }
              : note
          ),
        }));
      },

      getNoteByTaskId: (taskId: string) => {
        return get().notes.find(n => n.taskId === taskId);
      },

      getNotesByTaskId: (taskId: string) => {
        return get().notes.filter(n => n.taskId === taskId);
      },

      getAllNotes: () => {
        return get().notes.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      },

      getFavoriteNotes: () => {
        return get().notes
          .filter(n => n.isFavorite)
          .sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      },
    }),
    {
      name: 'taskflow-notes',
    }
  )
);
