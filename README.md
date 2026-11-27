# TalkTrail

**Speak in Hindi, English or both, and leave a trail of every word.**

TalkTrail is a real-time speech-to-text web app that transcribes multilingual speech, including Hindi-English (Hinglish) mixing, as you speak. Every transcript is stored in PostgreSQL and managed from a history dashboard with full create, read, update and delete.

| | |
|---|---|
| **Live app** | https://talktrail-frontend-tuht.onrender.com |
| **API** | https://talktrail-g8v7.onrender.com (health check: [`/health`](https://talktrail-g8v7.onrender.com/health)) |

> **First load can take 30–50 seconds.** The backend runs on Render's free tier, which sleeps after 15 minutes of inactivity. Open the [health check](https://talktrail-g8v7.onrender.com/health) once to wake it up, then use the app. Use Chrome or Edge and allow microphone access when asked.

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack and why](#tech-stack-and-why)
- [Project structure](#project-structure)
- [Run it locally](#run-it-locally)
- [Environment variables](#environment-variables)
- [REST API](#rest-api)
- [WebSocket protocol](#websocket-protocol)
- [Database](#database)
- [Deployment (Render)](#deployment-render)
- [Engineering notes](#engineering-notes)
- [Known limitations](#known-limitations)
- [Future work](#future-work)

---

## Features

- **Live transcription while you speak.** Partial text appears within a fraction of a second and is replaced by the final text when you pause.
- **Hinglish support.** Automatic language detection handles Hindi, English and mid-sentence switching between them.
- **Automatic saving.** Every finalized sentence is written to PostgreSQL the moment it is recognized, grouped by recording session.
- **History dashboard with full CRUD.**
  - **Create:** automatically from recordings, or manually with "New entry".
  - **Read:** newest first, with debounced search and pagination.
  - **Update:** fix mis-heard words in an edit dialog.
  - **Delete:** with a confirmation dialog.
- **Live audio waveform, recording timer, copy-to-clipboard, light and dark mode.**
- **Clear error messages** for denied mic permission, an unreachable server, a dropped connection and the session time limit.
- **TypeScript end to end** with `strict` mode, no `any`, and runtime validation of every message crossing the network.

---

## How it works

```
 Browser (React)                                Backend (Node + Express + ws)              Google
┌──────────────────────────────┐              ┌───────────────────────────────┐        ┌──────────────┐
│ Mic ─► AudioWorklet          │   binary     │                               │        │              │
│        (48k float ─► 16k     │──PCM16──────►│  /ws/transcribe bridge        │──────► │ Gemini Live  │
│         PCM16, 100 ms chunks)│   frames     │   • one Gemini session per    │ base64 │ (transcribe) │
│                              │              │     recording                 │        │              │
│ Live transcript  ◄───────────│◄─interim─────│   • forwards interim text     │◄────── │ interim +    │
│                              │◄─final+id────│   • saves finals, then sends  │        │ final text   │
│                              │              │     them with the DB row id   │        └──────────────┘
│ History dashboard ◄──────────│◄──REST──────►│  /api/transcriptions (CRUD)   │
└──────────────────────────────┘    JSON      │              │                │
                                              └──────────────┼────────────────┘
                                                             ▼
                                                   PostgreSQL (Neon)
```

**Why audio goes through the backend instead of straight to Gemini:** the Gemini API key must never reach the browser. Anything shipped to the browser, including `VITE_*` variables, is public.

### The life of one recording

1. You click the mic. The browser asks for microphone permission, starts an `AudioContext` and loads `pcm-worklet.js` onto the audio thread.
2. The worklet **downsamples** the mic from 44.1/48 kHz to 16 kHz by averaging (a cheap low-pass filter that avoids aliasing), converts float samples to 16-bit integers, and posts **3,200-byte chunks (100 ms)**.
3. A WebSocket opens to the backend and sends `{ "type": "start" }`. The backend opens a Gemini Live session and replies `{ "type": "ready" }` only after Gemini confirms the setup. Audio is sent only after `ready`.
4. Each audio chunk is relayed to Gemini. Gemini streams back:
   - **interim** text, a cumulative guess for the current sentence that is re-sent as it changes. It is shown in grey italics and replaced each time.
   - **final** text when you pause. The backend `INSERT`s it first, then sends `{ "type": "final", "text", "id" }`. The UI appends it, and the history list refreshes.
5. You click stop. The backend sends `audioStreamEnd` so Gemini finalizes your last words immediately, waits for that final to be saved, closes the Gemini session and replies `{ "type": "closed" }`.

---

## Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript everywhere** (`strict`) | One language across browser, server and shared message types. Compile-time checks on the WebSocket protocol caught real bugs during development. |
| Speech-to-text | **Gemini Live API**, model `gemini-3.5-transcribe-live` | A dedicated low-latency streaming transcription model with interim and final results and automatic language detection that handles code-switching. Fits a free-tier deployment because the heavy model runs on Google's side. |
| Real-time transport | **WebSocket** (`ws`) | Audio is a continuous stream in both directions. HTTP request/response would add a connection per chunk. Binary frames carry raw PCM without the 33% base64 overhead. |
| Backend | **Node.js 20+, Express 5** | Express 5 forwards errors from async handlers to the error middleware automatically. One `http.Server` serves both REST and WebSocket on a single port, which Render's free tier requires. |
| Database | **PostgreSQL on Neon** | Relational, free and doesn't expire. Accessed with **`pg` and plain parameterized SQL, no ORM**, so every query is visible and readable. |
| Frontend | **React 19 + Vite + Tailwind CSS v4 + shadcn/ui** | Hooks and local state only (no Redux). shadcn components are copied into the repo as editable source, built on accessible Radix primitives. |
| Hosting | **Render**: Web Service (API) + Static Site (frontend) | Free tier supports WebSockets. The static site is served over HTTPS, which browsers require for microphone access. |

---

## Project structure

```
TalkTrail/
├── backend/
│   ├── sql/schema.sql                 table + index (idempotent)
│   └── src/
│       ├── server.ts                  Express app, CORS, error handler, HTTP server, WebSocket upgrade + Origin check
│       ├── config.ts                  env loading, fail-fast validation, typed config
│       ├── db.ts                      pg Pool + typed query helper
│       ├── gemini.ts                  shared Gemini client + Live config
│       ├── transcriptionsRepo.ts      ALL SQL lives here (list, get, create, update, delete)
│       ├── types.ts                   Transcription, API bodies, WebSocket message unions
│       ├── routes/transcriptions.ts   REST CRUD + input validation
│       ├── ws/transcribeSocket.ts     browser ⇄ Gemini bridge (session lifecycle, saving finals)
│       └── scripts/
│           ├── migrate.ts             runs schema.sql
│           └── geminiSpike.ts         streams a WAV file to Gemini and logs raw messages
└── frontend/
    ├── public/pcm-worklet.js          AudioWorkletProcessor: downsample to 16 kHz PCM16 (the only .js file)
    └── src/
        ├── App.tsx                    page layout and wiring
        ├── types.ts                   mirrors backend/src/types.ts
        ├── lib/api.ts                 typed fetch client with runtime response validation
        ├── hooks/
        │   ├── useTranscriber.ts      mic + worklet + WebSocket + live state
        │   └── useTranscriptions.ts   history: list, search, pagination, CRUD
        └── components/                Recorder, AudioVisualizer, LiveTranscript, History*, dialogs, ui/ (shadcn)
```

`pcm-worklet.js` is plain JavaScript on purpose. Audio worklets are loaded by URL into a separate audio thread, outside the Vite bundle, and their global scope isn't part of TypeScript's standard DOM types.

---

## Run it locally

### Prerequisites

- **Node.js 20+** and **pnpm** (`npm i -g pnpm`)
- A **PostgreSQL** database. A free [Neon](https://neon.tech) project works: copy its connection string.
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/api-keys)
- **Chrome or Edge** (microphone + AudioWorklet)

### 1. Backend

```bash
cd backend
pnpm install
cp .env.example .env        # then fill in DATABASE_URL and GEMINI_API_KEY
pnpm run migrate            # creates the transcriptions table (safe to re-run)
pnpm run dev                # http://localhost:3000
```

Check it: `curl http://localhost:3000/health` should return `{"ok":true}`.

### 2. Frontend

```bash
cd frontend
pnpm install
cp .env.example .env        # defaults point at localhost:3000
pnpm run dev                # http://localhost:5173
```

Open http://localhost:5173, click the mic and speak.

### Optional: test Gemini without the UI

The spike script streams a WAV file to Gemini in real time and prints every raw message:

```bash
cd backend
# make a Hinglish test clip with macOS's built-in Hindi voice
say -v Lekha -o sample.wav --data-format=LEI16@16000 "kal meeting hai at 5 pm, please send the report"
pnpm exec tsx src/scripts/geminiSpike.ts sample.wav
# optional 2nd argument overrides language codes
pnpm exec tsx src/scripts/geminiSpike.ts sample.wav hi-IN,en-IN
```

To use your own recording, convert it to 16 kHz mono PCM first: `afconvert -f WAVE -d LEI16@16000 -c 1 recording.m4a mine.wav`.

### Scripts

| App | Script | What it does |
|---|---|---|
| backend | `pnpm run dev` | Start with auto-reload (`tsx watch`) |
| backend | `pnpm run build` / `pnpm start` | Compile to `dist/` / run compiled server |
| backend | `pnpm run migrate` / `pnpm run migrate:prod` | Apply `schema.sql` from source / from `dist/` |
| backend | `pnpm run typecheck` | `tsc --noEmit` |
| frontend | `pnpm run dev` / `pnpm run build` | Vite dev server / type-check + production build |
| frontend | `pnpm run typecheck` / `pnpm run lint` | `tsc -b --noEmit` / ESLint |

---

## Environment variables

### `backend/.env`

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host/db?sslmode=require` | The server refuses to start without it. |
| `GEMINI_API_KEY` | yes | | Never sent to the browser. |
| `GEMINI_MODEL` | no | `gemini-3.5-transcribe-live` | Fallback: `gemini-3.1-flash-live-preview`. |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Comma-separated list of frontend origins. Used for REST CORS **and** the WebSocket Origin check. |
| `PORT` | no | `3000` | Render sets this automatically. |

### `frontend/.env`

| Variable | Example (local) | Example (production) |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | `https://talktrail-g8v7.onrender.com` |
| `VITE_WS_URL` | `ws://localhost:3000/ws/transcribe` | `wss://talktrail-g8v7.onrender.com/ws/transcribe` |

`VITE_*` values are baked into the JavaScript bundle at **build time** and are public. Never put secrets in them. After changing them in production, the frontend has to be rebuilt.

---

## REST API

Base path: `/api/transcriptions`. All bodies are JSON. Errors are always `{ "error": "message" }` and never include stack traces.

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| `GET` | `/api/transcriptions?limit=20&offset=0&q=term` | | `200` `{ items, total, limit, offset }` | `400` bad `limit`/`offset`/`q` |
| `GET` | `/api/transcriptions/:id` | | `200` transcription | `400` bad id, `404` |
| `POST` | `/api/transcriptions` | `{ text, language?, duration_sec? }` | `201` transcription | `400` empty or invalid fields, `413` body over 100 KB |
| `PUT` | `/api/transcriptions/:id` | `{ text }` | `200` updated transcription | `400`, `404` |
| `DELETE` | `/api/transcriptions/:id` | | `204` | `400`, `404` |
| `GET` | `/health` | | `200` `{ "ok": true }` | |

- **List:** newest first. `q` does a case-insensitive search (`ILIKE`). `%` and `_` in the search term are escaped, so they match literally. `limit` is clamped to 1–100, and the response returns the values actually used.
- **Validation:** `text` is trimmed, must be non-empty, max 10,000 characters. `id` must be a positive 32-bit integer.

A transcription looks like:

```json
{
  "id": 42,
  "text": "Kal meeting hai at 5 pm, please send the report.",
  "language": null,
  "duration_sec": 4,
  "session_id": "0f6c1c1e-6d1a-4c7e-9a43-2b1f3f8f9c11",
  "created_at": "2026-11-27T12:40:57.829Z",
  "updated_at": "2026-11-27T12:40:57.829Z"
}
```

Examples:

```bash
API=http://localhost:3000/api/transcriptions
curl "$API?limit=5&q=meeting"
curl -X POST $API -H 'Content-Type: application/json' -d '{"text":"Kal meeting hai at 5 pm"}'
curl -X PUT  $API/42 -H 'Content-Type: application/json' -d '{"text":"Kal meeting hai at 6 pm"}'
curl -X DELETE $API/42 -i
```

---

## WebSocket protocol

Path: `/ws/transcribe`. Connections from origins not listed in `CORS_ORIGIN` are rejected with `403` during the handshake.

**Client → server**

| Frame | Meaning |
|---|---|
| text `{ "type": "start" }` | Open a transcription session. |
| binary | Raw PCM16, little-endian, 16 kHz, mono, about 100 ms (3,200 bytes) per frame. Ignored until `ready`. Max frame size 64 KB. |
| text `{ "type": "stop" }` | Flush the last words, save them, close the session. |

**Server → client**

| Message | Meaning |
|---|---|
| `{ "type": "ready" }` | Gemini session is open; start sending audio. |
| `{ "type": "interim", "text": "..." }` | Partial text for the current sentence. **Replace** the live line. |
| `{ "type": "final", "text": "...", "id": 123 }` | Finalized sentence, **already saved**; `id` is the new row. |
| `{ "type": "error", "message": "..." }` | Human-readable problem (start failed, save failed, session ended, invalid message). |
| `{ "type": "closed" }` | Session finished; the client may `start` again on the same socket. |

---

## Database

```sql
CREATE TABLE IF NOT EXISTS transcriptions (
  id            SERIAL PRIMARY KEY,
  text          TEXT NOT NULL,
  language      VARCHAR(20),
  duration_sec  INTEGER,
  session_id    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions (created_at DESC);
```

| Column | Filled by |
|---|---|
| `session_id` | A UUID per recording, so all sentences from one recording share it. `NULL` for manual entries. |
| `duration_sec` | Audio length since the previous sentence, computed from bytes received (`bytes / 32,000`). |
| `language` | Currently `NULL`: Gemini Live doesn't return a detected language. |
| `updated_at` | Set to `now()` on every `UPDATE`. |

All queries are parameterized (`$1, $2, …`) and live in `backend/src/transcriptionsRepo.ts`. The migration is idempotent (`IF NOT EXISTS`), so `pnpm run migrate` is safe to run on every deploy.

---

## Deployment (Render)

Both apps deploy from this one repository. Deploy the backend first, because the frontend build needs its URL.

**1. Database:** run the migration once against the production database: `DATABASE_URL=<neon-url> pnpm run migrate` from `backend/`.

**2. Backend: Web Service**

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pnpm install && pnpm run build` |
| Start Command | `pnpm start` |
| Health Check Path | `/health` |
| Environment | `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CORS_ORIGIN` = the frontend URL |

TypeScript and the `@types/*` packages are dev dependencies, so the build must install them. If `NODE_ENV=production` is set on the service, use `pnpm install --prod=false` instead.

**3. Frontend: Static Site**

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `pnpm install && pnpm run build` |
| Publish Directory | `dist` |
| Environment | `VITE_API_URL=https://<backend>.onrender.com`, `VITE_WS_URL=wss://<backend>.onrender.com/ws/transcribe` |

**4.** Put the frontend's URL in the backend's `CORS_ORIGIN` and redeploy the backend.

Gotchas we hit:

- **The Origin header never has a trailing slash.** `CORS_ORIGIN=https://site.onrender.com/` used to block every request. The backend now strips trailing slashes.
- **The page is HTTPS, so the WebSocket must be `wss://`.** Browsers block `ws://` from secure pages.
- **`VITE_*` changes need a rebuild of the static site,** not just saving the variable.

---

## Engineering notes

### What the Phase 1 spike found

Before building the pipeline, a standalone script (`geminiSpike.ts`) streamed recorded Hinglish to Gemini and logged every raw message. The integration is built on what it showed, not on assumptions:

| Question | Finding |
|---|---|
| Does the model work on the free tier? | Yes, but **only with API version `v1beta`**. The SDK's default version returns `404`. |
| Interim field | `serverContent.interimInputTranscription.text`: **cumulative** for the current sentence, often repeated 3–5 times, and words can change ("एट" → "at"). |
| Final field | `serverContent.inputTranscription.text`: **one segment** per pause. |
| Language info | None is returned, so `language` stays `NULL`. |
| Script of Hindi words | With auto-detect (`languageCodes: []`), finals come back in **Devanagari**, even for English words, while interims are romanized. With `["hi-IN","en-IN"]` finals stay **romanized Hinglish**. Auto-detect is currently configured in `backend/src/gemini.ts`. |

### Correctness details worth knowing

- **`ready` is sent after `connect()` resolves, not in `onopen`.** `onopen` fires even for an invalid model name; Gemini only rejects the setup afterwards. Sending `ready` early would also let audio arrive before the session variable exists, losing the first words.
- **Finals are saved in order.** Saves go through a promise chain, so a slow `INSERT` can't make sentence 2 appear before sentence 1.
- **A `final` message always means "saved".** If the `INSERT` fails, no `final` is sent; the user gets an `error` instead.
- **Stale-session guard.** Each Gemini callback checks it still belongs to the current session, so a late `close` from a previous recording (stop, then quick start) can't break the new one.
- **Duplicate interims are dropped** on the server, and the comparison resets after each final, so a repeated short phrase ("okay… okay") still shows live.
- **Search races:** typing quickly sends several requests. Each new one aborts the previous (`AbortController`), so results never arrive out of order.

### Security and hardening

- Gemini key is server-side only. The frontend only knows public URLs.
- WebSocket handshake rejects unknown or missing `Origin` headers. Browsers enforce CORS for `fetch` but **not** for WebSockets, so without this check any website could use your Gemini quota.
- Parameterized SQL everywhere. LIKE wildcards are escaped.
- JSON body limit 100 KB (`413`), text limit 10,000 characters, WebSocket frame limit 64 KB (the `ws` default is 100 MB).
- Recording sessions are capped at about 9.5 minutes. The backend stops gracefully (flushing and saving the last sentence) just before Gemini's 10-minute session limit.
- A socket `error` listener prevents one bad client frame from crashing the process.
- No stack traces in responses. Transcript text is rendered as React text (no `dangerouslySetInnerHTML`).

---

## Known limitations

- **About a 10-minute limit per recording.** Gemini Live sessions are capped, so the app stops and asks you to press start again.
- **Free-tier cold start.** The first request after idling takes 30–50 seconds.
- **Interim text can change.** Only finals are saved and authoritative.
- **No speaker diarization or word-level timestamps.** Gemini Live doesn't support them.
- **No language tag per sentence.** Gemini Live doesn't return a detected language.
- **Hindi script depends on configuration.** See the spike findings above.
- **No authentication.** Anyone with the link shares one history. Fine for a demo, not for real users.
- **Stop may take up to 2.5 seconds** when Gemini has already finalized everything before you pressed stop (the backend waits for a final that never comes, then times out).

---

## Future work

- **Open-source model option.** A Hinglish fine-tuned Whisper model such as [`shunyalabs/zero-stt-hinglish`](https://huggingface.co/shunyalabs/zero-stt-hinglish) could replace Gemini for fully self-hosted transcription. It needs far more RAM or a GPU than free hosting provides, so it is documented here rather than implemented.
- Seamless reconnect across the 10-minute session limit.
- A user setting for romanized vs Devanagari output.
- Export history to `.txt` / `.csv`, and user accounts.
