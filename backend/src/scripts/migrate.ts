import { readFile } from 'node:fs/promises';
import { pool } from '../db.js';

const schemaUrl = new URL('../../sql/schema.sql', import.meta.url);

async function migrate(): Promise<void> {
  const sql = await readFile(schemaUrl, 'utf8');
  // schema.sql uses IF NOT EXISTS, so running this again is safe (idempotent).
  await pool.query(sql);

  const { rows } = await pool.query<{ count: string }>('SELECT count(*) FROM transcriptions');
  console.log(`Migration done. transcriptions table has ${rows[0]?.count ?? '0'} rows.`);
}

migrate()
  .catch((err: unknown) => {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
