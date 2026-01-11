'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Note, NoteType } from '@/types/notes';

interface NotesContextType {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  addNote: (note: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
  refreshNotes: () => Promise<void>;
  getNotesByType: (type: NoteType) => Note[];
  getFilteredNotes: () => Note[];
  filters: {
    type: NoteType | null;
    category: string | null;
    isPinned: boolean | null;
    isArchived: boolean | null;
  };
  setFilters: (filters: Partial<NotesContextType['filters']>) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<NotesContextType['filters']>({
    type: null,
    category: null,
    isPinned: null,
    isArchived: null,
  });

  // Fetch notes from API
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/notes');

      // Handle unauthenticated or server error state gracefully
      if (response.status === 401 || response.status === 500) {
        // Silently set empty notes array - API not ready or not authenticated
        setNotes([]);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await response.json();

      // Parse dates from ISO strings
      const parsedNotes = data.notes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      }));

      setNotes(parsedNotes);
    } catch (err: any) {
      // Silently handle errors - just set empty array
      setNotes([]);
      setError(null); // Don't propagate error to UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Add a new note
  const addNote = useCallback(async (noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Note | null> => {
    try {
      setError(null);

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      const data = await response.json();
      const newNote = {
        ...data.note,
        createdAt: new Date(data.note.createdAt),
        updatedAt: new Date(data.note.updatedAt),
      };

      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (err: any) {
      console.error('Error adding note:', err);
      setError(err.message || 'Failed to create note');
      return null;
    }
  }, []);

  // Update an existing note
  const updateNote = useCallback(async (id: string, updates: Partial<Note>): Promise<Note | null> => {
    try {
      setError(null);

      const response = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      const data = await response.json();
      const updatedNote = {
        ...data.note,
        createdAt: new Date(data.note.createdAt),
        updatedAt: new Date(data.note.updatedAt),
      };

      setNotes(prev => prev.map(note =>
        note.id === id ? updatedNote : note
      ));

      return updatedNote;
    } catch (err: any) {
      console.error('Error updating note:', err);
      setError(err.message || 'Failed to update note');
      return null;
    }
  }, []);

  // Delete a note
  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(prev => prev.filter(note => note.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting note:', err);
      setError(err.message || 'Failed to delete note');
      return false;
    }
  }, []);

  // Refresh notes (refetch from API)
  const refreshNotes = useCallback(async () => {
    await fetchNotes();
  }, [fetchNotes]);

  // Get notes by type
  const getNotesByType = useCallback((type: NoteType): Note[] => {
    return notes.filter(note => note.noteType === type);
  }, [notes]);

  // Get filtered notes based on current filters
  const getFilteredNotes = useCallback((): Note[] => {
    return notes.filter(note => {
      if (filters.type && note.noteType !== filters.type) return false;
      if (filters.category && note.category !== filters.category) return false;
      if (filters.isPinned !== null && note.isPinned !== filters.isPinned) return false;
      if (filters.isArchived !== null && note.isArchived !== filters.isArchived) return false;
      return true;
    });
  }, [notes, filters]);

  // Update filters
  const setFilters = useCallback((newFilters: Partial<NotesContextType['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const value: NotesContextType = {
    notes,
    isLoading,
    error,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes,
    getNotesByType,
    getFilteredNotes,
    filters,
    setFilters,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within NotesProvider');
  }
  return context;
}
