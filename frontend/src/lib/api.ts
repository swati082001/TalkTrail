import type {
  CreateTranscriptionBody,
  Transcription,
  TranscriptionListResponse,
  UpdateTranscriptionBody,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isTranscription(value: unknown): value is Transcription {
  return (
    isObject(value) &&
    typeof value.id === 'number' &&
    typeof value.text === 'string' &&
    isStringOrNull(value.language) &&
    (value.duration_sec === null || typeof value.duration_sec === 'number') &&
    isStringOrNull(value.session_id) &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  )
}

function isListResponse(value: unknown): value is TranscriptionListResponse {
  return (
    isObject(value) &&
    Array.isArray(value.items) &&
    value.items.every(isTranscription) &&
    typeof value.total === 'number' &&
    typeof value.limit === 'number' &&
    typeof value.offset === 'number'
  )
}

function expectShape<T>(value: unknown, guard: (v: unknown) => v is T): T {
  if (!guard(value)) throw new ApiError('Unexpected response from the server.', 0)
  return value
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }

  if (response.status === 204) return null

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = isObject(body) && typeof body.error === 'string' ? body.error : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return body
}

export interface ListParams {
  limit: number
  offset: number
  q?: string
}

export const api = {
  async list({ limit, offset, q }: ListParams, signal?: AbortSignal): Promise<TranscriptionListResponse> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (q) params.set('q', q)
    return expectShape(await request(`/api/transcriptions?${params}`, { signal }), isListResponse)
  },

  async get(id: number): Promise<Transcription> {
    return expectShape(await request(`/api/transcriptions/${id}`), isTranscription)
  },

  async create(body: CreateTranscriptionBody): Promise<Transcription> {
    return expectShape(
      await request('/api/transcriptions', { method: 'POST', body: JSON.stringify(body) }),
      isTranscription,
    )
  },

  async update(id: number, body: UpdateTranscriptionBody): Promise<Transcription> {
    return expectShape(
      await request(`/api/transcriptions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      isTranscription,
    )
  },

  async remove(id: number): Promise<void> {
    await request(`/api/transcriptions/${id}`, { method: 'DELETE' })
  },
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}
