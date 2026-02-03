'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Edit2, Trash2, Users, Eye } from 'lucide-react'
import { useConfirm } from '@/hooks/use-confirm'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Canvas {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_modified_at: string
  is_owner?: boolean
  permission?: 'view' | 'edit'
}

interface CanvasSelectorProps {
  currentCanvasId?: string
  currentCanvasTitle: string
  onCanvasChange: (canvasId: string) => void
  onCanvasCreate: () => void
  onCanvasRename: (canvasId: string, newTitle: string) => void
  onCanvasDelete: (canvasId: string) => void
}

export default function CanvasSelector({
  currentCanvasId,
  currentCanvasTitle,
  onCanvasChange,
  onCanvasCreate,
  onCanvasRename,
  onCanvasDelete,
}: CanvasSelectorProps) {
  const [canvases, setCanvases] = useState<Canvas[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameCanvasId, setRenameCanvasId] = useState<string>('')
  const [renameValue, setRenameValue] = useState('')
  const confirm = useConfirm()

  // Завантажити список canvas
  const loadCanvases = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/canvas')
      if (response.ok) {
        const data = await response.json()
        setCanvases(data.canvases || [])
      }
    } catch (error) {
      console.error('Error loading canvases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCanvases()
  }, [])

  const handleRename = (canvas: Canvas) => {
    setRenameCanvasId(canvas.id)
    setRenameValue(canvas.title)
    setShowRenameDialog(true)
  }

  const submitRename = async () => {
    if (!renameValue.trim()) return

    await onCanvasRename(renameCanvasId, renameValue)
    setShowRenameDialog(false)
    loadCanvases()
  }

  const handleDelete = async (canvas: Canvas) => {
    const confirmed = await confirm({
      title: 'Видалити canvas',
      description: `Ви впевнені, що хочете видалити canvas "${canvas.title}"?`,
      confirmText: 'Видалити',
      variant: 'destructive',
    })

    if (confirmed) {
      await onCanvasDelete(canvas.id)
      loadCanvases()
    }
  }

  const handleCreateNew = () => {
    onCanvasCreate()
    loadCanvases()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-md hover:bg-accent transition-colors text-sm">
            <span className="font-medium">{currentCanvasTitle}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {isLoading ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Завантаження...
            </div>
          ) : canvases.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Немає canvas
            </div>
          ) : (
            <>
              {/* Мої Canvas */}
              {canvases.filter(c => c.is_owner !== false).length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Мої Canvas
                  </div>
                  {canvases.filter(c => c.is_owner !== false).map((canvas) => (
                    <div
                      key={canvas.id}
                      className="group flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm"
                    >
                      <button
                        onClick={() => onCanvasChange(canvas.id)}
                        className="flex-1 text-left text-sm"
                      >
                        {canvas.title}
                        {canvas.id === currentCanvasId && (
                          <span className="ml-2 text-xs text-primary">●</span>
                        )}
                      </button>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRename(canvas)
                          }}
                          className="p-1 hover:bg-background rounded"
                          title="Перейменувати"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(canvas)
                          }}
                          className="p-1 hover:bg-destructive/10 text-destructive rounded"
                          title="Видалити"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Shared Canvas */}
              {canvases.filter(c => c.is_owner === false).length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Поділилися зі мною
                  </div>
                  {canvases.filter(c => c.is_owner === false).map((canvas) => (
                    <div
                      key={canvas.id}
                      className="group flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm"
                    >
                      <button
                        onClick={() => onCanvasChange(canvas.id)}
                        className="flex-1 text-left text-sm flex items-center gap-2"
                      >
                        <span>{canvas.title}</span>
                        {canvas.permission === 'view' && (
                          <span title="Тільки перегляд">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </span>
                        )}
                        {canvas.id === currentCanvasId && (
                          <span className="ml-auto text-xs text-primary">●</span>
                        )}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Створити новий Canvas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Діалог перейменування */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перейменувати Canvas</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Назва Canvas"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Скасувати
            </Button>
            <Button onClick={submitRename}>
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
