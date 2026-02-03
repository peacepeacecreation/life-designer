'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ScreenshotLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screenshotUrl: string
  canvasTitle: string
}

export default function ScreenshotLinkDialog({
  open,
  onOpenChange,
  screenshotUrl,
  canvasTitle,
}: ScreenshotLinkDialogProps) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(screenshotUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>📸 Screenshot готовий!</DialogTitle>
          <DialogDescription>
            Скопіюй посилання і поділись ним з іншими
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={screenshotUrl}
              alt={canvasTitle}
              className="w-full h-auto"
            />
          </div>

          {/* Link input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Посилання на screenshot</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={screenshotUrl}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-muted font-mono"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={copyLink}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Скопійовано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Копіювати
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            💡 Це пряме посилання на зображення. Будь-хто з посиланням зможе побачити screenshot твого canvas.
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(screenshotUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Відкрити в новій вкладці
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Закрити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
