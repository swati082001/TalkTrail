// Shared types. Keep in sync with frontend/src/types.ts.

export interface Transcription {
  id: number;
  text: string;
  language: string | null;
  duration_sec: number | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}



export interface TranscriptionListResponse {
  items: Transcription[];
  total: number;   
  limit: number;  
  offset: number; 
}

export interface CreateTranscriptionBody {
  text: string;
  language?: string | null;
  duration_sec?: number | null;
}

export interface UpdateTranscriptionBody {
  text: string;
}

export type ClientMessage = { type: 'start' } | { type: 'stop' };


export type ServerMessage =
  | { type: 'ready' }
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string; id: number }
  | { type: 'error'; message: string }
  | { type: 'closed' };
