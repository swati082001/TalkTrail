import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createTranscription,
  deleteTranscription,
  getTranscription,
  listTranscriptions,
  updateTranscriptionText,
} from '../transcriptionsRepo.js';
import type { CreateTranscriptionBody, TranscriptionListResponse, UpdateTranscriptionBody } from '../types.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_TEXT_LENGTH = 10_000;
const MAX_QUERY_LENGTH = 200;
const MAX_LANGUAGE_LENGTH = 20;

export const transcriptionsRouter = Router();

function parseId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647 ? id : null;
}

function parseBoundedInt(raw: unknown, fallback: number, min: number, max: number): number | null {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min) return null;
  return Math.min(value, max);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

function validateText(value: unknown): Validated<string> {
  if (typeof value !== 'string') return { ok: false, error: '"text" must be a string' };
  const text = value.trim();
  if (!text) return { ok: false, error: '"text" must not be empty' };
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, error: `"text" must be at most ${MAX_TEXT_LENGTH} characters` };
  return { ok: true, value: text };
}

function validateCreateBody(body: unknown): Validated<Required<CreateTranscriptionBody>> {
  if (!isObject(body)) return { ok: false, error: 'Request body must be a JSON object' };

  const text = validateText(body.text);
  if (!text.ok) return text;

  const { language = null, duration_sec = null } = body;

  if (language !== null && (typeof language !== 'string' || language.length > MAX_LANGUAGE_LENGTH)) {
    return { ok: false, error: `"language" must be a string of at most ${MAX_LANGUAGE_LENGTH} characters, or null` };
  }
  if (
    duration_sec !== null &&
    (typeof duration_sec !== 'number' || !Number.isInteger(duration_sec) || duration_sec < 0 || duration_sec > 86_400)
  ) {
    return { ok: false, error: '"duration_sec" must be a non-negative integer, or null' };
  }

  return { ok: true, value: { text: text.value, language, duration_sec } };
}

function validateUpdateBody(body: unknown): Validated<UpdateTranscriptionBody> {
  if (!isObject(body)) return { ok: false, error: 'Request body must be a JSON object' };
  const text = validateText(body.text);
  return text.ok ? { ok: true, value: { text: text.value } } : text;
}

transcriptionsRouter.get('/', async (req: Request, res: Response) => {
  const limit = parseBoundedInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = parseBoundedInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  if (limit === null || offset === null) {
    res.status(400).json({ error: '"limit" and "offset" must be non-negative integers (limit at least 1)' });
    return;
  }

  const rawQ = req.query.q;
  if (rawQ !== undefined && typeof rawQ !== 'string') {
    res.status(400).json({ error: '"q" must be a single string' });
    return;
  }
  const q = rawQ?.trim().slice(0, MAX_QUERY_LENGTH) || undefined;

  const { items, total } = await listTranscriptions({ limit, offset, q });
  const body: TranscriptionListResponse = { items, total, limit, offset };
  res.json(body);
});

transcriptionsRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const item = await getTranscription(id);
  if (!item) {
    res.status(404).json({ error: 'Transcription not found' });
    return;
  }
  res.json(item);
});

transcriptionsRouter.post('/', async (req: Request, res: Response) => {
  const result = validateCreateBody(req.body);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const item = await createTranscription({ ...result.value, session_id: null });
  res.status(201).json(item);
});

transcriptionsRouter.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const result = validateUpdateBody(req.body);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const item = await updateTranscriptionText(id, result.value.text);
  if (!item) {
    res.status(404).json({ error: 'Transcription not found' });
    return;
  }
  res.json(item);
});

transcriptionsRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const deleted = await deleteTranscription(id);
  if (!deleted) {
    res.status(404).json({ error: 'Transcription not found' });
    return;
  }
  res.status(204).end();
});
