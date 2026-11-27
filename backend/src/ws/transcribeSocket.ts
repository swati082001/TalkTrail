import { randomUUID } from 'node:crypto';
import type { RawData, WebSocket } from 'ws';
import type { LiveServerMessage, Session } from '@google/genai';
import { ai, liveConfig } from '../gemini.js';
import { config } from '../config.js';
import { createTranscription } from '../transcriptionsRepo.js';
import type { ClientMessage, ServerMessage } from '../types.js';

const FLUSH_TIMEOUT_MS = 2500;
const PCM_BYTES_PER_SECOND = 16000 * 2;

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function isClientMessage(value: unknown): value is ClientMessage {
  if (typeof value !== 'object' || value === null) return false;
  if (!('type' in value)) return false;
  return value.type === 'start' || value.type === 'stop';
}

function parseClientMessage(data: RawData): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.toString());
  } catch {
    return null;
  }
  return isClientMessage(parsed) ? parsed : null;
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

export function handleTranscribeSocket(ws: WebSocket): void {
  let session: Session | null = null;
  let starting = false;
  let stopping = false;
  let stopRequested = false;
  let sessionId = '';
  let flushTimer: NodeJS.Timeout | null = null;
  let lastInterim = '';
  let bytesSinceFinal = 0;
  let droppedChunks = 0;
  let saveQueue: Promise<void> = Promise.resolve();

  console.log('Client connected');

  function handleFinal(rawText: string): void {
    const text = rawText.trim();
    lastInterim = '';
    if (!text) return;

    const durationSec = Math.max(1, Math.round(bytesSinceFinal / PCM_BYTES_PER_SECOND));
    bytesSinceFinal = 0;
    const segmentSessionId = sessionId;

    saveQueue = saveQueue.then(async () => {
      try {
        const saved = await createTranscription({
          text,
          language: null,
          duration_sec: durationSec,
          session_id: segmentSessionId,
        });
        send(ws, { type: 'final', text: saved.text, id: saved.id });
      } catch (err: unknown) {
        console.error('Failed to save final:', err instanceof Error ? err.message : err);
        send(ws, { type: 'error', message: 'Could not save part of the transcript.' });
      }
    });
  }

  function handleGeminiMessage(message: LiveServerMessage): void {
    const content = message.serverContent;
    if (!content) return;

    const interim = content.interimInputTranscription?.text;
    if (interim && interim !== lastInterim) {
      lastInterim = interim;
      send(ws, { type: 'interim', text: interim });
    }

    const final = content.inputTranscription?.text;
    if (final !== undefined) {
      handleFinal(final);
      if (stopping) void finishSession();
    }
  }

  function forwardAudio(data: RawData): void {
    if (!session || stopping) {
      droppedChunks++;
      return;
    }
    const pcm = toBuffer(data);
    if (pcm.length === 0) return;

    bytesSinceFinal += pcm.length;
    session.sendRealtimeInput({
      audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' },
    });
  }

  async function startSession(): Promise<void> {
    if (session || starting || stopping) {
      console.log('Ignoring "start": a session is already open, opening or stopping');
      return;
    }
    starting = true;
    stopRequested = false;

    let thisSession: Session | null = null;

    try {
      const opened = await ai.live.connect({
        model: config.geminiModel,
        config: liveConfig,
        callbacks: {
          onopen: () => console.log('Gemini session open'),
          onmessage: (message) => {
            if (thisSession && session === thisSession) handleGeminiMessage(message);
          },
          onerror: (e) => console.error('Gemini error:', e.message),
          onclose: (e) => {
            console.log(`Gemini session closed (code ${e.code}): ${e.reason || 'no reason'}`);
            if (!thisSession) return;
            if (session !== thisSession) return;

            resetSession();
            send(ws, { type: 'error', message: 'Transcription session ended. Press start to continue.' });
            send(ws, { type: 'closed' });
          },
        },
      });

      if (ws.readyState !== ws.OPEN || stopRequested) {
        opened.close();
        if (stopRequested) send(ws, { type: 'closed' });
        return;
      }

      thisSession = opened;
      session = opened;
      sessionId = randomUUID();
      lastInterim = '';
      bytesSinceFinal = 0;
      send(ws, { type: 'ready' });
    } catch (err: unknown) {
      console.error('Failed to open Gemini session:', err instanceof Error ? err.message : err);
      send(ws, { type: 'error', message: 'Could not start transcription. Please try again.' });
    } finally {
      starting = false;
    }
  }

  function resetSession(): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    session = null;
    stopping = false;
  }

  function stopSession(): void {
    if (starting) {
      stopRequested = true;
      return;
    }
    if (!session) {
      send(ws, { type: 'closed' });
      return;
    }
    if (stopping) return;

    stopping = true;
    session.sendRealtimeInput({ audioStreamEnd: true });
    flushTimer = setTimeout(() => void finishSession(), FLUSH_TIMEOUT_MS);
  }

  async function finishSession(): Promise<void> {
    if (!stopping) return;
    const closing = session;
    resetSession();
    closing?.close();

    await saveQueue;
    send(ws, { type: 'closed' });
  }

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      forwardAudio(data);
      return;
    }

    const msg = parseClientMessage(data);
    if (!msg) {
      console.warn('Ignoring invalid control message:', data.toString().slice(0, 100));
      send(ws, { type: 'error', message: 'Invalid control message.' });
      return;
    }

    switch (msg.type) {
      case 'start':
        void startSession();
        break;
      case 'stop':
        stopSession();
        break;
    }
  });

  ws.on('error', (err) => {
    console.error('Client socket error:', err.message);
  });

  ws.on('close', () => {
    console.log(`Client disconnected${droppedChunks ? ` (dropped ${droppedChunks} audio chunks with no session)` : ''}`);
    stopRequested = true;
    const closing = session;
    resetSession();
    closing?.close();
  });
}
