/**
 * Icon Picker Component
 * Allows users to select from predefined icons or upload custom image
 */

'use client';

import { useState } from 'react';
import { GoalCategory } from '@/types';
import { goalIcons, getIconsByCategory, getIconById, isPredefinedIcon } from '@/lib/goalIcons';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  category: GoalCategory;
  selectedIconUrl: string;
  color: string; // Hex color for icon styling
  onIconSelect: (iconUrl: string) => void;
  onFileUpload: (file: File) => void;
  uploadingIcon?: boolean;
}

export function IconPicker({
  category,
  selectedIconUrl,
  color,
  onIconSelect,
  onFileUpload,
  uploadingIcon = false,
}: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined');
  const categoryIcons = getIconsByCategory(category);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const isCustomIcon = selectedIconUrl && !isPredefinedIcon(selectedIconUrl);
  const selectedPredefinedIcon = isPredefinedIcon(selectedIconUrl)
    ? getIconById(selectedIconUrl)
    : null;

  return (
    <div className="space-y-4">
      <Label>Іконка цілі</Label>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('predefined')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'predefined'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Готові іконки
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'custom'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Власна іконка
        </button>
      </div>

      {/* Predefined Icons Grid */}
      {activeTab === 'predefined' && (
        <div className="grid grid-cols-5 gap-3">
          {categoryIcons.map((iconOption) => {
            const Icon = iconOption.Icon;
            const isSelected = selectedIconUrl === iconOption.id;

            return (
              <button
                key={iconOption.id}
                type="button"
                onClick={() => onIconSelect(iconOption.id)}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:scale-105',
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
                title={iconOption.name}
              >
                <Icon
                  className="h-6 w-6 mb-1"
                  style={{ color: isSelected ? color : 'currentColor' }}
                />
                <span className="text-xs text-muted-foreground truncate w-full text-center">
                  {iconOption.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Icon Upload */}
      {activeTab === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {/* Preview */}
            {isCustomIcon && (
              <div className="w-16 h-16 border-2 border-border rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={selectedIconUrl}
                  alt="Custom icon"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Upload Button */}
            <label
              htmlFor="icon-upload"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                uploadingIcon
                  ? 'border-muted-foreground/30 bg-muted/50 cursor-wait'
                  : 'border-border hover:border-primary hover:bg-primary/5'
              )}
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">
                {uploadingIcon ? 'Завантаження...' : isCustomIcon ? 'Замінити іконку' : 'Завантажити іконку'}
              </span>
              <input
                id="icon-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleFileChange}
                disabled={uploadingIcon}
                className="hidden"
              />
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Підтримуються формати: PNG, JPG, SVG, WebP. Максимальний розмір: 2MB.
          </p>
        </div>
      )}

      {/* Current Selection Preview */}
      {selectedIconUrl && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg border">
            {selectedPredefinedIcon ? (
              <selectedPredefinedIcon.Icon className="h-5 w-5" style={{ color }} />
            ) : isCustomIcon ? (
              <img src={selectedIconUrl} alt="Selected" className="w-full h-full object-contain" />
            ) : null}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {selectedPredefinedIcon ? selectedPredefinedIcon.name : 'Власна іконка'}
            </p>
            <p className="text-xs text-muted-foreground">Обрана іконка</p>
          </div>
          {selectedIconUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onIconSelect('')}
            >
              Очистити
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
