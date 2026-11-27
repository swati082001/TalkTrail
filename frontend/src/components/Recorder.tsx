import { AlertCircle, Loader2, Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TranscriberStatus } from '@/hooks/useTranscriber'
import { cn } from '@/lib/utils'

export interface RecorderProps {
  status: TranscriberStatus
  error: string | null
  onStart: () => void
  onStop: () => void
}

const STATUS_LABEL: Record<TranscriberStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  recording: 'Listening',
  stopping: 'Finishing up…',
  error: 'Stopped',
}

export function Recorder({ status, error, onStart, onStop }: RecorderProps) {
  const isRecording = status === 'recording'
  const isBusy = status === 'connecting' || status === 'stopping'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live transcription</CardTitle>
        <CardDescription>Speak in Hindi, English or a mix of both.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
            <span className="relative flex size-3">
              {isRecording && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
              )}
              <span
                className={cn(
                  'relative inline-flex size-3 rounded-full',
                  isRecording ? 'bg-red-500' : isBusy ? 'animate-pulse bg-amber-500' : 'bg-muted-foreground/40',
                )}
              />
            </span>
            <span className={cn(isRecording ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          {isRecording || status === 'stopping' ? (
            <Button size="lg" variant="destructive" onClick={onStop} disabled={status === 'stopping'} className="w-full sm:w-auto">
              {status === 'stopping' ? <Loader2 className="animate-spin" /> : <Square />}
              {status === 'stopping' ? 'Saving…' : 'Stop'}
            </Button>
          ) : (
            <Button size="lg" onClick={onStart} disabled={status === 'connecting'} className="w-full sm:w-auto">
              {status === 'connecting' ? <Loader2 className="animate-spin" /> : <Mic />}
              {status === 'connecting' ? 'Connecting…' : 'Start recording'}
            </Button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
