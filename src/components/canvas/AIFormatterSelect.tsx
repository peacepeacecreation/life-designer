'use client'

import { useComponentsContext, useBlockNoteEditor } from '@blocknote/react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@/hooks/use-toast'

type FormatType =
  | 'list'
  | 'checklist'
  | 'table'
  | 'custom'
  | 'numberedlist'
  | 'keypoints'
  | 'actions'
  | 'fixstyle'
  | 'makeconcise'
  | 'nowater'

interface FormatOption {
  name: string
  value: FormatType
  command: string
}

// Helper function to parse AI response into BlockNote blocks
function parseTextToBlocks(text: string): any[] {
  const lines = text.split('\n')
  const blocks: any[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) continue // Skip empty lines

    // Check for heading (# Heading)
    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)?.[0].length || 1
      const content = trimmed.replace(/^#+\s*/, '')
      blocks.push({
        type: 'heading',
        props: { level: Math.min(level, 3) },
        content,
      })
    }
    // Check for bullet list (- item or * item)
    else if (trimmed.match(/^[-*•]\s+/)) {
      const content = trimmed.replace(/^[-*•]\s+/, '')
      blocks.push({
        type: 'bulletListItem',
        content,
      })
    }
    // Check for numbered list (1. item)
    else if (trimmed.match(/^\d+\.\s+/)) {
      const content = trimmed.replace(/^\d+\.\s+/, '')
      blocks.push({
        type: 'numberedListItem',
        content,
      })
    }
    // Regular paragraph
    else {
      blocks.push({
        type: 'paragraph',
        content: trimmed,
      })
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: text }]
}

export function AIFormatterSelect() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor()
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('custom')
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const position = {
        top: rect.bottom + 4,
        left: rect.left,
      }
      console.log('Dropdown position:', position, 'Button rect:', rect)
      setDropdownPosition(position)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const formatOptions: FormatOption[] = [
    { name: 'Таблиця', value: 'table', command: 'parsetable' },
    { name: 'Список', value: 'list', command: 'formatlist' },
    { name: 'Нумерований список', value: 'numberedlist', command: 'formatnumberedlist' },
    { name: 'Чек-лист', value: 'checklist', command: 'formatchecklist' },
    { name: 'Ключові пункти', value: 'keypoints', command: 'formatkeypoints' },
    { name: 'Список дій', value: 'actions', command: 'formatactions' },
    { name: 'Прирівняти стиль', value: 'fixstyle', command: 'fixstyle' },
    { name: 'Зробити коротше', value: 'makeconcise', command: 'makeconcise' },
    { name: 'Без води', value: 'nowater', command: 'removewater' },
    { name: 'Довільний', value: 'custom', command: 'improve' },
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

      // For improve, removewater, and fixstyle, include full note context
      let fullContext = ''
      if (formatType === 'custom' || formatType === 'nowater' || formatType === 'fixstyle') {
        const allBlocks = editor.document
        fullContext = editor.blocksToMarkdownLossy(allBlocks)
      }

      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: selectedText,
          command: option.command,
          context: fullContext || undefined,
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
        // Parse table JSON (remove markdown code blocks if present)
        let jsonString = data.completion.trim()

        // Remove markdown code blocks
        if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '')
        }

        const tableData = JSON.parse(jsonString)
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
      } else if (formatType === 'list' || formatType === 'keypoints') {
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
      } else if (formatType === 'numberedlist') {
        // Parse as numbered list items
        const lines = data.completion.split('\n').filter((l: string) => l.trim())
        const numberedBlocks = lines.map((line: string) => ({
          type: 'numberedListItem',
          content: line.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, ''),
        }))

        if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
          editor.insertBlocks(
            numberedBlocks as any,
            updatedBlocks[firstSelectedIndex - 1],
            'after'
          )
        } else {
          if (updatedBlocks[0]) {
            editor.insertBlocks(numberedBlocks as any, updatedBlocks[0], 'before')
          }
        }
      } else if (formatType === 'actions') {
        // Parse as checklist items with action focus
        const lines = data.completion.split('\n').filter((l: string) => l.trim())
        const actionBlocks = lines.map((line: string) => ({
          type: 'checkListItem',
          content: line.replace(/^[-*•]\s*/, '').replace(/^\[[ x]\]\s*/i, ''),
        }))

        if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
          editor.insertBlocks(
            actionBlocks as any,
            updatedBlocks[firstSelectedIndex - 1],
            'after'
          )
        } else {
          if (updatedBlocks[0]) {
            editor.insertBlocks(actionBlocks as any, updatedBlocks[0], 'before')
          }
        }
      } else {
        // Custom/default/fixstyle/makeconcise/nowater - parse and insert with structure
        const blocks = parseTextToBlocks(data.completion)

        if (firstSelectedIndex > 0 && updatedBlocks[firstSelectedIndex - 1]) {
          editor.insertBlocks(
            blocks as any,
            updatedBlocks[firstSelectedIndex - 1],
            'after'
          )
        } else {
          if (updatedBlocks[0]) {
            editor.insertBlocks(blocks as any, updatedBlocks[0], 'before')
          }
        }
      }

      toast({
        title: '✨ Форматування завершено',
        description: `Текст відформатовано: ${option.name}`,
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

  const currentOption = formatOptions.find((opt) => opt.value === selectedFormat) || formatOptions[formatOptions.length - 1]

  const dropdownMenu = isOpen && (
    <div
      ref={dropdownRef}
      onClick={() => console.log('Dropdown clicked!')}
      onWheel={(e) => {
        console.log('Dropdown wheel event')
        // Prevent scroll from propagating to parent elements
        e.stopPropagation()

        // Allow scrolling within the dropdown
        const target = e.currentTarget
        const atTop = target.scrollTop === 0
        const atBottom = target.scrollHeight - target.scrollTop === target.clientHeight

        // Prevent default only if we're at the edge and trying to scroll further
        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
          e.preventDefault()
        }
      }}
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        backgroundColor: 'white',
        border: '2px solid #6366f1',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        zIndex: 2147483647,
        minWidth: '220px',
        maxHeight: '320px',
        overflowY: 'auto',
        pointerEvents: 'auto',
      }}
    >
      {formatOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => {
            setSelectedFormat(option.value)
            handleFormat(option.value)
            setIsOpen(false)
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            textAlign: 'left',
            border: 'none',
            background: selectedFormat === option.value ? '#f3f4f6' : 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: selectedFormat === option.value ? '500' : '400',
          }}
          onMouseEnter={(e) => {
            if (selectedFormat !== option.value) {
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedFormat !== option.value) {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          {option.name}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <div ref={buttonRef}>
        <Components.FormattingToolbar.Button
          mainTooltip="AI Форматування"
          onClick={() => setIsOpen(!isOpen)}
          isDisabled={isProcessing}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles
              style={{
                width: '14px',
                height: '14px',
                color: 'rgb(147, 51, 234)',
              }}
              className={isProcessing ? 'animate-spin' : ''}
            />
            <span style={{ fontSize: '12px' }}>{currentOption.name}</span>
            <ChevronDown style={{ width: '12px', height: '12px' }} />
          </div>
        </Components.FormattingToolbar.Button>
      </div>

      {typeof window !== 'undefined' && dropdownMenu && createPortal(dropdownMenu, document.body)}
    </>
  )
}
