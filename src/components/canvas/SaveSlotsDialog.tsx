'use client';

import { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Check, Download, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface SaveSlot {
  id: string;
  canvas_id: string;
  slot_number: number;
  slot_name: string | null;
  nodes: Node[];
  edges: Edge[];
  last_modified_at: string;
}

interface SaveSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasId: string;
  currentNodes: Node[];
  currentEdges: Edge[];
  currentSlotNumber: number | null; // Which slot is currently active
  onLoadSlot: (slotNumber: number, nodes: Node[], edges: Edge[]) => void;
}

export function SaveSlotsDialog({
  open,
  onOpenChange,
  canvasId,
  currentNodes,
  currentEdges,
  currentSlotNumber,
  onLoadSlot,
}: SaveSlotsDialogProps) {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingToSlot, setSavingToSlot] = useState<number | null>(null);
  const [editingSlotName, setEditingSlotName] = useState<number | null>(null);
  const [slotNameInput, setSlotNameInput] = useState('');
  const { toast } = useToast();

  // Load slots when dialog opens
  useEffect(() => {
    if (open && canvasId) {
      loadSlots();
    }
  }, [open, canvasId]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/canvas/slots?canvasId=${canvasId}`);
      if (!response.ok) throw new Error('Failed to load slots');

      const data = await response.json();
      setSlots(data.slots || []);
    } catch (error) {
      console.error('Error loading slots:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося завантажити слоти',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveToSlot = async (slotNumber: number, slotName?: string) => {
    setSavingToSlot(slotNumber);
    try {
      const response = await fetch('/api/canvas/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasId,
          slotNumber,
          nodes: currentNodes,
          edges: currentEdges,
          slotName: slotName || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save slot');

      await loadSlots(); // Reload slots

      toast({
        title: '✅ Збережено',
        description: `Збережено в Slot ${slotNumber}${slotName ? ` (${slotName})` : ''}`,
      });
    } catch (error) {
      console.error('Error saving slot:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося зберегти слот',
        variant: 'destructive',
      });
    } finally {
      setSavingToSlot(null);
    }
  };

  const loadSlotData = (slot: SaveSlot) => {
    onLoadSlot(slot.slot_number, slot.nodes, slot.edges);
    toast({
      title: '📂 Завантажено',
      description: `Завантажено Slot ${slot.slot_number}${slot.slot_name ? ` (${slot.slot_name})` : ''}`,
    });
    onOpenChange(false);
  };

  const deleteSlot = async (slotId: string, slotNumber: number) => {
    if (slotNumber === currentSlotNumber) {
      toast({
        title: 'Неможливо видалити',
        description: 'Не можна видалити активний слот',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/canvas/slots?slotId=${slotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete slot');

      await loadSlots();
      toast({
        title: '🗑️ Видалено',
        description: `Slot ${slotNumber} видалено`,
      });
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося видалити слот',
        variant: 'destructive',
      });
    }
  };

  const getSlotByNumber = (slotNumber: number): SaveSlot | undefined => {
    return slots.find(s => s.slot_number === slotNumber);
  };

  const renderSlotButton = (slotNumber: number) => {
    const slot = getSlotByNumber(slotNumber);
    const isCurrentSlot = slotNumber === currentSlotNumber;
    const isEmpty = !slot;
    const isSaving = savingToSlot === slotNumber;

    return (
      <div
        key={slotNumber}
        className={`border rounded-lg p-4 ${
          isCurrentSlot
            ? 'border-primary bg-primary/5'
            : 'border-border'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                Slot {slotNumber}
                {isCurrentSlot && <Check className="inline h-4 w-4 ml-1 text-primary" />}
              </span>
              {slot?.slot_name && (
                <span className="text-sm text-muted-foreground">
                  - {slot.slot_name}
                </span>
              )}
            </div>
            {slot && (
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(slot.last_modified_at), 'dd MMM yyyy, HH:mm', { locale: uk })}
                <span className="mx-2">•</span>
                {slot.nodes.length} блоків
              </div>
            )}
            {isEmpty && (
              <div className="text-xs text-muted-foreground mt-1">
                Порожній слот
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {isCurrentSlot ? (
            <Button
              size="sm"
              onClick={() => saveToSlot(slotNumber)}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? 'Збереження...' : 'Зберегти тут'}
            </Button>
          ) : isEmpty ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveToSlot(slotNumber)}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? 'Збереження...' : 'Зберегти в цей слот'}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadSlotData(slot!)}
                className="flex-1"
              >
                <Download className="h-3 w-3 mr-1" />
                Завантажити
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteSlot(slot!.id, slotNumber)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>💾 Save Slots</DialogTitle>
          <DialogDescription>
            Зберігай різні версії canvas в окремі слоти. Кожен слот має свою історію autosave.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Завантаження...
            </div>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((slotNumber) => renderSlotButton(slotNumber))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          💡 Підказка: Autosave працює окремо для кожного слоту. Перемикайтесь між слотами щоб працювати над різними версіями.
        </div>
      </DialogContent>
    </Dialog>
  );
}
