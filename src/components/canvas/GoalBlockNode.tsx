'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeProps, useReactFlow, Edge } from 'reactflow'
import { generatePromptId } from '@/lib/canvas/utils'
import { Settings, Trash2, Copy, FileText, Eye } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getIconById, isPredefinedIcon } from '@/lib/goalIcons'
import { useConfirm } from '@/hooks/use-confirm'
import PromptNoteEditor from '@/components/canvas/PromptNoteEditor'

interface PromptItem {
  id: string
  content: string
  completed?: boolean
}

interface GoalBlockData {
  title: string
  goal_id: string
  color: string
  icon: string
  category: string
  isGoalBlock: true
  prompts?: PromptItem[]
  isConnecting?: boolean
  onCopyNode?: () => void
  canvasId?: string
}

// Auto-resizing textarea component
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  rows = 1
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      if (!value.trim()) {
        textareaRef.current.style.height = 'auto'
      } else {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      }
    }
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="nodrag w-full px-2 text-sm bg-transparent resize-none overflow-hidden focus:outline-none transition-all"
      rows={rows}
    />
  )
}

function GoalBlockNode({ data, id }: NodeProps<GoalBlockData>) {
  const [prompts, setPrompts] = useState<PromptItem[]>(data.prompts || [])
  const [newPromptText, setNewPromptText] = useState('')
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [promptContextMenu, setPromptContextMenu] = useState<{ x: number; y: number; promptId: string; promptContent: string } | null>(null)
  const [noteEditorOpen, setNoteEditorOpen] = useState(false)
  const [selectedPromptForNote, setSelectedPromptForNote] = useState<{ id: string; content: string } | null>(null)
  const [promptNotes, setPromptNotes] = useState<Set<string>>(new Set())
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow()
  const confirm = useConfirm()

  // Динамічний z-index: коли тягнемо лінію - target в пріоритеті, інакше - source
  const isConnecting = data.isConnecting || false
  const sourceZIndex = isConnecting ? 10 : 100
  const targetZIndex = isConnecting ? 100 : 10

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handlePromptContextMenu = (e: React.MouseEvent, promptId: string, promptContent: string) => {
    e.preventDefault()
    e.stopPropagation()
    setPromptContextMenu({ x: e.clientX, y: e.clientY, promptId, promptContent })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Синхронізуємо зміни prompts з node data
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                prompts,
              },
            }
          : node
      )
    )
  }, [prompts, id, setNodes])

  // Check which prompts have notes
  useEffect(() => {
    if (!data.canvasId || prompts.length === 0) return

    const checkNotes = async () => {
      const notesSet = new Set<string>()

      for (const prompt of prompts) {
        try {
          const params = new URLSearchParams({
            canvas_id: data.canvasId!,
            node_id: id,
            prompt_id: prompt.id,
          })
          const response = await fetch(`/api/canvas/notes?${params}`)
          const result = await response.json()
          if (result.note) {
            notesSet.add(prompt.id)
          }
        } catch (error) {
          console.error('Error checking note:', error)
        }
      }

      setPromptNotes(notesSet)
    }

    checkNotes()
  }, [data.canvasId, id, prompts])

  const addPrompt = () => {
    if (newPromptText.trim()) {
      const newPrompt: PromptItem = {
        id: generatePromptId(),
        content: newPromptText.trim(),
      }
      setPrompts([...prompts, newPrompt])
      setNewPromptText('')
    }
  }

  const updatePrompt = (id: string, newContent: string) => {
    setPrompts(prompts.map((p) => (p.id === id ? { ...p, content: newContent } : p)))
  }

  const deletePrompt = async (id: string) => {
    const confirmed = await confirm({
      title: 'Видалити завдання',
      description: 'Ви впевнені, що хочете видалити це завдання?',
      confirmText: 'Видалити',
      variant: 'destructive',
    })

    if (confirmed) {
      setPrompts(prompts.filter((p) => p.id !== id))
    }
  }

  const toggleComplete = (id: string) => {
    setPrompts(prompts.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)))
  }

  const handleDeleteBlock = async () => {
    const confirmed = await confirm({
      title: 'Видалити блок цілі',
      description: 'Це видалить блок цілі та всі залежні від нього звичайні блоки. Продовжити?',
      confirmText: 'Видалити',
      variant: 'destructive',
    })

    if (confirmed) {
      // Отримуємо поточний стан ПЕРЕД будь-якими змінами
      const currentNodes = getNodes()
      const currentEdges = getEdges()

      // Функція для рекурсивного пошуку всіх з'єднаних звичайних блоків
      const findConnectedPromptBlocks = (nodeId: string, allEdges: Edge[], allNodes: any[], visited = new Set<string>()): Set<string> => {
        if (visited.has(nodeId)) return visited
        visited.add(nodeId)

        // Знаходимо всі edge де поточна нода є source (вихідні з'єднання)
        const outgoingEdges = allEdges.filter(edge => edge.source === nodeId)

        // Рекурсивно знаходимо всі з'єднані звичайні блоки
        outgoingEdges.forEach(edge => {
          const targetNode = allNodes.find(n => n.id === edge.target)
          // Тільки якщо це звичайний блок (не блок цілі)
          if (targetNode && targetNode.type === 'promptBlock') {
            findConnectedPromptBlocks(edge.target, allEdges, allNodes, visited)
          }
        })

        return visited
      }

      // Знаходимо всі звичайні блоки для видалення
      const nodesToDelete = findConnectedPromptBlocks(id, currentEdges, currentNodes)
      // Додаємо сам блок цілі до списку видалення
      nodesToDelete.add(id)

      // Видаляємо всі знайдені ноди одночасно
      setNodes(currentNodes.filter(node => !nodesToDelete.has(node.id)))

      // Видаляємо всі edge пов'язані з видаленими нодами одночасно
      setEdges(currentEdges.filter(
        edge => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
      ))

      setPopoverOpen(false)
    }
  }

  return (
    <div className="relative px-10" style={{ minWidth: '320px', maxWidth: '700px', overflow: 'visible' }}>
      {/* Тільки нижній handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
        style={{ bottom: -14, transformOrigin: 'center', zIndex: sourceZIndex }}
      />

      {/* Білий блок з контентом */}
      <div
        className="bg-white border-2 rounded-lg shadow-lg flex flex-col"
        style={{ borderColor: data.color, overflow: 'visible' }}
        onContextMenu={handleContextMenu}
      >
        {/* Header */}
        <div
          className="px-4 py-3 rounded-t-lg border-b-2 flex items-center gap-3"
          style={{
            backgroundColor: `${data.color}40`,
            borderColor: data.color
          }}
        >
          {/* Icon display - supports both predefined icons and custom images */}
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            {data.icon && isPredefinedIcon(data.icon) ? (
              (() => {
                const iconOption = getIconById(data.icon)
                if (iconOption) {
                  const IconComponent = iconOption.Icon
                  return <IconComponent className="w-8 h-8" style={{ color: data.color }} />
                }
                return null
              })()
            ) : data.icon ? (
              <img
                src={data.icon}
                alt={data.title}
                className="w-full h-full object-contain"
              />
            ) : null}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{data.title}</h2>
            <p className="text-xs text-muted-foreground">{data.category}</p>
          </div>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="nodrag p-1.5 hover:bg-black/10 rounded transition-colors"
                title="Налаштування"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="nodrag w-64">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Налаштування блоку цілі</h4>

                {/* Видалення блоку */}
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={handleDeleteBlock}
                    className="w-full px-3 py-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Видалити блок цілі
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Prompts list */}
        <div className="flex-1 min-h-0 divide-y divide-border">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="flex items-start gap-1.5 py-2 first:pt-1.5 last:pb-1.5 relative px-2"
            >
              {/* Чекбокс */}
              <button
                onClick={() => toggleComplete(prompt.id)}
                className={`nodrag mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all ${
                  prompt.completed
                    ? 'bg-primary border-primary'
                    : 'bg-white border-border hover:border-primary'
                }`}
                title={prompt.completed ? 'Позначити як не виконане' : 'Позначити як виконане'}
              >
                {prompt.completed && (
                  <svg
                    className="w-full h-full text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              <div className="flex-1">
                {/* Handles для кожного промпта */}
                <Handle
                  type="source"
                  position={Position.Left}
                  id={`source-left-${prompt.id}`}
                  className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
                  style={{ left: -16, top: '50%', transform: 'translateY(-50%)', transformOrigin: 'center', zIndex: sourceZIndex }}
                />
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`source-right-${prompt.id}`}
                  className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
                  style={{ right: -16, top: '50%', transform: 'translateY(-50%)', transformOrigin: 'center', zIndex: sourceZIndex }}
                />

                <div className="flex items-start gap-2 flex-1">
                  <div
                    className={`flex-1 ${prompt.completed ? 'line-through opacity-60' : ''}`}
                    onContextMenu={(e) => handlePromptContextMenu(e, prompt.id, prompt.content)}
                  >
                    <AutoResizeTextarea
                      value={prompt.content}
                      onChange={(newContent) => updatePrompt(prompt.id, newContent)}
                      placeholder="Напишіть завдання..."
                    />
                  </div>
                  {promptNotes.has(prompt.id) && (
                    <button
                      onClick={() => {
                        setSelectedPromptForNote({ id: prompt.id, content: prompt.content })
                        setNoteEditorOpen(true)
                      }}
                      className="nodrag mt-1 p-1 hover:bg-primary/10 rounded transition-colors"
                      title="Відкрити нотатку"
                    >
                      <Eye className="h-4 w-4 text-primary" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add new prompt form */}
          <div className="space-y-1.5 p-2">
            <div onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                addPrompt()
              }
            }}>
              <AutoResizeTextarea
                value={newPromptText}
                onChange={setNewPromptText}
                placeholder="Додати завдання... (Cmd+Enter)"
                rows={1}
              />
            </div>
            {newPromptText.trim() && (
              <div className="flex gap-1.5">
                <button
                  onClick={addPrompt}
                  className="px-2.5 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90"
                >
                  Додати
                </button>
                <button
                  onClick={() => setNewPromptText('')}
                  className="px-2.5 py-1.5 bg-muted text-xs rounded hover:bg-muted/80"
                >
                  Очистити
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Контекстне меню блоку через Portal */}
      {contextMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          />
          <div
            className="fixed z-[10000] bg-white border-2 border-black rounded-md shadow-lg py-1 min-w-[150px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                data.onCopyNode?.()
                setContextMenu(null)
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
            >
              Копіювати блок
            </button>
            <button
              onClick={() => {
                setContextMenu(null)
                handleDeleteBlock()
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-destructive/10 text-destructive transition-colors border-t border-border"
            >
              Видалити блок цілі
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Контекстне меню завдання через Portal */}
      {promptContextMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999]"
            onClick={() => setPromptContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setPromptContextMenu(null)
            }}
          />
          <div
            className="fixed z-[10000] bg-white border-2 border-black rounded-md shadow-lg py-1 min-w-[150px]"
            style={{ top: promptContextMenu.y, left: promptContextMenu.x }}
          >
            <button
              onClick={() => {
                setSelectedPromptForNote({
                  id: promptContextMenu.promptId,
                  content: promptContextMenu.promptContent
                })
                setNoteEditorOpen(true)
                setPromptContextMenu(null)
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors flex items-center gap-2"
            >
              {promptNotes.has(promptContextMenu.promptId) ? (
                <>
                  <Eye className="h-3 w-3" />
                  Відкрити нотатку
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3" />
                  Створити нотатку
                </>
              )}
            </button>
            <button
              onClick={async () => {
                await copyToClipboard(promptContextMenu.promptContent)
                setPromptContextMenu(null)
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Copy className="h-3 w-3" />
              Копіювати текст
            </button>
            <button
              onClick={() => {
                setPromptContextMenu(null)
                deletePrompt(promptContextMenu.promptId)
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-destructive/10 text-destructive transition-colors border-t border-border flex items-center gap-2"
            >
              <Trash2 className="h-3 w-3" />
              Видалити пункт
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Note Editor Dialog */}
      {selectedPromptForNote && data.canvasId && (
        <PromptNoteEditor
          open={noteEditorOpen}
          onOpenChange={setNoteEditorOpen}
          canvasId={data.canvasId}
          nodeId={id}
          promptId={selectedPromptForNote.id}
          promptText={selectedPromptForNote.content}
        />
      )}
    </div>
  )
}

export default memo(GoalBlockNode)
