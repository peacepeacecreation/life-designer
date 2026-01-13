'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Loader } from '@/components/ui/loader';
import { useGoals } from '@/contexts/GoalsContext';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types';
import { categoryMeta, priorityLabels, statusLabels, getCategoryMeta } from '@/lib/categoryConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Upload, Link as LinkIcon } from 'lucide-react';
import { IconPicker } from '@/components/goals/IconPicker';

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal;
  onGoalUpdated?: (goal: Goal) => void;
}

export default function GoalForm({ isOpen, onClose, goalToEdit, onGoalUpdated }: GoalFormProps) {
  const { goals, addGoal, updateGoal } = useGoals();
  const isEditMode = !!goalToEdit;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: GoalCategory.WORK_STARTUPS,
    priority: GoalPriority.MEDIUM,
    status: GoalStatus.NOT_STARTED,
    timeAllocated: 1,
    paymentType: '' as 'hourly' | 'fixed' | '',
    currency: '',
    hourlyRate: 0,
    fixedRate: 0,
    fixedRatePeriod: 'month' as 'week' | 'month',
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months from now
    progressPercentage: 0,
    url: '',
    iconUrl: '',
    color: '',
    isOngoing: false,
  });

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        paymentType: goalToEdit.paymentType || '',
        currency: goalToEdit.currency || '',
        hourlyRate: goalToEdit.hourlyRate || 0,
        fixedRate: goalToEdit.fixedRate || 0,
        fixedRatePeriod: goalToEdit.fixedRatePeriod || 'month',
        startDate: goalToEdit.startDate ? new Date(goalToEdit.startDate).toISOString().split('T')[0] : '',
        targetEndDate: goalToEdit.targetEndDate ? new Date(goalToEdit.targetEndDate).toISOString().split('T')[0] : '',
        progressPercentage: goalToEdit.progressPercentage,
        url: goalToEdit.url || '',
        iconUrl: goalToEdit.iconUrl || '',
        color: goalToEdit.color || '',
        isOngoing: goalToEdit.isOngoing || false,
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
        paymentType: '',
        currency: '',
        hourlyRate: 0,
        fixedRate: 0,
        fixedRatePeriod: 'month',
        startDate: new Date().toISOString().split('T')[0],
        targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progressPercentage: 0,
        url: '',
        iconUrl: '',
        color: '',
        isOngoing: false,
      });
    }
  }, [goalToEdit, isOpen]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (goalToEdit?.id) {
        formData.append('goalId', goalToEdit.id);
      }

      const response = await fetch('/api/goals/upload-icon', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload icon');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, iconUrl: data.iconUrl }));
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('Не вдалося завантажити іконку. Спробуйте ще раз.');
    } finally {
      setUploadingIcon(false);
    }
  };

  // Fetch logo from URL
  const handleFetchLogo = async () => {
    if (!formData.url) return;

    setFetchingLogo(true);
    try {
      const response = await fetch('/api/goals/fetch-logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: formData.url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logo');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, iconUrl: data.iconUrl }));
    } catch (error) {
      console.error('Error fetching logo:', error);
      alert('Не вдалося витягнути логотип. Спробуйте завантажити іконку вручну.');
    } finally {
      setFetchingLogo(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Якщо це постійна ціль, статус автоматично ongoing
    const goalStatus = formData.isOngoing ? GoalStatus.ONGOING : formData.status;

    if (isEditMode && goalToEdit) {
      // Update existing goal
      const updatedGoal = await updateGoal(goalToEdit.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: goalStatus,
        timeAllocated: formData.timeAllocated,
        paymentType: formData.paymentType || undefined,
        currency: formData.currency || undefined,
        hourlyRate: formData.hourlyRate > 0 ? formData.hourlyRate : undefined,
        fixedRate: formData.fixedRate > 0 ? formData.fixedRate : undefined,
        fixedRatePeriod: formData.fixedRatePeriod || undefined,
        startDate: formData.isOngoing || !formData.startDate ? undefined : new Date(formData.startDate),
        targetEndDate: formData.isOngoing || !formData.targetEndDate ? undefined : new Date(formData.targetEndDate),
        progressPercentage: formData.progressPercentage,
        url: formData.url,
        iconUrl: formData.iconUrl,
        color: formData.color || undefined,
        isOngoing: formData.isOngoing,
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
        status: goalStatus,
        timeAllocated: formData.timeAllocated,
        paymentType: formData.paymentType || undefined,
        currency: formData.currency || undefined,
        hourlyRate: formData.hourlyRate > 0 ? formData.hourlyRate : undefined,
        fixedRate: formData.fixedRate > 0 ? formData.fixedRate : undefined,
        fixedRatePeriod: formData.fixedRatePeriod || undefined,
        startDate: formData.isOngoing || !formData.startDate ? undefined : new Date(formData.startDate),
        targetEndDate: formData.isOngoing || !formData.targetEndDate ? undefined : new Date(formData.targetEndDate),
        progressPercentage: formData.progressPercentage,
        tags: [],
        url: formData.url,
        iconUrl: formData.iconUrl,
        color: formData.color || undefined,
        isOngoing: formData.isOngoing,
        displayOrder: 0, // Will be set automatically on server
      });
    }

    onClose();
  };

  // Calculate total time allocated from all goals
  const currentTotal = goals.reduce((sum, goal) => {
    // Don't count the goal being edited
    if (isEditMode && goalToEdit && goal.id === goalToEdit.id) {
      return sum;
    }
    return sum + goal.timeAllocated;
  }, 0);

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
          <DialogDescription>
            {isEditMode ? 'Оновіть інформацію про вашу ціль' : 'Додайте нову ціль до свого плану життя'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Загальні</TabsTrigger>
            <TabsTrigger value="style">Стилізація</TabsTrigger>
            <TabsTrigger value="income">Доходи</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <TabsContent value="general" className="space-y-6 mt-0">
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

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url">Посилання на проект</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <Button
                    type="button"
                    onClick={handleFetchLogo}
                    disabled={!formData.url || fetchingLogo}
                    variant="outline"
                    size="icon"
                    title="Витягнути логотип з посилання"
                  >
                    {fetchingLogo ? (
                      <Loader size="sm" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Ongoing Goal Toggle */}
              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50">
                <Checkbox
                  id="isOngoing"
                  checked={formData.isOngoing}
                  onCheckedChange={(checked) => setFormData({ ...formData, isOngoing: checked === true })}
                />
                <Label htmlFor="isOngoing" className="cursor-pointer flex-1">
                  <div>
                    <p className="font-medium">Постійна ціль</p>
                    <p className="text-xs text-muted-foreground">
                      Ціль без дедлайнів (наприклад: здоровий спосіб життя, щоденні тренування)
                    </p>
                  </div>
                </Label>
              </div>

              {/* Dates - показуємо тільки якщо не постійна ціль */}
              {!formData.isOngoing && (
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
              )}
            </TabsContent>

            <TabsContent value="style" className="space-y-6 mt-0">
              {/* Color Picker */}
              <div className="space-y-2">
                <Label htmlFor="color">Колір цілі</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="color"
                    type="color"
                    value={formData.color || getCategoryMeta(formData.category).color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 rounded border border-border cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      {formData.color ? 'Власний колір' : 'Колір категорії (дефолтний)'}
                    </p>
                    {formData.color && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setFormData({ ...formData, color: '' })}
                        className="h-auto p-0 text-xs"
                      >
                        Скинути на дефолтний
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Icon Picker */}
              <IconPicker
                category={formData.category}
                selectedIconUrl={formData.iconUrl}
                color={formData.color || getCategoryMeta(formData.category).color}
                onIconSelect={(iconUrl) => setFormData({ ...formData, iconUrl })}
                onFileUpload={(file) => {
                  setUploadingIcon(true);
                  const formDataUpload = new FormData();
                  formDataUpload.append('file', file);
                  if (goalToEdit?.id) {
                    formDataUpload.append('goalId', goalToEdit.id);
                  }

                  fetch('/api/goals/upload-icon', {
                    method: 'POST',
                    body: formDataUpload,
                  })
                    .then((res) => res.json())
                    .then((data) => setFormData({ ...formData, iconUrl: data.iconUrl }))
                    .catch((error) => {
                      console.error('Error uploading icon:', error);
                      alert('Не вдалося завантажити іконку');
                    })
                    .finally(() => setUploadingIcon(false));
                }}
                uploadingIcon={uploadingIcon}
              />
            </TabsContent>

            <TabsContent value="income" className="space-y-6 mt-0">
              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="paymentType">Тип оплати</Label>
                <select
                  id="paymentType"
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as 'hourly' | 'fixed' | '' })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Не вказано</option>
                  <option value="hourly">По годину</option>
                  <option value="fixed">Фіксована ставка</option>
                </select>
              </div>

              {formData.paymentType && (
                <>
                  {/* Currency */}
                  <div className="space-y-2">
                    <Label htmlFor="currency">
                      Валюта <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="currency"
                      required
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Оберіть валюту</option>
                      <option value="UAH">UAH (₴)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="PLN">PLN (zł)</option>
                    </select>
                  </div>

                  {formData.paymentType === 'hourly' && (
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">
                        Заробіток за годину <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                      {formData.currency && formData.hourlyRate > 0 && formData.timeAllocated > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ~{(formData.hourlyRate * formData.timeAllocated * 4).toFixed(2)} {formData.currency} на місяць
                        </p>
                      )}
                    </div>
                  )}

                  {formData.paymentType === 'fixed' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fixedRate">
                            Ставка <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="fixedRate"
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.fixedRate}
                            onChange={(e) => setFormData({ ...formData, fixedRate: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fixedRatePeriod">
                            Період <span className="text-destructive">*</span>
                          </Label>
                          <select
                            id="fixedRatePeriod"
                            required
                            value={formData.fixedRatePeriod}
                            onChange={(e) => setFormData({ ...formData, fixedRatePeriod: e.target.value as 'week' | 'month' })}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="week">На тиждень</option>
                            <option value="month">На місяць</option>
                          </select>
                        </div>
                      </div>

                      {formData.currency && formData.fixedRate > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formData.fixedRatePeriod === 'week'
                            ? `~${(formData.fixedRate * 4).toFixed(2)} ${formData.currency} на місяць`
                            : `~${(formData.fixedRate / 4).toFixed(2)} ${formData.currency} на тиждень`
                          }
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </TabsContent>

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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
