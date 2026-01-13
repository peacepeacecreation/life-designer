'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { useNotes } from '@/contexts/NotesContext';
import { Note, NoteType } from '@/types/notes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader } from '@/components/ui/loader';

interface NoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  noteToEdit?: Note;
}

const noteTypeLabels: Record<NoteType, string> = {
  [NoteType.GENERAL]: 'Загальне',
  [NoteType.MEETING]: 'Зустріч',
  [NoteType.IDEA]: 'Ідея',
  [NoteType.LEARNING]: 'Навчання',
  [NoteType.TASK]: 'Задача',
};

export default function NoteForm({ isOpen, onClose, noteToEdit }: NoteFormProps) {
  const { addNote, updateNote } = useNotes();
  const isEditMode = !!noteToEdit;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    noteType: NoteType.GENERAL,
    category: '',
    tags: '',
    isPinned: false,
  });

  // Initialize form with note data when editing
  useEffect(() => {
    if (noteToEdit) {
      setFormData({
        title: noteToEdit.title,
        content: noteToEdit.content,
        noteType: noteToEdit.noteType,
        category: noteToEdit.category || '',
        tags: noteToEdit.tags.join(', '),
        isPinned: noteToEdit.isPinned,
      });
    } else {
      // Reset form when creating new note
      setFormData({
        title: '',
        content: '',
        noteType: NoteType.GENERAL,
        category: '',
        tags: '',
        isPinned: false,
      });
    }
  }, [noteToEdit, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      if (isEditMode && noteToEdit) {
        // Update existing note
        await updateNote(noteToEdit.id, {
          title: formData.title,
          content: formData.content,
          noteType: formData.noteType,
          category: formData.category || undefined,
          tags: tagsArray,
          isPinned: formData.isPinned,
        });
      } else {
        // Create new note
        await addNote({
          title: formData.title,
          content: formData.content,
          noteType: formData.noteType,
          category: formData.category || undefined,
          tags: tagsArray,
          relatedGoalIds: [],
          isPinned: formData.isPinned,
          isArchived: false,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error submitting note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Редагувати нотатку' : 'Нова нотатка'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Назва *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Введіть назву нотатки"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Контент *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Введіть контент нотатки"
              rows={8}
              required
            />
          </div>

          {/* Note Type */}
          <div className="space-y-2">
            <Label htmlFor="noteType">Тип нотатки</Label>
            <Select
              value={formData.noteType}
              onValueChange={(value) => setFormData({ ...formData, noteType: value as NoteType })}
            >
              <SelectTrigger id="noteType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(noteTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Категорія (опціонально)</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Наприклад: Робота, Проект, Особисте"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Теги</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Розділіть комами: важливо, todo, ідея"
            />
            <p className="text-xs text-muted-foreground">
              Розділяйте теги комами
            </p>
          </div>

          {/* Pin Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPinned"
              checked={formData.isPinned}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPinned: checked as boolean })
              }
            />
            <Label htmlFor="isPinned" className="cursor-pointer">
              Закріпити нотатку
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Збереження...
                </>
              ) : (
                isEditMode ? 'Зберегти' : 'Створити'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
