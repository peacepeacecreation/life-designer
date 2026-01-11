'use client';

import { Note, NoteType } from '@/types/notes';
import { useNotes } from '@/contexts/NotesContext';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Users,
  Lightbulb,
  BookOpen,
  CheckSquare,
  Trash2,
  Pin,
  Archive,
  Calendar
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onEdit?: (note: Note) => void;
}

const noteTypeIcons: Record<NoteType, React.ElementType> = {
  [NoteType.GENERAL]: FileText,
  [NoteType.MEETING]: Users,
  [NoteType.IDEA]: Lightbulb,
  [NoteType.LEARNING]: BookOpen,
  [NoteType.TASK]: CheckSquare,
};

const noteTypeLabels: Record<NoteType, string> = {
  [NoteType.GENERAL]: 'Загальне',
  [NoteType.MEETING]: 'Зустріч',
  [NoteType.IDEA]: 'Ідея',
  [NoteType.LEARNING]: 'Навчання',
  [NoteType.TASK]: 'Задача',
};

const noteTypeColors: Record<NoteType, string> = {
  [NoteType.GENERAL]: 'hsl(var(--muted))',
  [NoteType.MEETING]: 'hsl(220, 70%, 50%)',
  [NoteType.IDEA]: 'hsl(45, 90%, 50%)',
  [NoteType.LEARNING]: 'hsl(160, 60%, 45%)',
  [NoteType.TASK]: 'hsl(280, 60%, 50%)',
};

export default function NoteCard({ note, onEdit }: NoteCardProps) {
  const { deleteNote } = useNotes();
  const NoteIcon = noteTypeIcons[note.noteType];
  const typeColor = noteTypeColors[note.noteType];

  const handleDelete = async () => {
    if (confirm(`Ви впевнені, що хочете видалити нотатку "${note.title}"?`)) {
      await deleteNote(note.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onEdit) {
      onEdit(note);
    }
  };

  return (
    <Card className="bg-white dark:bg-card hover:shadow-lg transition-shadow relative group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${typeColor}/0.1` }}>
              <NoteIcon className="h-5 w-5" style={{ color: typeColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-black dark:text-white truncate">
                  {note.title}
                </h3>
                {note.isPinned && (
                  <Pin className="h-4 w-4 text-primary fill-primary" />
                )}
                {note.isArchived && (
                  <Archive className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(note.createdAt).toLocaleDateString('uk-UA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              onClick={handleEdit}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {note.content && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
            {note.content}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {noteTypeLabels[note.noteType]}
          </Badge>
          {note.category && (
            <Badge variant="outline">
              {note.category}
            </Badge>
          )}
          {note.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
