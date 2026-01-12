import { Metadata } from 'next';
import { Settings as SettingsIcon } from 'lucide-react';
import SettingsTabs from '@/components/settings/SettingsTabs';

export const metadata: Metadata = {
  title: 'Налаштування | Life Designer',
  description: 'Керуйте налаштуваннями вашої платформи',
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Налаштування</h1>
          </div>
          <p className="text-muted-foreground">
            Керуйте глобальними налаштуваннями платформи, профілем та інтеграціями
          </p>
        </div>

        <SettingsTabs />
      </div>
    </main>
  );
}
