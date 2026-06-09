import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

// For backwards-compat with existing imports, export db as a proxy
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export type DB = ReturnType<typeof createDb>;
