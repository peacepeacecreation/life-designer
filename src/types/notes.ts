/**
 * Notes Types
 * Type definitions for notes/journal entries feature
 */

// Note type/purpose categories
export enum NoteType {
  GENERAL = 'general',
  MEETING = 'meeting',
  IDEA = 'idea',
  LEARNING = 'learning',
  TASK = 'task',
}

// Main Note interface
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string; // Markdown supported
  category?: string;
  tags: string[];
  relatedGoalIds: string[];
  noteType: NoteType;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Note create/update DTOs
export type CreateNoteInput = Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateNoteInput = Partial<CreateNoteInput>;

// Note metadata for UI customization
export interface NoteTypeMeta {
  id: NoteType;
  name: string; // Ukrainian name
  description: string;
  icon: string; // Emoji or icon identifier
  color: string; // CSS color for visualization
}

// Note type metadata (for UI)
export const noteTypeMeta: NoteTypeMeta[] = [
  {
    id: NoteType.GENERAL,
    name: 'Загальна',
    description: 'Звичайна нотатка',
    icon: '📝',
    color: 'hsl(210, 100%, 50%)',
  },
  {
    id: NoteType.MEETING,
    name: 'Зустріч',
    description: 'Нотатки зі зустрічі',
    icon: '👥',
    color: 'hsl(280, 100%, 50%)',
  },
  {
    id: NoteType.IDEA,
    name: 'Ідея',
    description: 'Нова ідея або концепція',
    icon: '💡',
    color: 'hsl(45, 100%, 50%)',
  },
  {
    id: NoteType.LEARNING,
    name: 'Навчання',
    description: 'Нотатки з навчання',
    icon: '📚',
    color: 'hsl(140, 100%, 40%)',
  },
  {
    id: NoteType.TASK,
    name: 'Завдання',
    description: 'Список завдань або TODO',
    icon: '✅',
    color: 'hsl(0, 100%, 50%)',
  },
];

// Helper function to get note type metadata
export function getNoteTypeMeta(type: NoteType): NoteTypeMeta {
  return noteTypeMeta.find(meta => meta.id === type) || noteTypeMeta[0];
}
