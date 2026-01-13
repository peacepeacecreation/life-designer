'use client';

import { useState, useEffect } from 'react';
import { useGoals } from '@/contexts/GoalsContext';
import GoalCard from './GoalCard';
import { Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSeedGoals } from '@/utils/seedGoals';
import { LoadingInline } from '@/components/ui/loader';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Goal } from '@/types';

export default function GoalsList() {
  const { goals, addGoal, loading } = useGoals();
  const [sortedGoals, setSortedGoals] = useState(goals);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  // Sync with goals from context
  useEffect(() => {
    setSortedGoals(goals);
  }, [goals]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const goal = sortedGoals.find((g) => g.id === active.id);
    setActiveGoal(goal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortedGoals((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save order to database
        const goalOrders = newOrder.map((goal, index) => ({
          id: goal.id,
          displayOrder: index + 1,
        }));

        fetch('/api/goals/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalOrders }),
        }).catch((error) => {
          console.error('Failed to save goal order:', error);
        });

        return newOrder;
      });
    }

    setActiveGoal(null);
  };

  const handleDragCancel = () => {
    setActiveGoal(null);
  };

  if (loading) {
    return <LoadingInline message="Завантаження цілей..." />;
  }

  const handleLoadExamples = () => {
    const seedGoals = getSeedGoals();
    seedGoals.forEach(goal => addGoal(goal));
  };

  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <div className="p-6 bg-primary/10 rounded-full">
            <Target className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">Немає цілей</h3>
        <p className="text-muted-foreground mb-6">
          Почніть з додавання вашої першої цілі або завантажте приклади
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={handleLoadExamples} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Завантажити приклади
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={sortedGoals.map(g => g.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeGoal ? (
          <div className="opacity-60 rotate-3 scale-105">
            <GoalCard goal={activeGoal} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
