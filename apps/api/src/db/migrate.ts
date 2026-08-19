import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(
  __dirname,
  '../../../../packages/database/migrations'
);

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    // Prevent concurrent test/API processes from migrating simultaneously.
    await client.query(
      'SELECT pg_advisory_lock($1)',
      [748392]
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [file]
      );

      if (applied.rowCount) {
        continue;
      }

      const sql = await fs.readFile(
        path.join(migrationsDir, file),
        'utf8'
      );

      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          `INSERT INTO schema_migrations(version)
           VALUES ($1)`,
          [file]
        );

        await client.query('COMMIT');

        console.log(`✓ migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query(
      'SELECT pg_advisory_unlock($1)',
      [748392]
    );

    client.release();
  }
}