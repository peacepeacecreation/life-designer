/**
 * Canvas types for TypeScript
 */

import { Node, Edge } from 'reactflow'

export interface PromptItem {
  id: string
  content: string
}

export interface PromptBlockData {
  title: string
  prompts: PromptItem[]
  goal_id?: string
  goal_title?: string
  lastEditedPromptText?: string
}

export type CanvasNode = Node<PromptBlockData>
export type CanvasEdge = Edge

export interface CanvasWorkspace {
  id: string
  user_id: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  title: string
  last_modified_at: string
  created_at: string
  updated_at: string
}

export interface AutosaveResponse {
  success: boolean
  canvasId: string
  action: 'created' | 'updated'
}

export interface LoadCanvasResponse {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  title: string
  canvasId?: string
  lastModified?: string
  exists: boolean
}
