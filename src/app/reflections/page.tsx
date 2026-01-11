'use client';

import { useState } from 'react';
import { ReflectionsList } from '@/components/reflections';
import ReflectionForm from '@/components/reflections/ReflectionForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Lightbulb } from 'lucide-react';

export default function ReflectionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Назад
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-black dark:text-white">Мої роздуми</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Щоденні, тижневі та місячні рефлексії для самоаналізу
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Додати роздум
        </Button>
      </div>

      {/* Reflections List */}
      <ReflectionsList />

      {/* Reflection Form Modal */}
      <ReflectionForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </main>
  );
}
