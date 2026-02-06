'use client'

import { useCallback, useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConfirm } from '@/hooks/use-confirm'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import PromptBlockNode from '@/components/canvas/PromptBlockNode'
import GoalBlockNode from '@/components/canvas/GoalBlockNode'
import CustomEdge from '@/components/canvas/CustomEdge'
import CanvasSelector from '@/components/canvas/CanvasSelector'
import { Plus, Save, Cloud, AlertCircle, Loader2, Target, Download, Copy, FileJson, Share2, Camera, Upload, History, Activity } from 'lucide-react'
import { createAutosave, SaveStatus } from '@/lib/canvas/autosave'
import { generateNodeId } from '@/lib/canvas/utils'
import { exportCanvasToMarkdown, downloadMarkdown, exportCanvasToJSON, downloadJSON, importCanvasFromJSON } from '@/lib/canvas/markdown-exporter'
import { EventTracker } from '@/lib/canvas/event-tracker'
import ShareCanvasDialog from '@/components/canvas/ShareCanvasDialog'
import ScreenshotLinkDialog from '@/components/canvas/ScreenshotLinkDialog'
import { RestoreBackupDialog } from '@/components/canvas/RestoreBackupDialog'
import { SaveSlotsDialog } from '@/components/canvas/SaveSlotsDialog'
import { CanvasEventsDialog } from '@/components/canvas/CanvasEventsDialog'
import { generateCanvasPreview, generateShareableScreenshot } from '@/lib/canvas/screenshot'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getIconById, isPredefinedIcon } from '@/lib/goalIcons'
import { getCategoryMeta } from '@/lib/categoryConfig'

const nodeTypes = {
  promptBlock: PromptBlockNode,
  goalBlock: GoalBlockNode,
}

