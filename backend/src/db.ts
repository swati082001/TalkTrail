import pg from 'pg';
import type { QueryResult, QueryResultRow } from 'pg';
import { config } from './config.js';


export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  max: 5,
});


pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});


export function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
