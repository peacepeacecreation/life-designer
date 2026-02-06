'use client';

import { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Download } from 'lucide-react';
import { getCanvasBackups, CanvasBackup } from '@/lib/canvas/local-backup';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface RestoreBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasId: string;
  onRestore: (nodes: Node[], edges: Edge[]) => void;
}

export function RestoreBackupDialog({
  open,
  onOpenChange,
  canvasId,
  onRestore,
}: RestoreBackupDialogProps) {
  const [backups, setBackups] = useState<CanvasBackup[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<CanvasBackup | null>(null);

  useEffect(() => {
    if (open && canvasId) {
      const allBackups = getCanvasBackups(canvasId);
      // Sort by version descending (newest first)
      setBackups(allBackups.sort((a, b) => b.version - a.version));
    }
  }, [open, canvasId]);

  const handleRestore = () => {
    if (selectedBackup) {
      onRestore(selectedBackup.nodes, selectedBackup.edges);
      onOpenChange(false);
    }
  };

  const downloadBackup = (backup: CanvasBackup) => {
    const dataStr = JSON.stringify({
      nodes: backup.nodes,
      edges: backup.edges,
      title: backup.title,
    }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-backup-v${backup.version}-${backup.timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Відновлення з локального бекапу
          </DialogTitle>
          <DialogDescription>
            Виберіть версію для відновлення. Локальні бекапи зберігаються автоматично при кожному збереженні.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Немає доступних локальних бекапів
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Бекапи створюються автоматично при збереженні canvas
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {backups.map((backup, index) => {
                const timestamp = new Date(backup.timestamp);
                const isSelected = selectedBackup?.timestamp === backup.timestamp;

                return (
                  <div
                    key={backup.timestamp}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedBackup(backup)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            Версія {backup.version}
                          </span>
                          {backup.version === backups[0].version && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Остання
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(timestamp, 'dd MMM yyyy, HH:mm:ss', { locale: uk })}
                          </div>
                          <div>
                            Блоків: {backup.nodes.length} • З'єднань: {backup.edges.length}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadBackup(backup);
                        }}
                        className="ml-2"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button
            onClick={handleRestore}
            disabled={!selectedBackup}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Відновити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
