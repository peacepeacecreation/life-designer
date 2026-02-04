'use client'

import { useComponentsContext, useBlockNoteEditor } from '@blocknote/react'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

type FormatType = 'list' | 'checklist' | 'table' | 'custom'

export function AIFormatterSelect() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor()
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const formatOptions = [
    { value: 'list', label: '📝 Список', command: 'formatlist' },
    { value: 'checklist', label: '✅ Чек-лист', command: 'formatchecklist' },
    { value: 'table', label: '📊 Таблиця', command: 'parsetable' },
    { value: 'custom', label: '✨ Довільний', command: 'improve' },
  ]

  const handleFormat = async (formatType: FormatType) => {
    if (!editor || isProcessing) return

    const selection = editor.getSelection()
    if (!selection || selection.blocks.length === 0) {
      toast({
        title: 'Виділіть текст',
        description: 'Спочатку виділіть текст для форматування',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      const selectedText = editor.blocksToMarkdownLossy(selection.blocks)
      const option = formatOptions.find((o) => o.value === formatType)!

      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: selectedText,
          command: option.command,
        }),
      })

      if (!response.ok) {
        throw new Error('AI processing failed')
      }

      const data = await response.json()

      // Get the block before the selection
      const allBlocks = editor.document
      const firstSelectedIndex = allBlocks.findIndex(
        (b: any) => b.id === selection.blocks[0].id
      )

      // Remove selected blocks
      for (let i = selection.blocks.length - 1; i >= 0; i--) {
        editor.removeBlocks([selection.blocks[i]])
      }

      const updatedBlocks = editor.document

      if (formatType === 'table') {
        // Parse table JSON
        const tableData = JSON.parse(data.completion)
        const tableBlock = {
          type: 'table',
          content: {
            type: 'tableContent',
            rows: tableData.rows.map((row: string[]) => ({
              cells: row.map((cell: string) => [
                { type: 'text', text: cell, styles: {} },
              ]),
            })),
          },
        }

        if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
          editor.insertBlocks(
            [tableBlock as any],
            updatedBlocks[firstSelectedIndex - 1],
            'after'
          )
        } else {
          // Insert at the beginning or as first block
          if (updatedBlocks[0]) {
            editor.insertBlocks([tableBlock as any], updatedBlocks[0], 'before')
          }
        }
      } else if (formatType === 'checklist') {
        // Parse as bullet list items with checkboxes
        const lines = data.completion.split('\n').filter((l: string) => l.trim())
        const checklistBlocks = lines.map((line: string) => ({
          type: 'checkListItem',
          content: line.replace(/^[-*•]\s*/, '').replace(/^\[[ x]\]\s*/i, ''),
        }))

        if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
          editor.insertBlocks(
            checklistBlocks as any,
            updatedBlocks[firstSelectedIndex - 1],
            'after'
          )
        } else {
          if (updatedBlocks[0]) {
            editor.insertBlocks(checklistBlocks as any, updatedBlocks[0], 'before')
          }
        }
      } else if (formatType === 'list') {
        // Parse as bullet list items
        const lines = data.completion.split('\n').filter((l: string) => l.trim())
        const listBlocks = lines.map((line: string) => ({
          type: 'bulletListItem',
          content: line.replace(/^[-*•]\s*/, ''),
        }))

        if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
          editor.insertBlocks(
            listBlocks as any,
            updatedBlocks[firstSelectedIndex - 1],
            'after'
          )
        } else {
          if (updatedBlocks[0]) {
            editor.insertBlocks(listBlocks as any, updatedBlocks[0], 'before')
          }
        }
      } else {
        // Custom/default - just insert as paragraph
        const block = {
          type: 'paragraph',
          content: data.completion,
        }

        if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
          editor.insertBlocks(
            [block as any],
            updatedBlocks[firstSelectedIndex - 1],
            'after'
          )
        } else {
          if (updatedBlocks[0]) {
            editor.insertBlocks([block as any], updatedBlocks[0], 'before')
          }
        }
      }

      toast({
        title: '✨ Форматування завершено',
        description: `Текст відформатовано: ${option.label}`,
      })
    } catch (error) {
      console.error('AI formatter error:', error)
      toast({
        title: 'Помилка обробки',
        description: 'Не вдалося відформатувати текст. Спробуйте ще раз.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Components.Generic.Toolbar.Select
      items={formatOptions.map((opt) => ({
        ...opt,
        onClick: () => handleFormat(opt.value as FormatType),
      }))}
      isDisabled={isProcessing}
    >
      <div className="flex items-center gap-1">
        <Sparkles
          className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`}
          style={{ color: 'rgb(147, 51, 234)' }}
        />
        <span className="text-sm">AI Formatter</span>
      </div>
    </Components.Generic.Toolbar.Select>
  )
}
