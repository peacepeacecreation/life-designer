'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useGoals } from '@/contexts/GoalsContext';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types';
import { categoryMeta, priorityLabels, statusLabels } from '@/lib/categoryConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal;
  onGoalUpdated?: (goal: Goal) => void;
}

export default function GoalForm({ isOpen, onClose, goalToEdit, onGoalUpdated }: GoalFormProps) {
  const { addGoal, updateGoal, getTotalTimeAllocated } = useGoals();
  const isEditMode = !!goalToEdit;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: GoalCategory.WORK_STARTUPS,
    priority: GoalPriority.MEDIUM,
    status: GoalStatus.NOT_STARTED,
    timeAllocated: 1,
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months from now
    progressPercentage: 0,
  });

  // Initialize form with goal data when editing
  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        name: goalToEdit.name,
        description: goalToEdit.description,
        category: goalToEdit.category,
        priority: goalToEdit.priority,
        status: goalToEdit.status,
        timeAllocated: goalToEdit.timeAllocated,
        startDate: new Date(goalToEdit.startDate).toISOString().split('T')[0],
        targetEndDate: new Date(goalToEdit.targetEndDate).toISOString().split('T')[0],
        progressPercentage: goalToEdit.progressPercentage,
      });
    } else {
      // Reset form when creating new goal
      setFormData({
        name: '',
        description: '',
        category: GoalCategory.WORK_STARTUPS,
        priority: GoalPriority.MEDIUM,
        status: GoalStatus.NOT_STARTED,
        timeAllocated: 1,
        startDate: new Date().toISOString().split('T')[0],
        targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progressPercentage: 0,
      });
    }
  }, [goalToEdit, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isEditMode && goalToEdit) {
      // Update existing goal
      const updatedGoal = await updateGoal(goalToEdit.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        timeAllocated: formData.timeAllocated,
        startDate: new Date(formData.startDate),
        targetEndDate: new Date(formData.targetEndDate),
        progressPercentage: formData.progressPercentage,
      });

      if (updatedGoal && onGoalUpdated) {
        onGoalUpdated(updatedGoal);
      }
    } else {
      // Create new goal
      addGoal({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        timeAllocated: formData.timeAllocated,
        startDate: new Date(formData.startDate),
        targetEndDate: new Date(formData.targetEndDate),
        progressPercentage: formData.progressPercentage,
        tags: [],
      });
    }

    onClose();
  };

  const currentTotal = getTotalTimeAllocated();
  const newTotal = currentTotal + formData.timeAllocated;
  const isOvercommitted = newTotal > 80;
  const isWarning = newTotal > 60 && newTotal <= 80;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-card">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white">
            {isEditMode ? 'Редагувати ціль' : 'Створити нову ціль'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Назва <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Наприклад: Voice Agent Poland"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Опишіть вашу ціль..."
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                Категорія <span className="text-destructive">*</span>
              </Label>
              <select
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as GoalCategory })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {categoryMeta.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">
                Пріоритет <span className="text-destructive">*</span>
              </Label>
              <select
                id="priority"
                required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as GoalPriority })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Object.entries(priorityLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status and Time Allocated */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">
                Статус <span className="text-destructive">*</span>
              </Label>
              <select
                id="status"
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as GoalStatus })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeAllocated">
                Годин на тиждень <span className="text-destructive">*</span>
              </Label>
              <Input
                id="timeAllocated"
                type="number"
                required
                min="1"
                max="168"
                value={formData.timeAllocated}
                onChange={(e) => setFormData({ ...formData, timeAllocated: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Time Allocation Warning */}
          {(isWarning || isOvercommitted) && (
            <div className={`p-4 rounded-lg border ${isOvercommitted ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'}`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {isOvercommitted ? 'Критично!' : 'Увага!'}
                  </p>
                  <p className="text-sm mt-1">
                    З цією ціллю ви заплануєте <strong>{newTotal} годин на тиждень</strong>.
                    {isOvercommitted ? ' Це може призвести до перевантаження.' : ' Рекомендуємо не перевищувати 60 годин.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Дата початку <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetEndDate">
                Цільова дата завершення <span className="text-destructive">*</span>
              </Label>
              <Input
                id="targetEndDate"
                type="date"
                required
                value={formData.targetEndDate}
                onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              Скасувати
            </Button>
            <Button type="submit">
              {isEditMode ? 'Зберегти зміни' : 'Створити ціль'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
