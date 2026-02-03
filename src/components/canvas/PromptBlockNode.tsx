'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeProps, useUpdateNodeInternals, useReactFlow, NodeResizer } from 'reactflow'
import { Copy, Trash2, Plus, GripVertical, Settings, Clock, Target, Calendar as CalendarIcon } from 'lucide-react'
import { generatePromptId } from '@/lib/canvas/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { useConfirm } from '@/hooks/use-confirm'

interface PromptItem {
  id: string
  content: string
  completed?: boolean
}

interface Goal {
  id: string
  title: string
  category: string
}

interface PromptBlockData {
  title: string
  prompts: PromptItem[]
  goal_id?: string
  goal_title?: string
  scheduled_date?: string
  scheduled_time?: string
  color?: string
  priority?: string
  isConnecting?: boolean
  onCopyNode?: () => void
  lastEditedPromptText?: string
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
      // Якщо пусто - використовуємо rows prop, якщо є контент - автоматично
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

function PromptBlockNode({ data, id }: NodeProps<PromptBlockData>) {
  const [prompts, setPrompts] = useState<PromptItem[]>(data.prompts || [])
  const [newPromptText, setNewPromptText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<string | undefined>(data.goal_id)
  const [goalTitle, setGoalTitle] = useState<string | undefined>(data.goal_title)
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    data.scheduled_date ? new Date(data.scheduled_date) : undefined
  )
  const [scheduledTime, setScheduledTime] = useState<string | undefined>(data.scheduled_time)
  const [blockColor, setBlockColor] = useState<string | undefined>(data.color || '#000000')
  const [blockTitle, setBlockTitle] = useState<string>(data.title || 'Новий блок')
  const [priority, setPriority] = useState<string>(data.priority || 'P0')
  const [lastEditedPromptText, setLastEditedPromptText] = useState<string | undefined>(data.lastEditedPromptText)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [promptContextMenu, setPromptContextMenu] = useState<{ x: number; y: number; promptId: string; promptContent: string } | null>(null)
  const updateNodeInternals = useUpdateNodeInternals()
  const { setNodes, setEdges } = useReactFlow()
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

  // Оновлюємо внутрішні дані про handles після монтування та при зміні промптів
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, updateNodeInternals, prompts])

  // Синхронізуємо зміни prompts з node data в ReactFlow
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                title: blockTitle,
                prompts,
                goal_id: selectedGoal,
                goal_title: goalTitle,
                scheduled_date: scheduledDate?.toISOString(),
                scheduled_time: scheduledTime,
                color: blockColor,
                priority,
                lastEditedPromptText,
              },
            }
          : node
      )
    )
  }, [blockTitle, priority, prompts, selectedGoal, goalTitle, scheduledDate, scheduledTime, blockColor, lastEditedPromptText, id, setNodes])

  useEffect(() => {
    if (popoverOpen && goals.length === 0) {
      fetch('/api/canvas/goals')
        .then((res) => res.json())
        .then((data) => {
          if (data.goals) {
            setGoals(data.goals)
          }
        })
        .catch((err) => console.error('Error loading goals:', err))
    }
  }, [popoverOpen, goals.length])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const addPrompt = () => {
    if (newPromptText.trim()) {
      const newPrompt: PromptItem = {
        id: generatePromptId(),
        content: newPromptText.trim(),
      }
      setPrompts([...prompts, newPrompt])
      // Зберігаємо останній редагований текст
      setLastEditedPromptText(newPromptText.trim())
      setNewPromptText('')
      setIsEditing(false)
    }
  }

  const deletePrompt = async (id: string) => {
    const confirmed = await confirm({
      title: 'Видалити промпт',
      description: 'Ви впевнені, що хочете видалити цей промпт?',
      confirmText: 'Видалити',
      variant: 'destructive',
    })

    if (confirmed) {
      setPrompts(prompts.filter((p) => p.id !== id))
    }
  }

  const updatePrompt = (id: string, newContent: string) => {
    setPrompts(prompts.map((p) => (p.id === id ? { ...p, content: newContent } : p)))
    // Зберігаємо останній редагований текст
    if (newContent.trim()) {
      setLastEditedPromptText(newContent.trim())
    }
  }

  const toggleComplete = (id: string) => {
    setPrompts(prompts.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)))
  }

  const handleGoalSelect = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId)
    setSelectedGoal(goalId)
    setGoalTitle(goal?.title)
  }

  const handleRemoveGoal = () => {
    setSelectedGoal(undefined)
    setGoalTitle(undefined)
  }

  const handleDeleteBlock = async () => {
    const confirmed = await confirm({
      title: 'Видалити блок',
      description: 'Ви впевнені, що хочете видалити цей блок?',
      confirmText: 'Видалити',
      variant: 'destructive',
    })

    if (confirmed) {
      // Видаляємо тільки ноду, з'єднання залишаються
      setNodes((nodes) => nodes.filter((node) => node.id !== id))
      setPopoverOpen(false)
    }
  }

  return (
    <>
      <NodeResizer
        minWidth={220}
        maxWidth={800}
        lineStyle={{ border: 'none' }}
        handleStyle={{
          width: '6px',
          height: '100%',
          opacity: 0,
          zIndex: 1000,
          cursor: 'ew-resize',
        }}
        shouldResize={(event, params) => {
          // Дозволяємо resize тільки по ширині (лівий і правий handles)
          return params.direction[0] !== 0 && params.direction[1] === 0
        }}
      />

      {/* Wrapper для handles */}
      <div className="relative" style={{ minWidth: '220px', maxWidth: '500px', overflow: 'visible' }}>
        {/* Верхні/нижні handles для всього блоку */}
        <Handle
          type="target"
          position={Position.Top}
          id="target-top"
          className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
          style={{ top: -14, transformOrigin: 'center', zIndex: targetZIndex }}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="target-bottom"
          className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
          style={{ bottom: -14, transformOrigin: 'center', zIndex: targetZIndex }}
        />
        <Handle
          type="source"
          position={Position.Top}
          id="source-top"
          className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
          style={{ top: -14, transformOrigin: 'center', zIndex: sourceZIndex }}
        />
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
          style={{ borderColor: blockColor, overflow: 'visible' }}
          onContextMenu={handleContextMenu}
        >

      {/* Header */}
      <div
        className="px-3 py-1.5 rounded-t-lg border-b border-border flex items-center gap-2"
        style={{
          backgroundColor: blockColor?.toLowerCase() === '#000000' ? 'white' : `${blockColor}40`
        }}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
        <div className="flex-1 cursor-move">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded border-2 border-black">
              {priority}
            </span>
            <h3 className="font-semibold text-sm">{blockTitle}</h3>
          </div>
          {goalTitle && (
            <p className="text-xs text-muted-foreground">🎯 {goalTitle}</p>
          )}
          {(scheduledDate || scheduledTime) && (
            <p className="text-xs text-muted-foreground">
              📅 {scheduledDate ? format(scheduledDate, 'd MMM', { locale: uk }) : ''}{scheduledTime ? ` о ${scheduledTime}` : ''}
            </p>
          )}
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className="nodrag p-1 hover:bg-background rounded transition-colors"
              title="Налаштування"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="nodrag w-80">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Налаштування блоку</h4>

              {/* Назва блоку */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  ✏️ Назва блоку:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blockTitle}
                    onChange={(e) => setBlockTitle(e.target.value)}
                    placeholder="Назва блоку"
                    className="flex-1 px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                    <option value="P4">P4</option>
                    <option value="P5">P5</option>
                  </select>
                </div>
              </div>

              {/* Дата */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Дата:
                </label>
                <DatePicker
                  date={scheduledDate}
                  onSelect={setScheduledDate}
                  placeholder="Оберіть дату"
                />
                {scheduledDate && (
                  <button
                    onClick={() => setScheduledDate(undefined)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Видалити дату
                  </button>
                )}
              </div>

              {/* Час */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Час:
                </label>
                <input
                  type="time"
                  value={scheduledTime || ''}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {scheduledTime && (
                  <button
                    onClick={() => setScheduledTime(undefined)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Видалити час
                  </button>
                )}
              </div>

              {/* Ціль */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Ціль:
                </label>
                {selectedGoal ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm flex-1">🎯 {goalTitle}</span>
                    <button
                      onClick={handleRemoveGoal}
                      className="text-xs text-destructive hover:underline"
                    >
                      Видалити
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedGoal || ''}
                    onChange={(e) => handleGoalSelect(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Виберіть ціль...</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title} ({goal.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Колір блоку */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  🎨 Колір блоку:
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={blockColor}
                    onChange={(e) => setBlockColor(e.target.value)}
                    className="h-9 w-16 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={blockColor}
                    onChange={(e) => setBlockColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Видалення блоку */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={handleDeleteBlock}
                  className="w-full px-3 py-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Видалити блок
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Prompts list */}
      <div className="flex-1 min-h-0 divide-y divide-border">
        {prompts.map((prompt, index) => (
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
              {/* Handles для кожного промпта окремо */}
              <Handle
                type="source"
                position={Position.Left}
                id={`source-left-${prompt.id}`}
                className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
                style={{ left: -16, top: '50%', transform: 'translateY(-50%)', transformOrigin: 'center', zIndex: sourceZIndex }}
              />
              <Handle
                type="target"
                position={Position.Left}
                id={`target-left-${prompt.id}`}
                className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
                style={{ left: -16, top: '50%', transform: 'translateY(-50%)', transformOrigin: 'center', zIndex: targetZIndex }}
              />
              <Handle
                type="source"
                position={Position.Right}
                id={`source-right-${prompt.id}`}
                className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
                style={{ right: -16, top: '50%', transform: 'translateY(-50%)', transformOrigin: 'center', zIndex: sourceZIndex }}
              />
              <Handle
                type="target"
                position={Position.Right}
                id={`target-right-${prompt.id}`}
                className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
                style={{ right: -16, top: '50%', transform: 'translateY(-50%)', transformOrigin: 'center', zIndex: targetZIndex }}
              />

              <div
                className={prompt.completed ? 'line-through opacity-60' : ''}
                onContextMenu={(e) => handlePromptContextMenu(e, prompt.id, prompt.content)}
              >
                <AutoResizeTextarea
                  value={prompt.content}
                  onChange={(newContent) => updatePrompt(prompt.id, newContent)}
                  placeholder="Напишіть промпт..."
                />
              </div>
            </div>
            {/* <div className="flex flex-col gap-1">
              <button
                onClick={() => copyToClipboard(prompt.content)}
                className="p-1 hover:bg-primary/10 bg-background border border-border rounded transition-colors"
                title="Копіювати"
              >
                <Copy className="h-3.5 w-3.5 text-primary" />
              </button>
              <button
                onClick={() => deletePrompt(prompt.id)}
                className="p-1 hover:bg-destructive/10 bg-background border border-border rounded transition-colors"
                title="Видалити"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div> */}
          </div>
        ))}

        {/* Add new prompt form - завжди показувати */}
        <div className="space-y-1.5">
          <div onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              addPrompt()
            }
          }}>
            <AutoResizeTextarea
              value={newPromptText}
              onChange={setNewPromptText}
              placeholder="Напишіть промпт... (Cmd+Enter для додавання)"
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
      </div> {/* Закриття білого блоку */}
    </div> {/* Закриття wrapper */}

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
            Видалити блок
          </button>
        </div>
      </>,
      document.body
    )}

    {/* Контекстне меню промпта через Portal */}
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
    </>
  )
}

export default memo(PromptBlockNode)
