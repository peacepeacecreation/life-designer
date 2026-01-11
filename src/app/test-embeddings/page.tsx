'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function TestEmbeddingsPage() {
  const [text, setText] = useState('Hello from OpenRouter!');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testEmbeddings = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Цей ендпоінт треба створити для тесту
      const response = await fetch('/api/test-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="bg-white dark:bg-card">
        <CardHeader>
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Test Embeddings API
          </h1>
          <p className="text-muted-foreground">
            Перевірка підключення до OpenRouter/OpenAI
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-black dark:text-white">
              Текст для embedding:
            </label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введіть текст..."
            />
          </div>

          <Button onClick={testEmbeddings} disabled={loading || !text}>
            {loading ? 'Генерація...' : 'Тестувати Embeddings'}
          </Button>

          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 font-semibold">
                Помилка:
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                {error}
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-semibold">
                  ✅ Успішно!
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Провайдер:</span>
                  <span className={result.provider === 'openrouter' ? 'text-green-600 dark:text-green-400 font-bold' : ''}>
                    {result.provider === 'openrouter' ? '🎉 OpenRouter' : 'OpenAI Direct'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Модель:</span>
                  <span>{result.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Розмір вектора:</span>
                  <span>{result.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Токенів:</span>
                  <span>{result.tokens}</span>
                </div>
              </div>

              <details className="p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer font-medium mb-2">
                  Показати перші 10 значень вектора
                </summary>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(result.embedding.slice(0, 10), null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
