'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Goal {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface StartTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTimerStarted: () => void;
}

export function StartTimerDialog({
  open,
  onOpenChange,
  onTimerStarted,
}: StartTimerDialogProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const { toast } = useToast();

  // Load goals
  useEffect(() => {
    if (open) {
      loadGoals();
    }
  }, [open]);

  const loadGoals = async () => {
    setLoadingGoals(true);
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error('Failed to load goals');
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося завантажити цілі',
        variant: 'destructive',
      });
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleStart = async () => {
    if (!selectedGoalId || !description.trim()) {
      toast({
        title: 'Помилка',
        description: 'Виберіть ціль та введіть опис',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/clockify/start-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: selectedGoalId,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start timer');
      }

      toast({
        title: 'Таймер запущено',
        description: description.trim(),
      });

      // Notify widget to update immediately
      window.dispatchEvent(new Event('clockify-timer-started'));

      // Reset form
      setSelectedGoalId('');
      setDescription('');
      onOpenChange(false);
      onTimerStarted();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      toast({
        title: 'Помилка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Запустити таймер</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Goal Selection */}
          <div className="space-y-2">
            <Label htmlFor="goal">Ціль</Label>
            {loadingGoals ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                <SelectTrigger id="goal">
                  <SelectValue placeholder="Виберіть ціль" />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: goal.color }}
                        />
                        <span>{goal.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({goal.category})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Опис задачі</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Що ви робите?"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleStart();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleStart} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Запуск...
              </>
            ) : (
              'Запустити'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
