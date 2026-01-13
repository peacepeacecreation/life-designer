'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { LoadingInline } from '@/components/ui/loader';

export default function MigrateDBPage() {
  const [sql, setSql] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/migrate')
      .then(res => res.json())
      .then(data => {
        setSql(data.sql);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading SQL:', err);
        setLoading(false);
      });
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDashboard = () => {
    window.open('https://supabase.com/dashboard/project/gxzzkcthcdtmkdwfdrhv/sql/new', '_blank');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="max-w-4xl mx-auto">
          <LoadingInline message="Завантаження SQL міграції..." />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Міграція бази даних
          </h1>
          <p className="text-muted-foreground">
            Виконайте SQL міграцію для додавання полів payment_type, fixed_rate та fixed_rate_period
          </p>
        </div>

        <Card className="p-6 mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-background rounded-lg">
              <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Інструкції
              </h3>
              <ol className="space-y-2 text-sm text-card-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Натисніть кнопку "Копіювати SQL" нижче</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Натисніть "Відкрити SQL Editor" щоб перейти до Supabase Dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Вставте SQL в редактор (Ctrl+V або Cmd+V)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">4.</span>
                  <span>Натисніть "Run" (або Ctrl+Enter)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">5.</span>
                  <span>Поверніться на сторінку /goals та мігруйте цілі з localStorage</span>
                </li>
              </ol>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              SQL міграція
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Скопійовано!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Копіювати SQL
                  </>
                )}
              </Button>
              <Button
                onClick={handleOpenDashboard}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <ExternalLink className="h-4 w-4" />
                Відкрити SQL Editor
              </Button>
            </div>
          </div>

          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm text-foreground border border-border">
            {sql}
          </pre>
        </Card>

        <Card className="p-6 border-border bg-card dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold text-foreground mb-2">
            Що робить ця міграція?
          </h3>
          <ul className="space-y-2 text-sm text-card-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Додає поле <code className="px-1.5 py-0.5 bg-muted rounded">payment_type</code> для вибору типу оплати (погодинна або фіксована)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Додає поле <code className="px-1.5 py-0.5 bg-muted rounded">fixed_rate</code> для суми фіксованої оплати</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Додає поле <code className="px-1.5 py-0.5 bg-muted rounded">fixed_rate_period</code> для періоду фіксованої оплати (тиждень або місяць)</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
