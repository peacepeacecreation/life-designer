'use client'

import { useComponentsContext, useBlockNoteEditor } from '@blocknote/react'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

export function AITableButton() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor()
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleClick = async () => {

    if (!editor || isProcessing) return

    // Get selected blocks
    const selection = editor.getSelection()
    if (!selection || selection.blocks.length === 0) {
      toast({
        title: 'Виділіть текст',
        description: 'Спочатку виділіть текст з таблицею',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      // Get selected text as markdown
      const selectedText = editor.blocksToMarkdownLossy(selection.blocks)

      // Call AI API
      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: selectedText,
          command: 'parsetable',
        }),
      })

      if (!response.ok) {
        throw new Error('AI processing failed')
      }

      const data = await response.json()

      // Parse table JSON (remove markdown code blocks if present)
      let jsonString = data.completion.trim()

      // Remove markdown code blocks
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '')
      }

      const tableData = JSON.parse(jsonString)

      // Create BlockNote table structure
      const tableBlock = {
        type: 'table',
        content: {
          type: 'tableContent',
          rows: tableData.rows.map((row: string[]) => ({
            cells: row.map((cell: string) => [{ type: 'text', text: cell, styles: {} }]),
          })),
        },
      }

      // Get the block before the selection to use as insertion point
      const allBlocks = editor.document
      const firstSelectedIndex = allBlocks.findIndex((b: any) => b.id === selection.blocks[0].id)

      // Remove selected blocks
      for (let i = selection.blocks.length - 1; i >= 0; i--) {
        editor.removeBlocks([selection.blocks[i]])
      }

      // Get updated document and insert at the same index
      const updatedBlocks = editor.document
      if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
        // Insert after the block before the selection
        editor.insertBlocks([tableBlock as any], updatedBlocks[firstSelectedIndex - 1], 'after')
      } else if (updatedBlocks[0]) {
        // Insert at the beginning
        editor.insertBlocks([tableBlock as any], updatedBlocks[0], 'before')
      }
      // If no blocks exist, BlockNote will handle it automatically

      toast({
        title: '✨ Таблицю створено',
        description: 'AI перетворив текст у таблицю',
      })
    } catch (error) {
      console.error('AI table error:', error)
      toast({
        title: 'Помилка обробки',
        description: 'Не вдалося створити таблицю. Спробуйте ще раз.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Components.Generic.Toolbar.Button
      mainTooltip="AI Таблиця"
      onClick={handleClick}
      isDisabled={isProcessing}
    >
      <Sparkles
        className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`}
        style={{ color: 'rgb(147, 51, 234)' }}
      />
    </Components.Generic.Toolbar.Button>
  )
}
