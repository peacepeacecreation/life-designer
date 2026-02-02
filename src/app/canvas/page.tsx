'use client'

import { useCallback, useState, useRef } from 'react'
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
import { Plus } from 'lucide-react'

const nodeTypes = {
  promptBlock: PromptBlockNode,
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'promptBlock',
    position: { x: 250, y: 100 },
    data: {
      title: 'Приклад блоку',
      prompts: [
        { id: 'p1', content: 'Як інтегрувати Clockify API?' },
        { id: 'p2', content: 'Який формат даних повертає API?' },
      ],
    },
  },
]

const initialEdges: Edge[] = []

function CanvasFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { screenToFlowPosition } = useReactFlow()
  const connectingNodeId = useRef<string | null>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onConnectStart = useCallback((_: any, { nodeId }: any) => {
    connectingNodeId.current = nodeId
  }, [])

  const onConnectEnd = useCallback(
    (event: any) => {
      if (!connectingNodeId.current) return

      const targetIsPane = event.target.classList.contains('react-flow__pane')

      if (targetIsPane) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        const newNode: Node = {
          id: `${Date.now()}`,
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
              sourceHandle: null,
              targetHandle: null,
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
      id: `${Date.now()}`,
      type: 'promptBlock',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        title: 'Новий блок',
        prompts: [],
      },
    }
    setNodes((nds) => [...nds, newNode])
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
        fitView
      >
        <Panel position="top-left" className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <h1 className="text-xl font-bold mb-2">Робочий Canvas</h1>
          <button
            onClick={addNewBlock}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Новий блок
          </button>
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
