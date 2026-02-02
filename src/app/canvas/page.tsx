'use client'

import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
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
import CustomEdge from '@/components/canvas/CustomEdge'
import { Plus, Save, Cloud, AlertCircle, Loader2 } from 'lucide-react'
import { createAutosave, SaveStatus } from '@/lib/canvas/autosave'
import { generateNodeId } from '@/lib/canvas/utils'

const nodeTypes = {
  promptBlock: PromptBlockNode,
}

const edgeTypes = {
  default: CustomEdge,
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

function CanvasFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isLoading, setIsLoading] = useState(true)
  const { screenToFlowPosition } = useReactFlow()
  const connectingNodeId = useRef<string | null>(null)
  const connectingHandleId = useRef<string | null>(null)
  const autosaveRef = useRef<ReturnType<typeof createAutosave> | null>(null)

  const memoizedEdgeTypes = useMemo(() => edgeTypes, [])

  // Initialize autosave and load saved canvas
  useEffect(() => {
    autosaveRef.current = createAutosave({
      debounceMs: 3000,
      onStatusChange: (status) => {
        setSaveStatus(status)
      },
      onError: (error) => {
        console.error('Autosave error:', error)
      },
    })

    // Load saved canvas
    autosaveRef.current.load().then((data) => {
      if (data.exists && (data.nodes.length > 0 || data.edges.length > 0)) {
        setNodes(data.nodes)
        setEdges(data.edges)
      }
      setIsLoading(false)
    })

    return () => {
      autosaveRef.current?.destroy()
    }
  }, [setNodes, setEdges])

  // Autosave on changes
  useEffect(() => {
    if (!isLoading && autosaveRef.current) {
      autosaveRef.current.scheduleSave(nodes, edges)
    }
  }, [nodes, edges, isLoading])

  const handleManualSave = useCallback(() => {
    if (autosaveRef.current) {
      autosaveRef.current.saveNow(nodes, edges)
    }
  }, [nodes, edges])

  const handleClearCanvas = useCallback(() => {
    if (confirm('Видалити всі блоки та з\'єднання?')) {
      setNodes([])
      setEdges([])
      if (autosaveRef.current) {
        autosaveRef.current.saveNow([], [])
      }
    }
  }, [setNodes, setEdges])

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

  const onConnectStart = useCallback((_: any, { nodeId, handleId, handleType }: any) => {
    console.log('onConnectStart:', { nodeId, handleId, handleType })
    connectingNodeId.current = nodeId
    connectingHandleId.current = handleId
  }, [])

  const onConnectEnd = useCallback(
    (event: any) => {
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
        setEdges((eds) =>
          addEdge(
            {
              source: connectingNodeId.current!,
              target: newNode.id,
              sourceHandle: connectingHandleId.current,
              targetHandle: 'target-left',
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

  // Save status indicator component
  const SaveStatusIndicator = () => {
    if (saveStatus === 'idle') {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Cloud className="h-4 w-4" />
          <span className="text-sm">Не збережено</span>
        </div>
      )
    }
    if (saveStatus === 'saving') {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Збереження...</span>
        </div>
      )
    }
    if (saveStatus === 'saved') {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Cloud className="h-4 w-4" />
          <span className="text-sm">Збережено</span>
        </div>
      )
    }
    if (saveStatus === 'error') {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Помилка</span>
        </div>
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
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={memoizedEdgeTypes}
        fitView
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#000000', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: '#000000', strokeWidth: 2 }}
      >
        <Panel position="top-left" className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <h1 className="text-xl font-bold mb-2">Робочий Canvas</h1>
          <p className="text-sm text-muted-foreground mb-2">
            Блоків: {nodes.length} | З'єднань: {edges.length}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={addNewBlock}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Новий блок
            </button>
            <button
              onClick={handleManualSave}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
              disabled={saveStatus === 'saving'}
            >
              <Save className="h-4 w-4" />
              Зберегти зараз
            </button>
            <button
              onClick={handleClearCanvas}
              className="px-4 py-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors flex items-center gap-2 text-sm"
            >
              <AlertCircle className="h-4 w-4" />
              Очистити canvas
            </button>
            <div className="mt-2 pt-2 border-t border-border">
              <SaveStatusIndicator />
            </div>
          </div>
        </Panel>
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  )
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  )
}
