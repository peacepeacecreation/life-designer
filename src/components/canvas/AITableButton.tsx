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
      const tableData = JSON.parse(data.completion)

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

      // Remove selected blocks
      for (let i = selection.blocks.length - 1; i >= 0; i--) {
        editor.removeBlocks([selection.blocks[i]])
      }

      // Insert table at the position of first selected block
      editor.insertBlocks([tableBlock as any], selection.blocks[0], 'before')

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
