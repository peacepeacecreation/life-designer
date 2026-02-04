'use client'

import { useEffect, useState, useCallback } from 'react'
import { BlockNoteEditor, PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import '@blocknote/mantine/style.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface PromptNoteEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canvasId: string
  nodeId: string
  promptId: string
  promptText: string
}

export default function PromptNoteEditor({
  open,
  onOpenChange,
  canvasId,
  nodeId,
  promptId,
  promptText,
}: PromptNoteEditorProps) {
  const [initialContent, setInitialContent] = useState<PartialBlock[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Create editor instance
  const editor = useCreateBlockNote({
    initialContent,
  })

  // Load existing note when dialog opens
  useEffect(() => {
    if (open && canvasId && nodeId && promptId) {
      loadNote()
    }
  }, [open, canvasId, nodeId, promptId])

  const loadNote = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        canvas_id: canvasId,
        node_id: nodeId,
        prompt_id: promptId,
      })

      const response = await fetch(`/api/canvas/notes?${params}`)
      const data = await response.json()

      if (data.note && data.note.content) {
        setInitialContent(data.note.content)
        // Update editor content if it exists
        if (editor) {
          editor.replaceBlocks(editor.document, data.note.content)
        }
      } else {
        // New note - start with empty content
        setInitialContent(undefined)
      }
    } catch (error) {
      console.error('Error loading note:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveNote = useCallback(async (content: PartialBlock[]) => {
    if (!canvasId || !nodeId || !promptId) return

    setIsSaving(true)
    try {
      await fetch('/api/canvas/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_id: canvasId,
          node_id: nodeId,
          prompt_id: promptId,
          content,
        }),
      })
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setIsSaving(false)
    }
  }, [canvasId, nodeId, promptId])

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!editor || !open) return

    let timeoutId: NodeJS.Timeout

    const handleChange = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const content = editor.document
        saveNote(content)
      }, 1000) // 1 second debounce
    }

    // Subscribe to editor changes
    const unsubscribe = editor.onChange(handleChange)

    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [editor, open, saveNote])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>📝 Нотатка</span>
            {isSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Збереження...
              </span>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {promptText.substring(0, 60)}
            {promptText.length > 60 ? '...' : ''}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <BlockNoteView
              editor={editor}
              theme="light"
            />
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Зміни автоматично зберігаються
        </div>
      </DialogContent>
    </Dialog>
  )
}
