'use client';

import { useState } from 'react';
import { Loader } from '@/components/ui/loader';
import { useNotes } from '@/contexts/NotesContext';
import { Note, NoteType } from '@/types/notes';
import NoteCard from './NoteCard';
import NoteForm from './NoteForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText } from 'lucide-react';

export default function NotesList() {
  const { notes, isLoading, error, getFilteredNotes, filters, setFilters } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedNote(undefined);
  };

  const filteredNotes = getFilteredNotes();

  // Filter out archived notes by default
  const displayNotes = filteredNotes.filter(note => !note.isArchived);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Помилка завантаження нотаток</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6">
        <Tabs
          value={filters.type || 'all'}
          onValueChange={(value) => setFilters({ type: value === 'all' ? null : value as NoteType })}
        >
          <TabsList>
            <TabsTrigger value="all">Всі</TabsTrigger>
            <TabsTrigger value={NoteType.GENERAL}>Загальні</TabsTrigger>
            <TabsTrigger value={NoteType.MEETING}>Зустрічі</TabsTrigger>
            <TabsTrigger value={NoteType.IDEA}>Ідеї</TabsTrigger>
            <TabsTrigger value={NoteType.LEARNING}>Навчання</TabsTrigger>
            <TabsTrigger value={NoteType.TASK}>Задачі</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notes Grid */}
      {displayNotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            Немає нотаток
          </h3>
          <p className="text-muted-foreground mb-6">
            Створіть вашу першу нотатку, щоб почати
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Note Form Modal */}
      <NoteForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        noteToEdit={selectedNote}
      />
    </>
  );
}
