'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeProps, useUpdateNodeInternals, useReactFlow, NodeResizer } from 'reactflow'
import { Copy, Trash2, Plus, GripVertical, Settings, Clock, Target, Calendar as CalendarIcon } from 'lucide-react'
import { generatePromptId } from '@/lib/canvas/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'

interface PromptItem {
  id: string
  content: string
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
}

// Auto-resizing textarea component
function AutoResizeTextarea({
  value,
  onChange,
  placeholder
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="nodrag w-full px-2 py-1.5 text-sm border border-border rounded bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      rows={1}
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
  const [popoverOpen, setPopoverOpen] = useState(false)
  const updateNodeInternals = useUpdateNodeInternals()
  const { setNodes, setEdges } = useReactFlow()

  // Оновлюємо внутрішні дані про handles після монтування
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, updateNodeInternals])

  // Синхронізуємо зміни prompts з node data в ReactFlow
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                prompts,
                goal_id: selectedGoal,
                goal_title: goalTitle,
                scheduled_date: scheduledDate?.toISOString(),
                scheduled_time: scheduledTime,
              },
            }
          : node
      )
    )
  }, [prompts, selectedGoal, goalTitle, scheduledDate, scheduledTime, id, setNodes])

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
      setNewPromptText('')
      setIsEditing(false)
    }
  }

  const deletePrompt = (id: string) => {
    setPrompts(prompts.filter((p) => p.id !== id))
  }

  const updatePrompt = (id: string, newContent: string) => {
    setPrompts(prompts.map((p) => (p.id === id ? { ...p, content: newContent } : p)))
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

  const handleDeleteBlock = () => {
    if (confirm('Видалити цей блок?')) {
      // Видаляємо ноду
      setNodes((nodes) => nodes.filter((node) => node.id !== id))
      // Видаляємо всі з'єднання пов'язані з цією нодою
      setEdges((edges) =>
        edges.filter((edge) => edge.source !== id && edge.target !== id)
      )
      setPopoverOpen(false)
    }
  }

  return (
    <>
      <NodeResizer
        minWidth={220}
        minHeight={100}
        lineStyle={{ border: 'none' }}
        handleStyle={{
          width: '20px',
          height: '20px',
          opacity: 0,
        }}
      />
      <div className="bg-card border-2 border-border rounded-lg shadow-lg min-w-[220px] max-w-[500px] w-full h-full flex flex-col">
        {/* Target handles - рендерити першими (будуть знизу, z-index менший) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
        style={{ top: -14, transformOrigin: 'center', zIndex: 1 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
        style={{ bottom: -14, transformOrigin: 'center', zIndex: 1 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
        style={{ left: -14, transformOrigin: 'center', zIndex: 1 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg"
        style={{ right: -14, transformOrigin: 'center', zIndex: 1 }}
      />

      {/* Source handles - рендерити другими (будуть зверху, z-index більший) */}
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
        style={{ top: -14, transformOrigin: 'center', zIndex: 2 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
        style={{ bottom: -14, transformOrigin: 'center', zIndex: 2 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
        style={{ left: -14, transformOrigin: 'center', zIndex: 2 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-3 !h-3 !bg-primary !border-2 !border-black !transition-transform !shadow-lg !cursor-crosshair"
        style={{ right: -14, transformOrigin: 'center', zIndex: 2 }}
      />

      {/* Header */}
      <div className="bg-muted px-3 py-1.5 rounded-t-lg border-b border-border flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
        <div className="flex-1 cursor-move">
          <h3 className="font-semibold text-sm">{data.title}</h3>
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
      <div className="p-1.5 space-y-1.5 flex-1 overflow-y-auto min-h-0">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="flex items-start gap-1.5"
          >
            <div className="flex-1">
              <AutoResizeTextarea
                value={prompt.content}
                onChange={(newContent) => updatePrompt(prompt.id, newContent)}
                placeholder="Напишіть промпт..."
              />
            </div>
            <div className="flex flex-col gap-1">
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
            </div>
          </div>
        ))}

        {/* Add new prompt form - завжди показувати */}
        <div className="space-y-1.5">
          <textarea
            value={newPromptText}
            onChange={(e) => setNewPromptText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                addPrompt()
              }
            }}
            placeholder="Напишіть промпт... (Cmd+Enter для додавання)"
            className="nodrag w-full px-2 py-1.5 text-sm border border-border rounded bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            rows={prompts.length === 0 ? 3 : 2}
          />
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
    </>
  )
}

export default memo(PromptBlockNode)
