import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Segment, TranscriberStatus } from '@/hooks/useTranscriber'

export interface LiveTranscriptProps {
  segments: Segment[]
  interim: string
  status: TranscriberStatus
}

export function LiveTranscript({ segments, interim, status }: LiveTranscriptProps) {
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [segments.length, interim])

  const isEmpty = segments.length === 0 && !interim

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 min-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-4" aria-live="polite">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground">
              {status === 'recording'
                ? 'Listening… start speaking.'
                : 'Press “Start recording” and speak. Your words will appear here.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2 leading-relaxed">
              {segments.map((segment) => (
                <p key={segment.id}>{segment.text}</p>
              ))}
              {interim && (
                <p className="text-muted-foreground italic">
                  {interim}
                  <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-muted-foreground" />
                </p>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </CardContent>
    </Card>
  )
}
