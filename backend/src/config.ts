import 'dotenv/config';


function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(raw: string | undefined): number {
  if (!raw) return 3000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: "${raw}"`);
  }
  return port;
}

export interface Config {
  port: number;
  databaseUrl: string;
  geminiApiKey: string;
  geminiModel: string;
  corsOrigins: string[];
}

export const config: Config = {
  port: parsePort(process.env.PORT),
  databaseUrl: required('DATABASE_URL'),
  geminiApiKey: required('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-transcribe-live',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0),
};
