'use client'

import { useState, useEffect } from 'react'
import { Share2, Copy, Check, X, Eye, Edit, Camera } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { generateCanvasPreview } from '@/lib/canvas/screenshot'

interface Share {
  id: string
  shared_with_email: string
  permission_level: 'view' | 'edit'
  created_at: string
}

interface ShareCanvasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canvasId: string
  canvasTitle: string
}

export default function ShareCanvasDialog({
  open,
  onOpenChange,
  canvasId,
  canvasTitle,
}: ShareCanvasDialogProps) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [shares, setShares] = useState<Share[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatingScreenshot, setGeneratingScreenshot] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)

  // Load shares and generate screenshot when dialog opens
  useEffect(() => {
    if (open) {
      loadShares()
      generateScreenshot()
    }
  }, [open, canvasId])

  const loadShares = async () => {
    try {
      const response = await fetch(`/api/canvas/${canvasId}/share`)
      if (response.ok) {
        const data = await response.json()
        setShares(data.shares || [])
      }
    } catch (error) {
      console.error('Error loading shares:', error)
    }
  }

  const generateScreenshot = async () => {
    setGeneratingScreenshot(true)
    try {
      const url = await generateCanvasPreview(canvasId)
      setScreenshotUrl(url)
    } catch (error) {
      console.error('Error generating screenshot:', error)
      // Don't show error to user - screenshot is optional
    } finally {
      setGeneratingScreenshot(false)
    }
  }

  const handleShare = async () => {
    if (!email.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/canvas/${canvasId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), permission }),
      })

      if (response.ok) {
        setEmail('')
        setPermission('view')
        loadShares()
      } else {
        const data = await response.json()
        console.error('Share error:', data)
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        alert(errorMsg || 'Failed to share canvas')
      }
    } catch (error) {
      console.error('Error sharing canvas:', error)
      alert('Failed to share canvas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveShare = async (shareEmail: string) => {
    if (!confirm(`Видалити доступ для ${shareEmail}?`)) return

    try {
      const response = await fetch(`/api/canvas/${canvasId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail }),
      })

      if (response.ok) {
        loadShares()
      }
    } catch (error) {
      console.error('Error removing share:', error)
    }
  }

  const copyLink = async () => {
    const link = `${window.location.origin}/canvas?id=${canvasId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Поділитися Canvas: {canvasTitle}</DialogTitle>
          <DialogDescription>
            Надайте доступ іншим користувачам або скопіюйте посилання для спільного доступу
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading overlay */}
          {generatingScreenshot && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Copy Link Section */}
          {!generatingScreenshot && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Посилання на Canvas</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/canvas?id=${canvasId}`}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-muted"
              />
              <Button
                onClick={copyLink}
                variant="outline"
                size="sm"
                disabled={generatingScreenshot}
                className="flex items-center gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Скопійовано' : 'Копіювати'}
              </Button>
            </div>
          </div>

          {/* Add User Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Надати доступ користувачу</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !generatingScreenshot && handleShare()}
                placeholder="email@example.com"
                disabled={generatingScreenshot}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                disabled={generatingScreenshot}
                className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="view">Перегляд</option>
                <option value="edit">Редагування</option>
              </select>
            </div>
            <Button
              onClick={handleShare}
              disabled={isLoading || !email.trim() || generatingScreenshot}
              className="w-full"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Надати доступ
            </Button>
          </div>

          {/* Shares List */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Користувачі з доступом</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 border border-border rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {share.permission_level === 'view' ? (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Edit className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm">{share.shared_with_email}</span>
                      <span className="text-xs text-muted-foreground">
                        ({share.permission_level === 'view' ? 'Перегляд' : 'Редагування'})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.shared_with_email)}
                      className="p-1 hover:bg-destructive/10 rounded text-destructive"
                      title="Видалити доступ"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