const edgeTypes = {
  default: CustomEdge,
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

function CanvasFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const confirm = useConfirm()
  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [goals, setGoals] = useState<Array<{ id: string; name: string; category: string; color: string; iconUrl: string }>>([])
  const [copiedNode, setCopiedNode] = useState<Node | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [currentCanvasId, setCurrentCanvasId] = useState<string | undefined>(undefined)
  const [canvasTitle, setCanvasTitle] = useState('Робочий Canvas')
  const [copySuccess, setCopySuccess] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showSaveSlotsDialog, setShowSaveSlotsDialog] = useState(false)
  const [showEventsDialog, setShowEventsDialog] = useState(false)
  const [currentSlotNumber, setCurrentSlotNumber] = useState<number | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [generatingScreenshot, setGeneratingScreenshot] = useState(false)
  const [canvasPermission, setCanvasPermission] = useState<'view' | 'edit'>('edit')
  const [isOwner, setIsOwner] = useState(true)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [promptCopied, setPromptCopied] = useState(false)
  const [selectedGoalForAI, setSelectedGoalForAI] = useState<string>('')
  const { screenToFlowPosition } = useReactFlow()
  const connectingNodeId = useRef<string | null>(null)
  const connectingHandleId = useRef<string | null>(null)
  const autosaveRef = useRef<ReturnType<typeof createAutosave> | null>(null)
  const nodesRef = useRef<Node[]>(nodes)
  const previousPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const memoizedEdgeTypes = useMemo(() => edgeTypes, [])

  // Синхронізуємо ref з поточними nodes
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  // Wrap onNodesChange to track deletions
  const onNodesChange = useCallback((changes: any[]) => {
    // Track node deletions
    changes.forEach((change) => {
      if (change.type === 'remove' && currentCanvasId) {
        const node = nodes.find(n => n.id === change.id)
        if (node) {
          EventTracker.blockDeleted(currentCanvasId, node.id, node.data?.title || 'Без назви')
        }
      }
    })

    // Call original handler
    onNodesChangeOriginal(changes)
  }, [nodes, currentCanvasId, onNodesChangeOriginal])

  // Load canvas function
  const loadCanvas = useCallback(async (canvasId?: string) => {
    setIsLoading(true)

    try {
      // Створити/оновити autosave з новим canvasId
      if (autosaveRef.current) {
        autosaveRef.current.setCanvasId(canvasId)
      } else {
        autosaveRef.current = createAutosave({
          canvasId,
          debounceMs: 3000,
          onStatusChange: (status) => {
            setSaveStatus(status)
          },
          onError: (error) => {
            console.error('Autosave error:', error)
          },
        })
      }

      // Завантажити canvas
      const data = await autosaveRef.current.load(canvasId)

      if (data.exists) {
        setNodes(data.nodes)
        setEdges(data.edges)
        setCanvasTitle(data.title)
        setCurrentCanvasId(data.canvasId)

        // Check canvas details for permission
        if (data.canvasId) {
          const canvasResponse = await fetch(`/api/canvas/${data.canvasId}`)
          if (canvasResponse.ok) {
            const canvasData = await canvasResponse.json()
            setCanvasPermission(canvasData.canvas.permission || 'edit')
            setIsOwner(canvasData.canvas.is_owner !== false)
          }

          // Зберегти останній відкритий canvas
          localStorage.setItem('lastCanvasId', data.canvasId)
        }
      } else {
        // Canvas не існує - створити новий
        const response = await fetch('/api/canvas', { method: 'POST' })
        if (response.ok) {
          const result = await response.json()
          const newCanvasId = result.canvas.id
          setCurrentCanvasId(newCanvasId)
          setCanvasTitle(result.canvas.title)
          router.push(`/canvas?id=${newCanvasId}`)
          autosaveRef.current?.setCanvasId(newCanvasId)
        }
      }
    } catch (error) {
      console.error('Error loading canvas:', error)
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setEdges, router])

  // Initialize: завантажити canvas з URL або останній
  useEffect(() => {
    const canvasIdFromUrl = searchParams.get('id')

    if (canvasIdFromUrl) {
      // Завантажити конкретний canvas з URL
      loadCanvas(canvasIdFromUrl)
    } else {
      // Завантажити останній відкритий canvas
      const lastCanvasId = localStorage.getItem('lastCanvasId')
      if (lastCanvasId) {
        router.push(`/canvas?id=${lastCanvasId}`)
      } else {
        // Завантажити будь-який доступний canvas
        loadCanvas()
      }
    }

    return () => {
      autosaveRef.current?.destroy()
    }
  }, [searchParams, loadCanvas, router])

  // Autosave on changes
  useEffect(() => {
    if (!isLoading && autosaveRef.current) {
      autosaveRef.current.scheduleSave(nodes, edges)
    }
  }, [nodes, edges, isLoading])

  // Stable copy callback using ref
  const handleCopyNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (node) {
      setCopiedNode(node)
    }
  }, [])

  // Update all nodes with isConnecting state, canvas ID, and copy callback
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isConnecting,
          onCopyNode: () => handleCopyNode(node.id),
          canvasId: currentCanvasId,
        },
      }))
    )
  }, [isConnecting, handleCopyNode, currentCanvasId, setNodes])

  // Canvas management handlers
  const handleCanvasChange = useCallback((canvasId: string) => {
    router.push(`/canvas?id=${canvasId}`)
  }, [router])

  const handleCanvasCreate = useCallback(async () => {
    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Новий Canvas' }),
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/canvas?id=${result.canvas.id}`)
      }
    } catch (error) {
      console.error('Error creating canvas:', error)
    }
  }, [router])

  const handleCanvasRename = useCallback(async (canvasId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/canvas/${canvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })

      if (response.ok && canvasId === currentCanvasId) {
        setCanvasTitle(newTitle)
      }
    } catch (error) {
      console.error('Error renaming canvas:', error)
    }
  }, [currentCanvasId])

  const handleCanvasDelete = useCallback(async (canvasId: string) => {
    try {
      const response = await fetch(`/api/canvas/${canvasId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Якщо видаляємо поточний canvas, перейти на інший
        if (canvasId === currentCanvasId) {
          router.push('/canvas')
        }
      }
    } catch (error) {
      console.error('Error deleting canvas:', error)
    }
  }, [currentCanvasId, router])

  const handleManualSave = useCallback(() => {
    // Open Save Slots Dialog
    setShowSaveSlotsDialog(true)
  }, [])

  const handleLoadSlot = useCallback((slotNumber: number, slotNodes: Node[], slotEdges: Edge[]) => {
    // Load slot data
    setNodes(slotNodes)
    setEdges(slotEdges)
    setCurrentSlotNumber(slotNumber)

    // Force immediate save to update autosave state
    if (autosaveRef.current) {
      autosaveRef.current.saveNow(slotNodes, slotEdges)
    }
  }, [setNodes, setEdges])

  const handleExportMarkdown = useCallback(() => {
    const markdown = exportCanvasToMarkdown(nodes, edges, canvasTitle)
    const filename = `${canvasTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`
    downloadMarkdown(markdown, filename)
  }, [nodes, edges, canvasTitle])

  const handleCopyMarkdown = useCallback(async () => {
    const markdown = exportCanvasToMarkdown(nodes, edges, canvasTitle)
    try {
      await navigator.clipboard.writeText(markdown)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy markdown:', error)
    }
  }, [nodes, edges, canvasTitle])

  const handleExportJSON = useCallback(() => {
    const json = exportCanvasToJSON(nodes, edges, canvasTitle, currentCanvasId)
    const filename = `${canvasTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    downloadJSON(json, filename)
  }, [nodes, edges, canvasTitle, currentCanvasId])

  const handleCopyJSON = useCallback(async () => {
    const json = exportCanvasToJSON(nodes, edges, canvasTitle, currentCanvasId)
    try {
      await navigator.clipboard.writeText(json)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy JSON:', error)
    }
  }, [nodes, edges, canvasTitle, currentCanvasId])

  const handleGenerateScreenshot = useCallback(async () => {
    if (!currentCanvasId) return

    setGeneratingScreenshot(true)
    try {
      const url = await generateShareableScreenshot(currentCanvasId, canvasTitle)
      setScreenshotUrl(url)
      setShowScreenshotDialog(true)
    } catch (error) {
      console.error('Failed to generate screenshot:', error)
      alert('Помилка при генерації screenshot')
    } finally {
      setGeneratingScreenshot(false)
    }
  }, [currentCanvasId, canvasTitle])

  const handleCopyAIPrompt = useCallback(async () => {
    const selectedGoal = goals.find(g => g.id === selectedGoalForAI)

    let goalInfo = ''
    let cleanIcon = '🎯'
    let cleanColor = '#3b82f6'

    if (selectedGoal) {
      // Extract plain URL from markdown if needed
      cleanIcon = selectedGoal.iconUrl || '🎯'

      // Clean markdown links
      if (cleanIcon.includes('[') && cleanIcon.includes('](')) {
        // Extract URL from markdown link: [url](url) -> url
        const match = cleanIcon.match(/\[([^\]]+)\]/)
        if (match) cleanIcon = match[1]
      }

      // If still empty or invalid, use emoji based on category
      if (!cleanIcon || cleanIcon.trim() === '' || cleanIcon === 'undefined') {
        const categoryEmojis: Record<string, string> = {
          'learning': '📚',
          'work_startups': '💼',
          'health_sports': '🏃',
          'hobbies': '🎨'
        }
        cleanIcon = categoryEmojis[selectedGoal.category] || '🎯'
      }

      // Clean color - replace "null" string or invalid values with default
      cleanColor = selectedGoal.color || '#3b82f6'
      if (cleanColor === 'null' || cleanColor === 'undefined' || !cleanColor.startsWith('#')) {
        cleanColor = '#3b82f6'
      }

      goalInfo = `
SELECTED GOAL (use as main Goal Block):
- goal_id: "${selectedGoal.id}"
- title: "${selectedGoal.name}"
- color: "${cleanColor}"
- category: "${selectedGoal.category}"
- icon: "${cleanIcon}"

CRITICAL RULES:
1. ICON: "${cleanIcon}" is ALREADY CLEAN. Use it EXACTLY as-is in the JSON!
   - If it's emoji (like 📚) → use emoji
   - If it's URL (like https://...) → use URL
   - DO NOT add brackets, DO NOT wrap in markdown
   - Copy it character-by-character into "icon" field

2. COLOR: "${cleanColor}" is valid hex. Use as-is.

3. LANGUAGE: "${selectedGoal.name}" is the SUBJECT, not response language!
   Example: "English" goal + Ukrainian request → respond in Ukrainian
`
    }

    const aiPrompt = `You are an expert at creating Canvas schemas for Life Designer.

CRITICAL INSTRUCTIONS:
- Respond ONLY with valid JSON
- NO explanations, NO markdown blocks (\`\`\`json), NO comments
- Start with { and end with }

LANGUAGE RULE (CRITICAL):
- If the user's description/conversation is in UKRAINIAN - respond in UKRAINIAN
- If goal title is "English", "Spanish", etc. - this is the SUBJECT being learned, NOT the language to respond in!
- ALWAYS match the language of the user's input text, NOT the subject matter
- Example: User writes "10 уроків англійської" → respond in UKRAINIAN about English lessons
- Example: User writes "10 English lessons" → respond in ENGLISH about English lessons
${goalInfo}

TASK:
Generate a complete Canvas JSON based on the conversation/description above.

═══════════════════════════════════════════════════════════════

1. STRUCTURE REQUIREMENTS

Goal Blocks (1-2 maximum):
- Type: "goalBlock"
- Use for: Main objectives, project outcomes, strategic goals
- Position: Top center (x: 400-500, y: 50)
- Must include: title, prompts array (if edges connect from it), color (hex), category, icon, isGoalBlock: true

🚨 CRITICAL RULE - GOAL PROMPTS QUANTITY:
- Number of prompts in Goal Block = Number of Prompt Blocks below it
- Example: 10 lessons → Goal must have 10 prompts (one per lesson)
- Each Goal prompt = short name of one lesson/module/task
- Each Goal prompt connects to exactly ONE Prompt Block
- Do NOT connect Prompt Blocks to each other for lessons/courses (only Goal → Task)

⚠️ ICON FIELD - CRITICAL RULES:
- ✅ CORRECT: Plain URL like "https://example.com/icon.png"
- ✅ CORRECT: Single emoji like "🚀"
- ❌ WRONG: Markdown link "[url](url)" or "![](url)"
- ❌ WRONG: Any brackets [ ] or parentheses ( ) in icon field
- If you see brackets in icon data above, EXTRACT the plain URL only!

⚠️ COLOR FIELD - CRITICAL RULES:
- ✅ CORRECT: Hex format "#3b82f6"
- ❌ WRONG: String "null" or actual null value
- ❌ WRONG: Color names like "blue" or "red"
- If you receive color data as "null" or empty, use default: "#3b82f6"

Prompt Blocks (flexible 3-15+):
- Type: "promptBlock"
- Use for: Tasks, action items, process steps, lessons, chapters
- Position: Below goals (y: 280-300 for row 1, y: 600-620 for row 2, y: 920-940 for row 3)
- Must include: title, prompts array, priority, color
- For many blocks (7+): arrange in grid with 5 blocks per row

Edges (connections):
- CRITICAL: ALL edges MUST include sourceHandle and targetHandle
- Edge ID format: "reactflow__edge-{sourceId}{sourceHandle}-{targetId}{targetHandle}"
- sourceHandle: "source-left-prompt-{id}" or "source-right-prompt-{id}"
- targetHandle: "target-top"
- animated: ALWAYS true
- style: ALWAYS {"stroke": "#000000", "strokeWidth": 2}

═══════════════════════════════════════════════════════════════

2. PROMPTS (actionable steps inside blocks)

Format: "Action Verb + Specific Task + Key Details"

✅ GOOD Examples (various domains):

Tech/Development:
- "Create Supabase migration for users table with RLS policies"
- "Implement API endpoint POST /api/auth with JWT validation"

Learning/Education:
- "Study Present Perfect grammar: have/has + past participle (30 min)"
- "Learn 15 irregular verbs: been, done, seen, written, spoken"
- "Complete 20 practice sentences using ever, never, just, already, yet"

Business/Marketing:
- "Research 5 competitor pricing models and create comparison spreadsheet"
- "Write email campaign for product launch (subject + 3 variants)"

Personal/Health:
- "Run 5km maintaining heart rate 140-150 bpm"
- "Prepare meal prep for week: 5 chicken breasts, 2kg broccoli, 1kg rice"

❌ BAD Examples:
- "Build backend" (too vague)
- "Learn English" (not specific, not measurable)
- "Study grammar" (no time, no specific topic)
- "Do marketing" (not actionable)

Each Prompt Block should contain 3-5 specific prompts.

═══════════════════════════════════════════════════════════════

3. POSITIONING RULES

Vertical Hierarchy (recommended for projects with 3-5 tasks):
Goal: x: 600, y: 50
├─ Task 1: x: 200, y: 280
├─ Task 2: x: 600, y: 280
└─ Task 3: x: 1000, y: 280

Grid Layout (for 6+ tasks, e.g. lessons, modules):
Goal: x: 1000, y: 50
Row 1 (5 blocks): x: 200, 600, 1000, 1400, 1800, y: 280
Row 2 (5 blocks): x: 200, 600, 1000, 1400, 1800, y: 600
Row 3 (remainder): x: 200, 600, 1000..., y: 920

Horizontal Process Flow (for sequential steps):
Step 1: x: 100, y: 200
→ Step 2: x: 400, y: 200
→ Step 3: x: 700, y: 200

Spacing Requirements (CRITICAL - blocks are ~350px wide!):
- Horizontal: 400-450px between block centers (minimum 400px!)
- Vertical: 320px between row centers (row 1: y=280, row 2: y=600, row 3: y=920)
- Minimum from left edge: 50px
- Grid layout for many blocks: 5 blocks per row maximum

═══════════════════════════════════════════════════════════════

4. COLORS & PRIORITIES

Priority System:
- P0 (Critical): Use #ef4444 (red) - blockers, production bugs, deadlines
- P1 (High): Use #3b82f6 (blue) - important features, key milestones
- P2 (Medium): Use #f59e0b (orange) - nice-to-have, in progress
- P3 (Low): Use #64748b (gray) - backlog, future improvements

Status Colors:
- #22c55e (green): Completed tasks
- #ef4444 (red): Blocked or critical
- #f59e0b (yellow/orange): In progress
- #6366f1 (indigo): Research/planning

═══════════════════════════════════════════════════════════════

5. VALIDATION CHECKLIST

IDs:
✓ goal-1, goal-2 (for Goal Blocks)
✓ node-1, node-2, node-3 (for Prompt Blocks)
✓ edge-1, edge-2 (for connections)
✓ prompt-1-1, prompt-1-2 (for prompts inside blocks)

Edges (CRITICAL):
✓ source and target must reference existing node IDs
✓ sourceHandle in format "source-left-prompt-{id}" or "source-right-prompt-{id}"
✓ targetHandle ALWAYS "target-top"
✓ id format: "reactflow__edge-{sourceId}{sourceHandle}-{targetId}{targetHandle}"
✓ type ALWAYS "custom"
✓ animated ALWAYS true
✓ style ALWAYS {"stroke": "#000000", "strokeWidth": 2}

Dates:
✓ exportedAt: ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
✓ scheduled_date: YYYY-MM-DD format

JSON:
✓ No trailing commas
✓ All strings in double quotes
✓ Valid nesting and brackets

═══════════════════════════════════════════════════════════════

6. EDGE PATTERNS & CONNECTION HANDLES

CRITICAL: Every edge MUST have sourceHandle and targetHandle!

Connection Handles Explained:
- Goal Blocks have: "source-left-prompt-{id}" and "source-right-prompt-{id}"
- Prompt Blocks have: "target-top" (input), "source-left-prompt-{id}", "source-right-prompt-{id}" (outputs)

Edge Structure (MANDATORY format):
{
  "id": "reactflow__edge-{sourceId}{sourceHandle}-{targetId}{targetHandle}",
  "source": "{sourceId}",
  "target": "{targetId}",
  "sourceHandle": "source-left-prompt-{id}",  // or source-right-prompt-{id}
  "targetHandle": "target-top",
  "type": "custom",
  "animated": true,  // ALWAYS true
  "style": {"stroke": "#000000", "strokeWidth": 2}  // ALWAYS black
}

Examples:
- Goal → Task: sourceHandle "source-left-prompt-1-1", targetHandle "target-top"
- Task → Task: sourceHandle "source-right-prompt-2-3", targetHandle "target-top"

═══════════════════════════════════════════════════════════════

7. LAYOUT EXAMPLES

Vertical Hierarchy (Project Structure):
Goal at x=400 y=50 (top center)
└─ Task1 at x=150 y=250 (left)
└─ Task2 at x=400 y=250 (center)
└─ Task3 at x=650 y=250 (right)

Horizontal Process (Sequential Workflow):
Step1 (x=100 y=200) → Step2 (x=350 y=200) → Step3 (x=600 y=200) → Step4 (x=850 y=200)

Grid Layout (10 Lessons/Modules):
- Goal at x=1000 y=50 with 10 prompts
- Lessons 1-5: x=200, 600, 1000, 1400, 1800, all y=280
- Lessons 6-10: x=200, 600, 1000, 1400, 1800, all y=600
- Each of 10 Goal prompts connects to one of 10 Prompt Blocks

Example edges for 10 lessons:
- goal-1 (prompt-g1-1) → node-1
- goal-1 (prompt-g1-2) → node-2
- goal-1 (prompt-g1-3) → node-3
- goal-1 (prompt-g1-4) → node-4
- ...
- goal-1 (prompt-g1-10) → node-10

CALCULATION FORMULA for grid positioning:
- Block number N (0-indexed)
- Row: Math.floor(N / 5)
- Column: N % 5
- X = 200 + (column * 400)
- Y = 280 + (row * 320)

═══════════════════════════════════════════════════════════════

8. COMPLETE JSON EXAMPLE
{
  "version": "1.0",
  "canvasTitle": "Project Name based on context",
  "exportedAt": "2025-02-05T15:00:00.000Z",
  "nodes": [
    {
      "id": "goal-1",
      "type": "goalBlock",
      "position": {"x": 400, "y": 50},
      "data": {
        "title": "Main Goal",
        "prompts": [
          {"id": "prompt-g1-1", "content": "Task 1: Specific task name", "completed": false},
          {"id": "prompt-g1-2", "content": "Task 2: Specific task name", "completed": false}
        ],
        // For courses/lessons: add MORE prompts (one per lesson)
        // Example with 10 lessons: prompt-g1-1 through prompt-g1-10
        ${selectedGoal ? `"goal_id": "${selectedGoal.id}",` : ''}
        "color": "${cleanColor}",
        "category": "${selectedGoal?.category || 'learning'}",
        "icon": "${cleanIcon}",  // USE EXACTLY THIS VALUE - emoji or URL
        "isGoalBlock": true
      }
    },
    {
      "id": "node-1",
      "type": "promptBlock",
      "position": {"x": 200, "y": 250},
      "data": {
        "title": "Task Block Title",
        "prompts": [
          {"id": "prompt-1-1", "content": "First specific step", "completed": false},
          {"id": "prompt-1-2", "content": "Second specific step", "completed": false}
        ],
        "priority": "P1",
        "color": "#3b82f6"
      }
    }
  ],
  "edges": [
    {
      "id": "reactflow__edge-goal-1source-left-prompt-g1-1-node-1target-top",
      "source": "goal-1",
      "target": "node-1",
      "sourceHandle": "source-left-prompt-g1-1",
      "targetHandle": "target-top",
      "type": "custom",
      "animated": true,
      "style": {"stroke": "#000000", "strokeWidth": 2}
    }
  ],
  "stats": {
    "totalBlocks": 2,
    "goals": 1,
    "tasks": 1,
    "connections": 1
  }
}`

    try {
      await navigator.clipboard.writeText(aiPrompt)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 3000)
    } catch (error) {
      console.error('Failed to copy AI prompt:', error)
    }
  }, [selectedGoalForAI, goals])

  const handleImportJSON = useCallback(async () => {
    setImportError(null)

    const result = importCanvasFromJSON(importJsonText)

    if (!result.success) {
      setImportError(result.error || 'Невідома помилка')
      return
    }

    // Confirm before replacing canvas
    const confirmed = await confirm({
      title: 'Імпортувати Canvas',
      description: `Це замінить поточний canvas на імпортований (${result.nodes?.length} блоків, ${result.edges?.length} з'єднань). Продовжити?`,
      confirmText: 'Імпортувати',
      variant: 'default',
    })

    if (confirmed && result.nodes && result.edges) {
      setNodes(result.nodes)
      setEdges(result.edges)
      if (result.canvasTitle) {
        setCanvasTitle(result.canvasTitle)
      }
      setShowImportDialog(false)
      setImportJsonText('')
      setImportError(null)

      // Auto-save imported canvas
      if (autosaveRef.current) {
        autosaveRef.current.saveNow(result.nodes, result.edges)
      }
    }
  }, [importJsonText, confirm, setNodes, setEdges])

  const handleClearCanvas = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Очистити canvas',
      description: 'Видалити всі блоки та з\'єднання?',
      confirmText: 'Видалити',
      variant: 'destructive',
    })

    if (confirmed) {
      setNodes([])
      setEdges([])
      if (autosaveRef.current) {
        autosaveRef.current.saveNow([], [])
      }
    }
  }, [confirm, setNodes, setEdges])

  const handlePasteNode = useCallback((position: { x: number; y: number }) => {
    if (copiedNode) {
      const newNode: Node = {
        ...copiedNode,
        id: generateNodeId(),
        position,
        data: {
          ...copiedNode.data,
          // Скидаємо isConnecting для нової ноди
          isConnecting: false,
        },
      }
      setNodes((nds) => [...nds, newNode])

      // Track pasted block
      if (currentCanvasId) {
        const eventType = copiedNode.data?.isGoalBlock ? 'goalBlock' : 'promptBlock'
        if (eventType === 'goalBlock') {
          EventTracker.goalCreated(currentCanvasId, newNode.id, newNode.data?.title || 'Без назви', newNode.data?.category, position)
        } else {
          EventTracker.blockCreated(currentCanvasId, newNode.id, newNode.data?.title || 'Без назви', 'prompt', position)
        }
      }

      setContextMenu(null)
    }
  }, [copiedNode, setNodes, currentCanvasId])

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }, [])

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('onConnect called with params:', params)
      const newEdge = {
        ...params,
        style: { stroke: '#000000', strokeWidth: 2 },
        animated: true,
      }
      setEdges((eds) => {
        const updatedEdges = addEdge(newEdge, eds)
        console.log('Updated edges:', updatedEdges)
        return updatedEdges
      })
    },
    [setEdges]
  )

  // Переміщення залежних блоків при Shift+Drag
  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Перевіряємо чи натиснутий Shift
      if (!event.shiftKey) {
        return
      }

      // Отримуємо попередню позицію ноди
      const previousPosition = previousPositionsRef.current.get(node.id)
      if (!previousPosition) {
        // Зберігаємо початкову позицію
        previousPositionsRef.current.set(node.id, { x: node.position.x, y: node.position.y })
        return
      }

      // Обчислюємо дельту переміщення
      const deltaX = node.position.x - previousPosition.x
      const deltaY = node.position.y - previousPosition.y

      // Знаходимо всі залежні (дочірні) ноди - ті до яких йдуть edges від поточної ноди
      const childNodeIds = edges
        .filter((edge) => edge.source === node.id)
        .map((edge) => edge.target)

      // Рекурсивна функція для знаходження всіх нащадків
      const getAllDescendants = (nodeId: string, visited = new Set<string>()): string[] => {
        if (visited.has(nodeId)) return []
        visited.add(nodeId)

        const directChildren = edges
          .filter((edge) => edge.source === nodeId)
          .map((edge) => edge.target)

        const allDescendants = [...directChildren]
        directChildren.forEach((childId) => {
          allDescendants.push(...getAllDescendants(childId, visited))
        })

        return allDescendants
      }

      const allDescendantIds = getAllDescendants(node.id)

      // Оновлюємо позиції всіх залежних нод
      if (allDescendantIds.length > 0) {
        setNodes((nds) =>
          nds.map((n) => {
            if (allDescendantIds.includes(n.id)) {
              const newPosition = {
                x: n.position.x + deltaX,
                y: n.position.y + deltaY,
              }
              // Оновлюємо попередню позицію для залежної ноди
              previousPositionsRef.current.set(n.id, newPosition)
              return {
                ...n,
                position: newPosition,
              }
            }
            return n
          })
        )
      }

      // Оновлюємо попередню позицію для поточної ноди
      previousPositionsRef.current.set(node.id, { x: node.position.x, y: node.position.y })
    },
    [edges, setNodes]
  )

  // Очищаємо позиції після завершення перетягування
  const onNodeDragStop = useCallback(() => {
    previousPositionsRef.current.clear()
  }, [])

  const onConnectStart = useCallback((_: any, { nodeId, handleId, handleType }: any) => {
    console.log('onConnectStart:', { nodeId, handleId, handleType })
    connectingNodeId.current = nodeId
    connectingHandleId.current = handleId
    setIsConnecting(true)
  }, [])

  const onConnectEnd = useCallback(
    (event: any) => {
      setIsConnecting(false)

      if (!connectingNodeId.current) return

      const targetIsPane = event.target.classList.contains('react-flow__pane')
      const targetIsHandle = event.target.classList.contains('react-flow__handle')

      // Перевіряємо чи клік на node (шукаємо батьківський елемент з класом react-flow__node)
      let targetElement = event.target
      let targetIsNode = false
      while (targetElement && targetElement !== document.body) {
        if (targetElement.classList?.contains('react-flow__node')) {
          targetIsNode = true
          break
        }
        targetElement = targetElement.parentElement
      }

      // Створюємо новий блок ТІЛЬКИ якщо клік був на пустому місці (pane)
      // Не створюємо, якщо клік був на handle або node (значить з'єднання вже створено)
      if (targetIsPane && !targetIsHandle && !targetIsNode) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        // Знайти source node
        const sourceNode = nodesRef.current.find(n => n.id === connectingNodeId.current)

        // Використати текст промпта як назву (максимум 21 символ)
        let newBlockTitle = 'Новий блок'

        if (sourceNode) {
          // Для звичайних блоків - останній редагований промпт
          if (sourceNode.data?.lastEditedPromptText) {
            const lastPromptText = sourceNode.data.lastEditedPromptText
            newBlockTitle = lastPromptText.length > 21
              ? lastPromptText.substring(0, 21) + '...'
              : lastPromptText
          }
          // Для блоків цілей - знайти текст промпта за handleId
          else if (sourceNode.data?.isGoalBlock && connectingHandleId.current && sourceNode.data?.prompts) {
            // handleId має формат "source-left-{promptId}" або "source-right-{promptId}"
            const handleId = connectingHandleId.current
            const promptId = handleId.replace('source-left-', '').replace('source-right-', '')
            const prompt = sourceNode.data.prompts.find((p: any) => p.id === promptId)

            if (prompt?.content && prompt.content.trim()) {
              newBlockTitle = prompt.content.length > 21
                ? prompt.content.substring(0, 21) + '...'
                : prompt.content
            }
          }
        }

        const newNode: Node = {
          id: generateNodeId(),
          type: 'promptBlock',
          position,
          data: {
            title: newBlockTitle,
            prompts: [],
          },
        }

        setNodes((nds) => [...nds, newNode])

        // Track block creation from connection
        if (currentCanvasId) {
          EventTracker.blockCreated(currentCanvasId, newNode.id, newBlockTitle, 'prompt', position)
        }

        setEdges((eds) =>
          addEdge(
            {
              source: connectingNodeId.current!,
              target: newNode.id,
              sourceHandle: connectingHandleId.current,
              targetHandle: 'target-top',
              style: { stroke: '#000000', strokeWidth: 2 },
              animated: true,
            },
            eds
          )
        )
      }
    },
    [screenToFlowPosition, setNodes, setEdges]
  )

  const addNewBlock = () => {
    const newNode: Node = {
      id: generateNodeId(),
      type: 'promptBlock',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        title: 'Новий блок',
        prompts: [],
      },
    }
    setNodes((nds) => [...nds, newNode])

    // Track block creation
    if (currentCanvasId) {
      EventTracker.blockCreated(currentCanvasId, newNode.id, newNode.data.title, 'prompt', newNode.position)
    }
  }

  const openGoalDialog = async () => {
    setShowGoalDialog(true)
    // Завантажуємо цілі
    try {
      const response = await fetch('/api/goals')
      const data = await response.json()
      if (data.goals) {
        setGoals(data.goals)
      }
    } catch (error) {
      console.error('Error loading goals:', error)
    }
  }

  const openImportDialog = async () => {
    setShowImportDialog(true)
    // Завантажуємо цілі для AI prompt
    if (goals.length === 0) {
      try {
        const response = await fetch('/api/goals')
        const data = await response.json()
        if (data.goals) {
          setGoals(data.goals)
        }
      } catch (error) {
        console.error('Error loading goals:', error)
      }
    }
  }

  const createGoalBlock = (goal: { id: string; name: string; category: string; color: string; iconUrl: string }) => {
    const newNode: Node = {
      id: generateNodeId(),
      type: 'goalBlock',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      style: { width: 500 },
      data: {
        title: goal.name,
        goal_id: goal.id,
        color: goal.color,
        icon: goal.iconUrl,
        category: goal.category,
        isGoalBlock: true,
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowGoalDialog(false)

    // Track goal block creation
    if (currentCanvasId) {
      EventTracker.goalCreated(currentCanvasId, newNode.id, goal.name, goal.category, newNode.position)
    }
  }

  // Save status indicator component (compact for top panel)
  const SaveStatusIndicator = () => {
    if (saveStatus === 'idle') {
      return (
        <span className="opacity-50">●</span>
      )
    }
    if (saveStatus === 'saving') {
      return (
        <span className="text-blue-400 animate-pulse">●</span>
      )
    }
    if (saveStatus === 'saved') {
      return (
        <span className="text-green-400">●</span>
      )
    }
    if (saveStatus === 'error') {
      return (
        <span className="text-red-400">●</span>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Завантаження canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 4rem)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={canvasPermission === 'edit' ? onNodesChange : undefined}
        onEdgesChange={canvasPermission === 'edit' ? onEdgesChange : undefined}
        onConnect={canvasPermission === 'edit' ? onConnect : undefined}
        onConnectStart={canvasPermission === 'edit' ? onConnectStart : undefined}
        onConnectEnd={canvasPermission === 'edit' ? onConnectEnd : undefined}
        onNodeDrag={canvasPermission === 'edit' ? onNodeDrag : undefined}
        onNodeDragStop={canvasPermission === 'edit' ? onNodeDragStop : undefined}
        onPaneContextMenu={canvasPermission === 'edit' ? onPaneContextMenu : undefined}
        nodeTypes={nodeTypes}
        edgeTypes={memoizedEdgeTypes}
        fitView
        nodesDraggable={canvasPermission === 'edit'}
        nodesConnectable={canvasPermission === 'edit'}
        elementsSelectable={canvasPermission === 'edit'}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#000000', strokeWidth: 2 },
          interactionWidth: 50,
        }}
        connectionLineStyle={{ stroke: '#000000', strokeWidth: 2 }}
      >
        {/* View-only banner */}
        {canvasPermission === 'view' && (
          <Panel position="top-center" className="bg-amber-500/90 backdrop-blur-sm px-4 py-2 rounded text-white text-sm font-medium">
            👁️ Режим перегляду - редагування заборонено
          </Panel>
        )}

        {/* Інформаційна панель зверху зліва - як в TradingView */}
        <Panel position="top-left" className="bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded text-white text-xs font-mono flex items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="opacity-70">Блоків:</span> <span className="font-semibold">{nodes.length}</span>
            <span className="opacity-70">З'єднань:</span> <span className="font-semibold">{edges.length}</span>
            <span>
              <SaveStatusIndicator />
            </span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleCopyMarkdown}
              className="p-1 hover:bg-white/10 rounded transition-colors relative"
              title="Копіювати Markdown"
            >
              <Copy className={`h-4 w-4 ${copySuccess ? 'text-green-400' : ''}`} />
            </button>
            <button
              onClick={handleExportMarkdown}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Завантажити Markdown"
            >
              <Download className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={handleCopyJSON}
              className="p-1 hover:bg-white/10 rounded transition-colors relative"
              title="Копіювати JSON"
            >
              <FileJson className={`h-4 w-4 ${copySuccess ? 'text-green-400' : ''}`} />
            </button>
            <button
              onClick={handleExportJSON}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Завантажити JSON"
            >
              <Download className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={openImportDialog}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Імпортувати JSON"
            >
              <Upload className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={handleGenerateScreenshot}
              disabled={generatingScreenshot || !currentCanvasId}
              className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              title="Зробити screenshot і отримати посилання"
            >
              {generatingScreenshot ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          </div>
        </Panel>

        {/* Canvas Selector зверху справа */}
        <Panel position="top-right" className="m-2">
          <div className="flex items-center gap-2">
            <CanvasSelector
              currentCanvasId={currentCanvasId}
              currentCanvasTitle={canvasTitle}
              onCanvasChange={handleCanvasChange}
              onCanvasCreate={handleCanvasCreate}
              onCanvasRename={handleCanvasRename}
              onCanvasDelete={handleCanvasDelete}
            />
            {currentCanvasId && (
              <>
                <button
                  onClick={() => setShowRestoreDialog(true)}
                  className="p-2 bg-card border border-border rounded-md hover:bg-accent transition-colors"
                  title="Історія версій"
                >
                  <History className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowEventsDialog(true)}
                  className="p-2 bg-card border border-border rounded-md hover:bg-accent transition-colors"
                  title="Історія подій"
                >
                  <Activity className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="p-2 bg-card border border-border rounded-md hover:bg-accent transition-colors"
                  title="Поділитися Canvas"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </Panel>

        {/* Панель кнопок знизу */}
        {canvasPermission === 'edit' && (
          <Panel position="bottom-center" className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg">
            <div className="flex gap-2 p-3">
              <Button
                onClick={openGoalDialog}
                variant="default"
                size="default"
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Створити ціль
              </Button>
              <Button
                onClick={addNewBlock}
                variant="secondary"
                size="default"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Новий блок
              </Button>
              <Button
                onClick={handleManualSave}
                variant="outline"
                size="default"
                className="flex items-center gap-2"
                disabled={saveStatus === 'saving'}
              >
                <Save className="h-4 w-4" />
                Зберегти
              </Button>
            </div>
          </Panel>
        )}
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>

      {/* Модальне вікно для вибору цілі */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Оберіть ціль для canvas</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {goals.length === 0 ? (
              <p className="col-span-2 text-center text-muted-foreground py-4">
                Завантаження цілей...
              </p>
            ) : (
              goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => createGoalBlock(goal)}
                  className="p-4 border-2 border-border rounded-lg hover:border-primary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                        (() => {
                          const iconOption = getIconById(goal.iconUrl)
                          if (iconOption) {
                            const IconComponent = iconOption.Icon
                            return <IconComponent className="w-6 h-6" style={{ color: goal.color }} />
                          }
                          return null
                        })()
                      ) : goal.iconUrl ? (
                        <img
                          src={goal.iconUrl}
                          alt={goal.name}
                          className="w-full h-full object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{goal.name}</h3>
                      <p className="text-xs text-muted-foreground">{goal.category}</p>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-black"
                      style={{ backgroundColor: goal.color }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Контекстне меню для canvas */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          />
          <div
            className="fixed z-50 bg-white border-2 border-black rounded-md shadow-lg py-1 min-w-[180px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                const position = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y })
                const newNode: Node = {
                  id: generateNodeId(),
                  type: 'promptBlock',
                  position,
                  data: {
                    title: 'Новий блок',
                    prompts: [],
                  },
                }
                setNodes((nds) => [...nds, newNode])

                // Track block creation from context menu
                if (currentCanvasId) {
                  EventTracker.blockCreated(currentCanvasId, newNode.id, 'Новий блок', 'prompt', position)
                }

                setContextMenu(null)
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
            >
              Створити блок
            </button>
            <button
              onClick={() => {
                setContextMenu(null)
                openGoalDialog()
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
            >
              Створити ціль
            </button>
            {copiedNode && (
              <button
                onClick={() => {
                  const position = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y })
                  handlePasteNode(position)
                }}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors border-t border-border"
              >
                Вставити блок
              </button>
            )}
          </div>
        </>
      )}

      {/* Share Canvas Dialog */}
      {currentCanvasId && (
        <ShareCanvasDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          canvasId={currentCanvasId}
          canvasTitle={canvasTitle}
        />
      )}

      {/* Screenshot Link Dialog */}
      <ScreenshotLinkDialog
        open={showScreenshotDialog}
        onOpenChange={setShowScreenshotDialog}
        screenshotUrl={screenshotUrl}
        canvasTitle={canvasTitle}
      />

      {/* Restore Backup Dialog */}
      {currentCanvasId && (
        <RestoreBackupDialog
          open={showRestoreDialog}
          onOpenChange={setShowRestoreDialog}
          canvasId={currentCanvasId}
          onRestore={(restoredNodes, restoredEdges) => {
            setNodes(restoredNodes)
            setEdges(restoredEdges)
            // Force immediate save
            if (autosaveRef.current) {
              autosaveRef.current.saveNow(restoredNodes, restoredEdges)
            }
          }}
        />
      )}

      {/* Save Slots Dialog */}
      {currentCanvasId && (
        <SaveSlotsDialog
          open={showSaveSlotsDialog}
          onOpenChange={setShowSaveSlotsDialog}
          canvasId={currentCanvasId}
          currentNodes={nodes}
          currentEdges={edges}
          currentSlotNumber={currentSlotNumber}
          onLoadSlot={handleLoadSlot}
        />
      )}

      {/* Canvas Events Dialog */}
      {currentCanvasId && (
        <CanvasEventsDialog
          open={showEventsDialog}
          onOpenChange={setShowEventsDialog}
          canvasId={currentCanvasId}
        />
      )}

      {/* Import JSON Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Імпортувати Canvas з JSON</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* AI Generator Section */}
            <div>
              <label className="text-sm font-medium block mb-3">Створи власний Canvas з AI</label>

              {/* Goal Selection and Copy Button */}
              <div className="flex items-center gap-2 mb-3">
                <Select value={selectedGoalForAI} onValueChange={setSelectedGoalForAI}>
                  <SelectTrigger className="h-9 w-[280px]">
                    <SelectValue placeholder="Обери ціль..." />
                  </SelectTrigger>
                  <SelectContent>
                    {goals.map((goal) => {
                      const meta = getCategoryMeta(goal.category as any)
                      return (
                        <SelectItem key={goal.id} value={goal.id}>
                          <div className="flex items-center gap-2">
                            {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                              (() => {
                                const iconOption = getIconById(goal.iconUrl!)
                                if (iconOption) {
                                  const IconComponent = iconOption.Icon
                                  return <IconComponent className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} />
                                }
                                return null
                              })()
                            ) : goal.iconUrl ? (
                              <img
                                src={goal.iconUrl}
                                alt={goal.name}
                                className="w-4 h-4 object-contain flex-shrink-0"
                              />
                            ) : (
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: meta.color }}
                              />
                            )}
                            <span className="truncate">{goal.name}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleCopyAIPrompt}
                  variant="outline"
                  size="sm"
                  disabled={!selectedGoalForAI}
                  className="h-9 whitespace-nowrap"
                >
                  {promptCopied ? 'Скопійовано!' : 'Скопіювати промпт'}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Обери ціль та скопіюй промпт. Вставте його в чат з AI (ChatGPT, Claude, Gemini), і він згенерує JSON на основі вашої розмови. Потім вставте JSON нижче.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">або вставте готовий JSON</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Manual Import Section */}
            <div>
              <textarea
                value={importJsonText}
                onChange={(e) => {
                  setImportJsonText(e.target.value)
                  setImportError(null)
                }}
                placeholder='{"version": "1.0", "canvasTitle": "My Canvas", "nodes": [...], "edges": [...]}'
                className="w-full min-h-[300px] px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono resize-none"
              />
            </div>

            {importError && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false)
                  setImportJsonText('')
                  setImportError(null)
                  setPromptCopied(false)
                  setSelectedGoalForAI('')
                }}
              >
                Скасувати
              </Button>
              <Button
                onClick={handleImportJSON}
                disabled={!importJsonText.trim()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Імпортувати
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CanvasClient() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <CanvasFlow />
      </Suspense>
    </ReactFlowProvider>
  )
}
