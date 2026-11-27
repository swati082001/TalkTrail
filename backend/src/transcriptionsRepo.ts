import { query } from './db.js';
import type { Transcription, TranscriptionRow } from './types.js';

const COLUMNS = 'id, text, language, duration_sec, session_id, created_at, updated_at';

function toTranscription(row: TranscriptionRow): Transcription {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export interface ListOptions {
  limit: number;
  offset: number;
  q?: string;
}

export async function listTranscriptions({ limit, offset, q }: ListOptions): Promise<{ items: Transcription[]; total: number }> {
  const pattern = q ? `%${escapeLike(q)}%` : null;

  const [itemsResult, countResult] = await Promise.all([
    query<TranscriptionRow>(
      `SELECT ${COLUMNS}
       FROM transcriptions
       WHERE ($1::text IS NULL OR text ILIKE $1)
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [pattern, limit, offset],
    ),
    query<{ total: string }>(
      `SELECT count(*) AS total
       FROM transcriptions
       WHERE ($1::text IS NULL OR text ILIKE $1)`,
      [pattern],
    ),
  ]);

  return {
    items: itemsResult.rows.map(toTranscription),
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

export async function getTranscription(id: number): Promise<Transcription | null> {
  const result = await query<TranscriptionRow>(`SELECT ${COLUMNS} FROM transcriptions WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? toTranscription(row) : null;
}

export interface CreateInput {
  text: string;
  language: string | null;
  duration_sec: number | null;
  session_id: string | null;
}

export async function createTranscription(input: CreateInput): Promise<Transcription> {
  const result = await query<TranscriptionRow>(
    `INSERT INTO transcriptions (text, language, duration_sec, session_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [input.text, input.language, input.duration_sec, input.session_id],
  );
  const row = result.rows[0];
  if (!row) throw new Error('INSERT returned no row');
  return toTranscription(row);
}

export async function updateTranscriptionText(id: number, text: string): Promise<Transcription | null> {
  const result = await query<TranscriptionRow>(
    `UPDATE transcriptions
     SET text = $1, updated_at = now()
     WHERE id = $2
     RETURNING ${COLUMNS}`,
    [text, id],
  );
  const row = result.rows[0];
  return row ? toTranscription(row) : null;
}

export async function deleteTranscription(id: number): Promise<boolean> {
  const result = await query('DELETE FROM transcriptions WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
