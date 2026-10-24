import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH =
  process.env.OPAC_DB_PATH ?? path.join(process.cwd(), 'data', 'opac.db');
const SCHEMA_PATH = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

declare global {
  var __opacDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  // Tunggu (bukan langsung gagal) bila proses lain sedang menulis.
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__opacDb) globalThis.__opacDb = open();
  return globalThis.__opacDb;
}

export type Row = Record<string, unknown>;

export function all<T = Row>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function one<T = Row>(sql: string, params: unknown[] = []): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, params: unknown[] = []) {
  return getDb().prepare(sql).run(...(params as never[]));
}

export function sqlString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
