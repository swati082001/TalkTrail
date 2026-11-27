import http from 'node:http';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { WebSocketServer } from 'ws';
import { handleTranscribeSocket } from './ws/transcribeSocket.js';
import { transcriptionsRouter } from './routes/transcriptions.js';

const app = express();

app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);
app.use(express.json({ limit: '100kb' }));


app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/api/transcriptions', transcriptionsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

function clientErrorStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null || !('status' in err)) return null;
  const status = err.status;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null;
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = clientErrorStatus(err);
  if (status === 413) {
    res.status(413).json({ error: 'Request body too large' });
    return;
  }
  if (status !== null) {
    res.status(status).json({ error: 'Invalid request body' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});


const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url ?? '', `http://localhost:${config.port}`).pathname;
  if (pathname !== '/ws/transcribe') {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  const origin = req.headers.origin;
  if (!origin || !config.corsOrigins.includes(origin ?? '')) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy(); 
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    handleTranscribeSocket(ws);
  });

});


server.listen(config.port, '0.0.0.0', () => {
  console.log(`TalkTrail API listening on http://localhost:${config.port}`);
});
