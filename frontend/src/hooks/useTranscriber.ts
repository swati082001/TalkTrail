import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMessage, ServerMessage } from '@/types'

export type TranscriberStatus = 'idle' | 'connecting' | 'recording' | 'stopping' | 'error'

export interface Segment {
  id: number
  text: string
}

export interface UseTranscriberOptions {
  onFinal?: (segment: Segment) => void
}

export interface UseTranscriberResult {
  status: TranscriberStatus
  interim: string
  segments: Segment[]
  error: string | null
  analyser: AnalyserNode | null
  startedAt: number | null
  start: () => Promise<void>
  stop: () => void
  clear: () => void
}

const STOP_TIMEOUT_MS = 5000

function isServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false
  switch (value.type) {
    case 'ready':
    case 'closed':
      return true
    case 'interim':
      return 'text' in value && typeof value.text === 'string'
    case 'final':
      return 'text' in value && typeof value.text === 'string' && 'id' in value && typeof value.id === 'number'
    case 'error':
      return 'message' in value && typeof value.message === 'string'
    default:
      return false
  }
}

function parseServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(data)
    return isServerMessage(parsed) ? parsed : null
  } catch {
    return null
  }
}

function sendControl(ws: WebSocket, msg: ClientMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

function micErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Microphone permission was denied. Allow mic access in your browser settings and try again.'
      case 'NotFoundError':
        return 'No microphone was found. Connect one and try again.'
      case 'NotReadableError':
        return 'The microphone is being used by another app.'
    }
  }
  return 'Could not access the microphone.'
}

function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop())
}

export function useTranscriber(options: UseTranscriberOptions = {}): UseTranscriberResult {
  const [status, setStatus] = useState<TranscriberStatus>('idle')
  const [interim, setInterim] = useState('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const statusRef = useRef<TranscriberStatus>('idle')
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const attemptRef = useRef(0)
  const onFinalRef = useRef(options.onFinal)

  useEffect(() => {
    onFinalRef.current = options.onFinal
  }, [options.onFinal])

  const updateStatus = useCallback((next: TranscriberStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const releaseAudio = useCallback(() => {
    setAnalyser(null)
    setStartedAt(null)
    const node = workletRef.current
    workletRef.current = null
    if (node) {
      node.port.onmessage = null
      node.disconnect()
    }

    const stream = streamRef.current
    streamRef.current = null
    if (stream) stopTracks(stream)

    const ctx = audioCtxRef.current
    audioCtxRef.current = null
    if (ctx && ctx.state !== 'closed') void ctx.close()
  }, [])

  const cleanup = useCallback(() => {
    attemptRef.current++
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
    releaseAudio()

    const ws = wsRef.current
    wsRef.current = null
    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) ws.close()
    }
  }, [releaseAudio])

  const finish = useCallback(() => {
    cleanup()
    setInterim('')
    updateStatus('idle')
  }, [cleanup, updateStatus])

  const fail = useCallback(
    (message: string) => {
      cleanup()
      setInterim('')
      setError(message)
      updateStatus('error')
    },
    [cleanup, updateStatus],
  )

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'ready':
          setStartedAt(Date.now())
          updateStatus('recording')
          break
        case 'interim':
          setInterim(msg.text)
          break
        case 'final': {
          const segment: Segment = { id: msg.id, text: msg.text }
          setSegments((prev) => [...prev, segment])
          setInterim('')
          onFinalRef.current?.(segment)
          break
        }
        case 'error':
          if (statusRef.current === 'connecting') fail(msg.message)
          else setError(msg.message)
          break
        case 'closed':
          finish()
          break
      }
    },
    [fail, finish, updateStatus],
  )

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle' && statusRef.current !== 'error') return

    const attempt = ++attemptRef.current
    const aborted = () => attempt !== attemptRef.current

    setError(null)
    setInterim('')
    updateStatus('connecting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
    } catch (err: unknown) {
      if (!aborted()) fail(micErrorMessage(err))
      return
    }
    if (aborted()) {
      stopTracks(stream)
      return
    }
    streamRef.current = stream

    try {
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      await ctx.audioWorklet.addModule('/pcm-worklet.js')
      if (aborted()) return

      const source = ctx.createMediaStreamSource(stream)
      const node = new AudioWorkletNode(ctx, 'pcm-worklet', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      })
      source.connect(node)
      workletRef.current = node

      const levelAnalyser = ctx.createAnalyser()
      levelAnalyser.fftSize = 64
      levelAnalyser.smoothingTimeConstant = 0.75
      source.connect(levelAnalyser)
      setAnalyser(levelAnalyser)

      const ws = new WebSocket(import.meta.env.VITE_WS_URL)
      wsRef.current = ws

      node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (statusRef.current === 'recording' && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data)
        }
      }

      ws.onopen = () => sendControl(ws, { type: 'start' })

      ws.onmessage = (event: MessageEvent) => {
        const msg = parseServerMessage(event.data)
        if (msg) handleMessage(msg)
      }

      ws.onclose = () => {
        if (wsRef.current !== ws) return
        if (statusRef.current === 'stopping') {
          finish()
        } else if (statusRef.current === 'connecting') {
          fail('Cannot reach the transcription server. Is the backend running?')
        } else {
          fail('Connection to the transcription server was lost.')
        }
      }
    } catch {
      if (!aborted()) fail('Could not start audio capture in this browser.')
    }
  }, [fail, finish, handleMessage, updateStatus])

  const stop = useCallback(() => {
    const current = statusRef.current

    if (current === 'connecting') {
      finish()
      return
    }
    if (current !== 'recording') return

    updateStatus('stopping')
    releaseAudio()

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      finish()
      return
    }
    sendControl(ws, { type: 'stop' })
    stopTimerRef.current = window.setTimeout(finish, STOP_TIMEOUT_MS)
  }, [finish, releaseAudio, updateStatus])

  const clear = useCallback(() => {
    setSegments([])
    setInterim('')
  }, [])

  useEffect(() => cleanup, [cleanup])

  return { status, interim, segments, error, analyser, startedAt, start, stop, clear }
}
