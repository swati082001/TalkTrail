import { useEffect, useRef } from 'react'
import { Copy, Eraser, MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Segment, TranscriberStatus } from '@/hooks/useTranscriber'

export interface LiveTranscriptProps {
  segments: Segment[]
  interim: string
  status: TranscriberStatus
  onClear: () => void
}

export function LiveTranscript({ segments, interim, status, onClear }: LiveTranscriptProps) {
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [segments.length, interim])

  const isEmpty = segments.length === 0 && !interim
  const isActive = status === 'recording' || status === 'stopping'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(segments.map((s) => s.text).join('\n'))
      toast.success('Transcript copied')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <div className="flex h-full min-h-72 flex-col overflow-hidden rounded-2xl border bg-background/60">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquareText className="size-4 text-muted-foreground" />
          Live transcript
          {isActive && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              Live
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={handleCopy} disabled={segments.length === 0} aria-label="Copy transcript">
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            disabled={isEmpty || isActive}
            aria-label="Clear transcript"
          >
            <Eraser />
          </Button>
        </div>
      </div>

      <div className="max-h-96 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
        {isEmpty ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground/80">
              {status === 'recording' ? 'Listening… start speaking.' : 'Your words will appear here'}
            </p>
            <p className="max-w-xs">Try something like “Kal meeting hai at 5 pm, please send the report.”</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
            {segments.map((segment) => (
              <p key={segment.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                {segment.text}
              </p>
            ))}
            {interim && (
              <p className="text-muted-foreground italic">
                {interim}
                <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary" />
              </p>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
