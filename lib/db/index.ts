import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config } from "@/lib/config";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

// Singleton across Next.js hot reloads / route handler invocations.
const globalForDb = globalThis as unknown as { __wdDb?: DB };

function createDb(): DB {
  fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
  fs.mkdirSync(config.artifactsDir, { recursive: true });
  const sqlite = new Database(config.dbFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export function getDb(): DB {
  if (!globalForDb.__wdDb) globalForDb.__wdDb = createDb();
  return globalForDb.__wdDb;
}

export { schema };
