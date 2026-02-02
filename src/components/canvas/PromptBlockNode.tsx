'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Copy, Trash2, Plus, GripVertical, Settings, X } from 'lucide-react'

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

function PromptBlockNode({ data }: NodeProps<PromptBlockData>) {
  const [prompts, setPrompts] = useState<PromptItem[]>(data.prompts || [])
  const [newPromptText, setNewPromptText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<string | undefined>(data.goal_id)
  const [goalTitle, setGoalTitle] = useState<string | undefined>(data.goal_title)

  useEffect(() => {
    if (showSettings && goals.length === 0) {
      fetch('/api/canvas/goals')
        .then((res) => res.json())
        .then((data) => {
          if (data.goals) {
            setGoals(data.goals)
          }
        })
        .catch((err) => console.error('Error loading goals:', err))
    }
  }, [showSettings, goals.length])

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
        id: `p${Date.now()}`,
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
    setShowSettings(false)
    // TODO: Save to database when we implement persistence
  }

  const handleRemoveGoal = () => {
    setSelectedGoal(undefined)
    setGoalTitle(undefined)
    setShowSettings(false)
    // TODO: Update database
  }

  return (
    <div className="bg-card border-2 border-border rounded-lg shadow-lg min-w-[300px] max-w-[500px]">
      {/* Handles для з'єднання з усіх сторін */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />

      <Handle
        type="source"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!scale-125 transition-transform"
      />

      {/* Header */}
      <div className="bg-muted px-3 py-1.5 rounded-t-lg border-b border-border flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
        <div className="flex-1 cursor-move">
          <h3 className="font-semibold text-sm">{data.title}</h3>
          {goalTitle && (
            <p className="text-xs text-muted-foreground">🎯 {goalTitle}</p>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="nodrag p-1 hover:bg-background rounded transition-colors"
          title="Налаштування"
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Settings Menu */}
      {showSettings && (
        <div className="nodrag bg-background border-b border-border p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Налаштування блоку</h4>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
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
                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
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
        </div>
      )}

      {/* Prompts list */}
      <div className="p-1.5 space-y-1.5 max-h-[400px] overflow-y-auto">
        {prompts.length === 0 && !isEditing && (
          <p className="text-sm text-muted-foreground italic">Додайте перший промпт</p>
        )}

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

        {/* Add new prompt form */}
        {isEditing ? (
          <div className="space-y-1.5">
            <AutoResizeTextarea
              value={newPromptText}
              onChange={setNewPromptText}
              placeholder="Напишіть промпт... (Cmd+Enter для додавання)"
            />
            <div className="flex gap-1.5">
              <button
                onClick={addPrompt}
                className="px-2.5 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90"
              >
                Додати
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setNewPromptText('')
                }}
                className="px-2.5 py-1.5 bg-muted text-xs rounded hover:bg-muted/80"
              >
                Скасувати
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full p-1.5 text-sm text-muted-foreground border border-dashed border-border rounded hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Додати промпт
          </button>
        )}
      </div>
    </div>
  )
}

export default memo(PromptBlockNode)
