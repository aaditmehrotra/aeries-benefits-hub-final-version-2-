import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// One pool per server process. Works with any standard Postgres — Vercel
// Postgres, Neon, Supabase, or Cloud SQL — via a single DATABASE_URL.
// Lazy on purpose: nothing touches the network at import time, so the app
// still builds cleanly before DATABASE_URL is configured.
declare global {
  // eslint-disable-next-line no-var
  var __aeriesPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __aeriesDb: NodePgDatabase<typeof schema> | undefined;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it in your hosting provider's environment variables (see README.md)."
    );
  }
  if (!global.__aeriesDb) {
    global.__aeriesPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
    });
    global.__aeriesDb = drizzle(global.__aeriesPool, { schema });
  }
  return global.__aeriesDb;
}
