'use client'

import { useComponentsContext, useBlockNoteEditor } from '@blocknote/react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
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

  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.left,
        })
      }
    }

    if (showMenu) {
      updatePosition()
      // Update on scroll/resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)

      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showMenu])

  return (
    <>
      <div ref={buttonRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: showMenu ? '#f3f4f6' : 'white',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing && !showMenu) {
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }
          }}
          onMouseLeave={(e) => {
            if (!showMenu) {
              e.currentTarget.style.backgroundColor = 'white'
            }
          }}
        >
          <Sparkles
            style={{
              width: '16px',
              height: '16px',
              color: 'rgb(147, 51, 234)',
            }}
            className={isProcessing ? 'animate-spin' : ''}
          />
          <span>AI Formatter</span>
          <ChevronDown
            style={{
              width: '14px',
              height: '14px',
              color: '#6b7280',
              transition: 'transform 0.15s',
              transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </div>
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowMenu(false)}
          />
          {/* Dropdown menu */}
          <div
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              minWidth: '180px',
              padding: '4px 0',
            }}
          >
            {formatOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  handleFormat(opt.value as FormatType)
                  setShowMenu(false)
                }}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  border: 'none',
                  background: 'transparent',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
