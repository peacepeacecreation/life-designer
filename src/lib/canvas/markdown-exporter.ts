/**
 * Canvas to Markdown Exporter
 *
 * Converts React Flow canvas structure (nodes + edges) to hierarchical Markdown format
 */

import { Node, Edge } from 'reactflow'

interface PromptItem {
  id: string
  content: string
  completed?: boolean
}

interface PromptBlockData {
  title: string
  prompts: PromptItem[]
  goal_id?: string
  goal_title?: string
  priority?: string
  scheduled_date?: string
  scheduled_time?: string
  color?: string
}

interface GoalBlockData {
  title: string
  goal_id: string
  color?: string
  category?: string
  icon?: string
  isGoalBlock: true
}

interface NodeWithChildren {
  node: Node
  children: NodeWithChildren[]
  level: number
}

/**
 * Build hierarchical tree from flat nodes and edges
 */
function buildHierarchy(nodes: Node[], edges: Edge[]): NodeWithChildren[] {
  // Create a map of node ID to its children
  const childrenMap = new Map<string, string[]>()

  edges.forEach(edge => {
    const children = childrenMap.get(edge.source) || []
    children.push(edge.target)
    childrenMap.set(edge.source, children)
  })

  // Find root nodes (nodes with no incoming edges)
  const targetIds = new Set(edges.map(e => e.target))
  const rootNodes = nodes.filter(node => !targetIds.has(node.id))

  // Recursively build tree
  function buildNode(nodeId: string, level: number): NodeWithChildren | null {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return null

    const childIds = childrenMap.get(nodeId) || []
    const children = childIds
      .map(childId => buildNode(childId, level + 1))
      .filter(Boolean) as NodeWithChildren[]

    return { node, children, level }
  }

  return rootNodes
    .map(node => buildNode(node.id, 0))
    .filter(Boolean) as NodeWithChildren[]
}

/**
 * Convert a node to markdown based on its type and level
 */
function nodeToMarkdown(nodeWithChildren: NodeWithChildren, level: number = 0): string {
  const { node, children } = nodeWithChildren
  let markdown = ''

  // Determine heading level (min 2, max 6)
  const headingLevel = Math.min(Math.max(level + 2, 2), 6)
  const heading = '#'.repeat(headingLevel)

  if (node.type === 'goalBlock') {
    // Goal block
    const data = node.data as GoalBlockData
    markdown += `${heading} 🎯 Ціль: ${data.title}\n\n`

    if (data.category) {
      markdown += `**Категорія:** ${data.category}\n\n`
    }

    if (data.color) {
      markdown += `**Колір:** ${data.color}\n\n`
    }

    markdown += '---\n\n'
  } else if (node.type === 'promptBlock') {
    // Prompt block (task/subtask)
    const data = node.data as PromptBlockData
    const taskType = level === 1 ? 'Таска' : level === 2 ? 'Підтаска' : 'Блок'

    markdown += `${heading} ${taskType}: ${data.title}\n\n`

    // Add metadata
    const metadata: string[] = []

    if (data.priority && data.priority !== 'P0') {
      markdown += `**Пріоритет:** ${data.priority}\n\n`
    }

    if (data.scheduled_date) {
      const date = new Date(data.scheduled_date)
      const formattedDate = date.toLocaleDateString('uk-UA')
      markdown += `**Заплановано:** ${formattedDate}`
      if (data.scheduled_time) {
        markdown += ` о ${data.scheduled_time}`
      }
      markdown += '\n\n'
    }

    if (data.color && data.color !== '#000000') {
      markdown += `**Колір:** ${data.color}\n\n`
    }

    if (data.prompts && data.prompts.length > 0) {
      markdown += '**Список задач:**\n\n'
      data.prompts.forEach((prompt) => {
        const checkbox = prompt.completed ? '[x]' : '[ ]'
        markdown += `- ${checkbox} ${prompt.content}\n`
      })
      markdown += '\n'
    }
  }

  // Add children recursively
  if (children.length > 0) {
    children.forEach(child => {
      markdown += nodeToMarkdown(child, level + 1)
    })
  }

  return markdown
}

/**
 * Export canvas to Markdown format
 */
export function exportCanvasToMarkdown(
  nodes: Node[],
  edges: Edge[],
  canvasTitle: string = 'Canvas'
): string {
  let markdown = `# ${canvasTitle}\n\n`
  markdown += `*Експортовано: ${new Date().toLocaleString('uk-UA')}*\n\n`
  markdown += '---\n\n'

  // Build hierarchy
  const hierarchy = buildHierarchy(nodes, edges)

  if (hierarchy.length === 0) {
    markdown += '*Canvas порожній*\n'
    return markdown
  }

  // Convert each root node and its children to markdown
  hierarchy.forEach(rootNode => {
    markdown += nodeToMarkdown(rootNode, 0)
    markdown += '\n'
  })

  // Add stats at the end
  markdown += '---\n\n'
  markdown += '## 📊 Статистика\n\n'
  markdown += `- **Всього блоків:** ${nodes.length}\n`
  markdown += `- **Цілей:** ${nodes.filter(n => n.type === 'goalBlock').length}\n`
  markdown += `- **Тасок:** ${nodes.filter(n => n.type === 'promptBlock').length}\n`
  markdown += `- **Зв'язків:** ${edges.length}\n`

  return markdown
}

/**
 * Download markdown as file
 */
export function downloadMarkdown(content: string, filename: string = 'canvas.md') {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
