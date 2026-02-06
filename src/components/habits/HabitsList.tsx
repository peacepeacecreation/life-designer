'use client';

import { useHabits } from '@/contexts/HabitsContext';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import HabitCard from './HabitCard';
import { Button } from '@/components/ui/button';
import { Filter, Search } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  HabitFrequencyType,
  HabitTrackingType,
  frequencyTypeLabels,
  trackingTypeLabels,
} from '@/types/habits';
import { GoalCategory } from '@/types/goals';
import { getCategoryMeta } from '@/lib/categoryConfig';

export default function HabitsList() {
  const { habits, loading, filters, setFilters } = useHabits();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter habits by search query
  const filteredHabits = habits.filter((habit) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      habit.name.toLowerCase().includes(query) ||
      habit.description?.toLowerCase().includes(query)
    );
  });

  // Group habits by category
  const groupedHabits = filteredHabits.reduce((acc, habit) => {
    const category = habit.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(habit);
    return acc;
  }, {} as Record<string, typeof habits>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Всі звички</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Всі звички ({habits.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фільтри
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Пошук звичок..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {/* Category Filter */}
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) =>
                setFilters({
                  category: value === 'all' ? null : (value as GoalCategory),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Категорія" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі категорії</SelectItem>
                <SelectItem value={GoalCategory.WORK_STARTUPS}>
                  {getCategoryMeta(GoalCategory.WORK_STARTUPS).name}
                </SelectItem>
                <SelectItem value={GoalCategory.LEARNING}>
                  {getCategoryMeta(GoalCategory.LEARNING).name}
                </SelectItem>
                <SelectItem value={GoalCategory.HEALTH_SPORTS}>
                  {getCategoryMeta(GoalCategory.HEALTH_SPORTS).name}
                </SelectItem>
                <SelectItem value={GoalCategory.HOBBIES}>
                  {getCategoryMeta(GoalCategory.HOBBIES).name}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Frequency Filter */}
            <Select
              value={filters.frequencyType || 'all'}
              onValueChange={(value) =>
                setFilters({
                  frequencyType:
                    value === 'all' ? null : (value as HabitFrequencyType),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Частота" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі частоти</SelectItem>
                <SelectItem value={HabitFrequencyType.DAILY}>
                  {frequencyTypeLabels[HabitFrequencyType.DAILY]}
                </SelectItem>
                <SelectItem value={HabitFrequencyType.WEEKLY}>
                  {frequencyTypeLabels[HabitFrequencyType.WEEKLY]}
                </SelectItem>
                <SelectItem value={HabitFrequencyType.MONTHLY}>
                  {frequencyTypeLabels[HabitFrequencyType.MONTHLY]}
                </SelectItem>
                <SelectItem value={HabitFrequencyType.INTERVAL}>
                  {frequencyTypeLabels[HabitFrequencyType.INTERVAL]}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Tracking Type Filter */}
            <Select
              value={filters.trackingType || 'all'}
              onValueChange={(value) =>
                setFilters({
                  trackingType:
                    value === 'all' ? null : (value as HabitTrackingType),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Тип відстеження" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі типи</SelectItem>
                <SelectItem value={HabitTrackingType.BOOLEAN}>
                  {trackingTypeLabels[HabitTrackingType.BOOLEAN]}
                </SelectItem>
                <SelectItem value={HabitTrackingType.NUMERIC}>
                  {trackingTypeLabels[HabitTrackingType.NUMERIC]}
                </SelectItem>
                <SelectItem value={HabitTrackingType.DURATION}>
                  {trackingTypeLabels[HabitTrackingType.DURATION]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredHabits.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>
              {searchQuery
                ? 'Звичок не знайдено за вашим запитом'
                : 'Немає звичок для відображення'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group by category */}
            {Object.entries(groupedHabits).map(([category, categoryHabits]) => (
              <div key={category}>
                {/* Category Header */}
                {category !== 'uncategorized' && (
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {getCategoryMeta(category as GoalCategory).name}
                  </h3>
                )}

                {/* Habits Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {categoryHabits.map((habit) => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
