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
import { Loader2, MoreVertical, Link as LinkIcon, Plus, X } from 'lucide-react'

interface PromptNoteEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canvasId: string
  nodeId: string
  promptId: string
  promptText: string
  onNoteSaved?: () => void
}

export default function PromptNoteEditor({
  open,
  onOpenChange,
  canvasId,
  nodeId,
  promptId,
  promptText,
  onNoteSaved,
}: PromptNoteEditorProps) {
  const [initialContent, setInitialContent] = useState<PartialBlock[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [links, setLinks] = useState<string[]>([])
  const [newLink, setNewLink] = useState('')

  // Create editor instance
  const editor = useCreateBlockNote({
    initialContent,
  })

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
        setLinks(data.note.links || [])
        // Update editor content if it exists
        if (editor) {
          editor.replaceBlocks(editor.document, data.note.content)
        }
      } else {
        // New note - start with empty content
        setInitialContent(undefined)
        setLinks([])
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
          links,
        }),
      })
      // Notify parent that note was saved
      if (onNoteSaved) {
        onNoteSaved()
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setIsSaving(false)
    }
  }, [canvasId, nodeId, promptId, links, onNoteSaved])

  // Load existing note when dialog opens
  useEffect(() => {
    if (open && canvasId && nodeId && promptId) {
      loadNote()
    }
  }, [open, canvasId, nodeId, promptId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save empty note on first open to create record
  useEffect(() => {
    if (open && editor && !isLoading && initialContent === undefined) {
      // Create empty note immediately
      saveNote([])
    }
  }, [open, editor, isLoading, initialContent, saveNote])

  // Save links when they change
  useEffect(() => {
    if (open && editor && !isLoading && initialContent !== undefined) {
      // Trigger save when links change
      const content = editor.document
      saveNote(content)
    }
  }, [links]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Auto-focus editor when dialog opens
  useEffect(() => {
    if (open && editor && !isLoading) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        editor.focus()
      }, 100)
    }
  }, [open, editor, isLoading])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-full max-h-[90vh] h-[90vh] flex flex-col bg-white">
        <DialogHeader className="mx-6 pt-2 pb-6 border-b border-dashed !border-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <DialogTitle className="text-2xl font-bold uppercase my-2">
                {promptText}
              </DialogTitle>
              {links.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      <LinkIcon className="h-3 w-3" />
                      {new URL(link).hostname}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Збереження...
                </span>
              )}
              <button
                onClick={() => setShowMetadata(true)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Метадата"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="px-16 py-6 bg-white">
              <BlockNoteView
                editor={editor}
                theme="light"
              />
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pb-2">
          Зміни автоматично зберігаються
        </div>
      </DialogContent>

      {/* Metadata Dialog */}
      <Dialog open={showMetadata} onOpenChange={setShowMetadata}>
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle>Метадата нотатки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Посилання</label>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                    <LinkIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline flex-1 truncate"
                    >
                      {link}
                    </a>
                    <button
                      onClick={() => setLinks(links.filter((_, i) => i !== index))}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLink.trim()) {
                        e.preventDefault()
                        setLinks([...links, newLink.trim()])
                        setNewLink('')
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newLink.trim()) {
                        setLinks([...links, newLink.trim()])
                        setNewLink('')
                      }
                    }}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm hover:opacity-90 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Додати
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
