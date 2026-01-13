/**
 * Goal Notes Component
 *
 * Displays and manages notes for a specific goal
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import type { GoalNote } from '@/types/goal-notes';

interface GoalNotesProps {
  goalId: string;
}

export default function GoalNotes({ goalId }: GoalNotesProps) {
  const confirm = useConfirm();
  const [notes, setNotes] = useState<GoalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch notes
  useEffect(() => {
    fetchNotes();
  }, [goalId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/goals/${goalId}/notes`);

      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/goals/${goalId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId,
          content: newNoteContent.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      const newNote = await response.json();
      setNotes([newNote, ...notes]);
      setNewNoteContent('');
    } catch (error) {
      console.error('Error creating note:', error);
      toast({ variant: "destructive", title: "Помилка", description: 'Помилка при створенні нотатки' });
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: GoalNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim()) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/goals/${goalId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editingContent.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      const updatedNote = await response.json();
      setNotes(
        notes.map((note) => (note.id === noteId ? updatedNote : note))
      );
      setEditingNoteId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      toast({ variant: "destructive", title: "Помилка", description: 'Помилка при оновленні нотатки' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = await confirm({
      title: 'Видалити нотатку?',
      description: 'Ви впевнені, що хочете видалити цю нотатку?',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/goals/${goalId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ variant: "destructive", title: "Помилка", description: 'Помилка при видаленні нотатки' });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) {
      return 'щойно';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} хв. тому`;
    } else if (diffInHours < 24) {
      return `${diffInHours} год. тому`;
    } else if (diffInDays < 7) {
      return `${diffInDays} дн. тому`;
    } else {
      return date.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-white dark:bg-card">
        <CardHeader>
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Нотатки
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Завантаження...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-card">
      <CardHeader>
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Нотатки
        </h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Add new note */}
          <div className="space-y-3">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Додайте нову нотатку..."
              rows={3}
              className="resize-none"
            />
            <Button
              onClick={handleCreateNote}
              disabled={!newNoteContent.trim() || saving}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Збереження...' : 'Додати нотатку'}
            </Button>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Немає нотаток.</p>
              <p className="text-sm mt-2">Додайте першу нотатку вище.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border bg-muted/30 space-y-3"
                >
                  {editingNoteId === note.id ? (
                    // Edit mode
                    <>
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={3}
                        className="resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={!editingContent.trim() || saving}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Зберегти
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Скасувати
                        </Button>
                      </div>
                    </>
                  ) : (
                    // View mode
                    <>
                      <p className="text-foreground whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatDate(note.createdAt)}
                          {note.updatedAt !== note.createdAt && (
                            <span className="ml-1">(змінено)</span>
                          )}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(note)}
                            className="h-8 px-2"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-8 px-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
