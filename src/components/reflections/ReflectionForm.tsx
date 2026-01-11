'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useReflections } from '@/contexts/ReflectionsContext';
import { Reflection, ReflectionType } from '@/types/reflections';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Smile, Zap } from 'lucide-react';

interface ReflectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  reflectionToEdit?: Reflection;
}

const reflectionTypeLabels: Record<ReflectionType, string> = {
  [ReflectionType.DAILY]: 'Щоденний',
  [ReflectionType.WEEKLY]: 'Тижневий',
  [ReflectionType.MONTHLY]: 'Місячний',
  [ReflectionType.QUARTERLY]: 'Квартальний',
  [ReflectionType.YEARLY]: 'Річний',
  [ReflectionType.CUSTOM]: 'Довільний',
};

// Mood emoji helper
const getMoodEmoji = (score: number): string => {
  if (score >= 9) return '😄';
  if (score >= 7) return '🙂';
  if (score >= 5) return '😐';
  if (score >= 3) return '😟';
  return '😢';
};

export default function ReflectionForm({ isOpen, onClose, reflectionToEdit }: ReflectionFormProps) {
  const { addReflection, updateReflection } = useReflections();
  const isEditMode = !!reflectionToEdit;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    reflectionType: ReflectionType.DAILY,
    reflectionDate: new Date().toISOString().split('T')[0],
    moodScore: 5,
    energyLevel: 5,
    tags: '',
  });

  // Initialize form with reflection data when editing
  useEffect(() => {
    if (reflectionToEdit) {
      setFormData({
        title: reflectionToEdit.title,
        content: reflectionToEdit.content,
        reflectionType: reflectionToEdit.reflectionType,
        reflectionDate: new Date(reflectionToEdit.reflectionDate).toISOString().split('T')[0],
        moodScore: reflectionToEdit.moodScore || 5,
        energyLevel: reflectionToEdit.energyLevel || 5,
        tags: reflectionToEdit.tags.join(', '),
      });
    } else {
      // Reset form when creating new reflection
      setFormData({
        title: '',
        content: '',
        reflectionType: ReflectionType.DAILY,
        reflectionDate: new Date().toISOString().split('T')[0],
        moodScore: 5,
        energyLevel: 5,
        tags: '',
      });
    }
  }, [reflectionToEdit, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      if (isEditMode && reflectionToEdit) {
        // Update existing reflection
        await updateReflection(reflectionToEdit.id, {
          title: formData.title,
          content: formData.content,
          reflectionType: formData.reflectionType,
          reflectionDate: new Date(formData.reflectionDate),
          moodScore: formData.moodScore,
          energyLevel: formData.energyLevel,
          tags: tagsArray,
        });
      } else {
        // Create new reflection
        await addReflection({
          title: formData.title,
          content: formData.content,
          reflectionType: formData.reflectionType,
          reflectionDate: new Date(formData.reflectionDate),
          moodScore: formData.moodScore,
          energyLevel: formData.energyLevel,
          tags: tagsArray,
          relatedGoalIds: [],
          relatedNoteIds: [],
        });
      }

      onClose();
    } catch (error) {
      console.error('Error submitting reflection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Редагувати роздум' : 'Новий роздум'}
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
              placeholder="Наприклад: Роздуми за 11 січня"
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
              placeholder="Що сьогодні вдалось? Що можна було зробити краще?"
              rows={8}
              required
            />
          </div>

          {/* Reflection Type and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reflectionType">Тип роздуму</Label>
              <Select
                value={formData.reflectionType}
                onValueChange={(value) => setFormData({ ...formData, reflectionType: value as ReflectionType })}
              >
                <SelectTrigger id="reflectionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reflectionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflectionDate">Дата роздуму *</Label>
              <Input
                id="reflectionDate"
                type="date"
                value={formData.reflectionDate}
                onChange={(e) => setFormData({ ...formData, reflectionDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Mood Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="moodScore" className="flex items-center gap-2">
                <Smile className="h-4 w-4" />
                Настрій
              </Label>
              <span className="text-sm font-semibold">
                {getMoodEmoji(formData.moodScore)} {formData.moodScore}/10
              </span>
            </div>
            <Slider
              id="moodScore"
              min={1}
              max={10}
              step={1}
              value={[formData.moodScore]}
              onValueChange={([value]) => setFormData({ ...formData, moodScore: value })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Дуже поганий</span>
              <span>Відмінний</span>
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="energyLevel" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Рівень енергії
              </Label>
              <span className="text-sm font-semibold">
                {formData.energyLevel}/10
              </span>
            </div>
            <Slider
              id="energyLevel"
              min={1}
              max={10}
              step={1}
              value={[formData.energyLevel]}
              onValueChange={([value]) => setFormData({ ...formData, energyLevel: value })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Виснажений</span>
              <span>Енергійний</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Теги</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Розділіть комами: продуктивність, досягнення, виклики"
            />
            <p className="text-xs text-muted-foreground">
              Розділяйте теги комами
            </p>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
