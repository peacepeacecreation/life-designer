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
import { Plus, Save, Cloud, AlertCircle, Loader2, Target, Download, Copy, FileJson, Share2, Camera } from 'lucide-react'
import { createAutosave, SaveStatus } from '@/lib/canvas/autosave'
import { generateNodeId } from '@/lib/canvas/utils'
import { exportCanvasToMarkdown, downloadMarkdown, exportCanvasToJSON, downloadJSON } from '@/lib/canvas/markdown-exporter'
import ShareCanvasDialog from '@/components/canvas/ShareCanvasDialog'
import { generateCanvasPreview } from '@/lib/canvas/screenshot'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getIconById, isPredefinedIcon } from '@/lib/goalIcons'

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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
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
  const [generatingScreenshot, setGeneratingScreenshot] = useState(false)
  const [canvasPermission, setCanvasPermission] = useState<'view' | 'edit'>('edit')
  const [isOwner, setIsOwner] = useState(true)
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

  // Update all nodes with isConnecting state and copy callback
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isConnecting,
          onCopyNode: () => handleCopyNode(node.id),
        },
      }))
    )
  }, [isConnecting, handleCopyNode, setNodes])

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
    if (autosaveRef.current) {
      autosaveRef.current.saveNow(nodes, edges)
    }
  }, [nodes, edges])

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
      await generateCanvasPreview(currentCanvasId)
      alert('Screenshot згенеровано! Тепер посилання матиме превью.')
    } catch (error) {
      console.error('Failed to generate screenshot:', error)
      alert('Помилка при генерації screenshot')
    } finally {
      setGeneratingScreenshot(false)
    }
  }, [currentCanvasId])

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
      setContextMenu(null)
    }
  }, [copiedNode, setNodes])

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

        // Знайти source node і отримати останній редагований промпт
        const sourceNode = nodesRef.current.find(n => n.id === connectingNodeId.current)
        const lastPromptText = sourceNode?.data?.lastEditedPromptText

        // Використати текст промпта як назву (максимум 21 символ)
        let newBlockTitle = 'Новий блок'
        if (lastPromptText && lastPromptText.trim()) {
          newBlockTitle = lastPromptText.length > 21
            ? lastPromptText.substring(0, 21) + '...'
            : lastPromptText
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
              onClick={handleGenerateScreenshot}
              disabled={generatingScreenshot || !currentCanvasId}
              className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              title="Згенерувати превью для посилання"
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
              <button
                onClick={() => setShowShareDialog(true)}
                className="p-2 bg-card border border-border rounded-md hover:bg-accent transition-colors"
                title="Поділитися Canvas"
              >
                <Share2 className="h-4 w-4" />
              </button>
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
    </div>
  )
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <CanvasFlow />
      </Suspense>
    </ReactFlowProvider>
  )
}
