'use client';

import { useGoals } from '@/contexts/GoalsContext';
import GoalCard from './GoalCard';
import { Target } from 'lucide-react';

export default function GoalsList() {
  const { getFilteredGoals } = useGoals();
  const goals = getFilteredGoals();

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
          Почніть з додавання вашої першої цілі
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}
