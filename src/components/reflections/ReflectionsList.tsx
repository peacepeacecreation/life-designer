'use client';

import { useState } from 'react';
import { Loader } from '@/components/ui/loader';
import { useReflections } from '@/contexts/ReflectionsContext';
import { Reflection, ReflectionType } from '@/types/reflections';
import ReflectionCard from './ReflectionCard';
import ReflectionForm from './ReflectionForm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb } from 'lucide-react';

export default function ReflectionsList() {
  const { reflections, isLoading, error, getFilteredReflections, filters, setFilters } = useReflections();
  const [selectedReflection, setSelectedReflection] = useState<Reflection | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleEdit = (reflection: Reflection) => {
    setSelectedReflection(reflection);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedReflection(undefined);
  };

  const filteredReflections = getFilteredReflections();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Помилка завантаження роздумів</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6">
        <Tabs
          value={filters.type || 'all'}
          onValueChange={(value) => setFilters({ type: value === 'all' ? null : value as ReflectionType })}
        >
          <TabsList>
            <TabsTrigger value="all">Всі</TabsTrigger>
            <TabsTrigger value={ReflectionType.DAILY}>Щоденні</TabsTrigger>
            <TabsTrigger value={ReflectionType.WEEKLY}>Тижневі</TabsTrigger>
            <TabsTrigger value={ReflectionType.MONTHLY}>Місячні</TabsTrigger>
            <TabsTrigger value={ReflectionType.QUARTERLY}>Квартальні</TabsTrigger>
            <TabsTrigger value={ReflectionType.YEARLY}>Річні</TabsTrigger>
            <TabsTrigger value={ReflectionType.CUSTOM}>Довільні</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Reflections Grid */}
      {filteredReflections.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            Немає роздумів
          </h3>
          <p className="text-muted-foreground mb-6">
            Створіть ваш перший роздум для самоаналізу
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReflections.map((reflection) => (
            <ReflectionCard
              key={reflection.id}
              reflection={reflection}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Reflection Form Modal */}
      <ReflectionForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        reflectionToEdit={selectedReflection}
      />
    </>
  );
}
