import http from 'node:http';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';

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

// Unknown routes.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});


const server = http.createServer(app);


server.listen(config.port, '0.0.0.0', () => {
  console.log(`TalkTrail API listening on http://localhost:${config.port}`);
});
