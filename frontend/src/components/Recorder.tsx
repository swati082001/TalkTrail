import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Mic, Square } from 'lucide-react'
import { AudioVisualizer } from '@/components/AudioVisualizer'
import type { TranscriberStatus } from '@/hooks/useTranscriber'
import { cn } from '@/lib/utils'

export interface RecorderProps {
  status: TranscriberStatus
  error: string | null
  analyser: AnalyserNode | null
  startedAt: number | null
  onStart: () => void
  onStop: () => void
}

const STATUS_LABEL: Record<TranscriberStatus, string> = {
  idle: 'Tap to start recording',
  connecting: 'Connecting…',
  recording: 'Listening',
  stopping: 'Saving last words…',
  error: 'Tap to try again',
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function RecordingTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  return <span className="font-mono text-sm tabular-nums text-muted-foreground">{formatElapsed(now - startedAt)}</span>
}

export function Recorder({ status, error, analyser, startedAt, onStart, onStop }: RecorderProps) {
  const isRecording = status === 'recording'
  const isBusy = status === 'connecting' || status === 'stopping'

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <AudioVisualizer analyser={isRecording ? analyser : null} className="w-full max-w-xs" />

      <div className="relative flex items-center justify-center">
        {isRecording && (
          <>
            <span className="absolute size-24 animate-ping rounded-full bg-red-500/20" />
            <span className="absolute size-32 animate-pulse rounded-full bg-red-500/10" />
          </>
        )}
        <button
          type="button"
          onClick={isRecording ? onStop : onStart}
          disabled={isBusy}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className={cn(
            'relative flex size-20 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 outline-none',
            'focus-visible:ring-4 focus-visible:ring-ring/50 disabled:cursor-not-allowed',
            isRecording
              ? 'bg-red-500 shadow-red-500/40 hover:bg-red-600'
              : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/40 hover:scale-105 hover:shadow-violet-500/60 active:scale-95',
            isBusy && 'opacity-80',
          )}
        >
          {isBusy ? (
            <Loader2 className="size-8 animate-spin" />
          ) : isRecording ? (
            <Square className="size-7 fill-current" />
          ) : (
            <Mic className="size-8" />
          )}
        </button>
      </div>

      <div className="flex min-h-10 flex-col items-center gap-1" role="status" aria-live="polite">
        <span className={cn('text-sm font-medium', isRecording ? 'text-foreground' : 'text-muted-foreground')}>
          {STATUS_LABEL[status]}
        </span>
        {isRecording && startedAt !== null && <RecordingTimer startedAt={startedAt} />}
      </div>

      {error && (
        <div
          role="alert"
          className="flex w-full items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
