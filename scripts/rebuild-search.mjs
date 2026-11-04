#!/usr/bin/env node
/**
 * Mengisi ulang tabel `vocabulary` — kosakata semua kata pada judul koleksi.
 * Dipakai `bestTypoFix` di src/lib/queries.ts untuk koreksi salah ketik.
 *
 * Jalankan setiap kali data buku diimpor ulang:
 *   node scripts/rebuild-search.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadEnv } from './env.mjs';

loadEnv();

const DB_PATH = process.env.OPAC_DB_PATH ?? path.join(process.cwd(), 'data', 'opac.db');
const SCHEMA = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(SCHEMA, 'utf8'));

const rows = db.prepare('SELECT lower(title) AS w FROM books').all();
const vocab = new Set();
for (const row of rows) {
  for (const word of row.w.split(/[^a-z]+/)) {
    if (word.length >= 3 && word.length <= 25) vocab.add(word);
  }
}

db.exec('DELETE FROM vocabulary');
db.exec('DELETE FROM vocabulary_trigram');
const insert = db.prepare('INSERT OR IGNORE INTO vocabulary(word, len) VALUES (?, ?)');
const insertTrig = db.prepare('INSERT INTO vocabulary_trigram(word, trig) VALUES (?, ?)');
db.exec('BEGIN');
try {
  for (const word of vocab) {
    insert.run(word, word.length);
    // Trigram hanya untuk kata >= 5 huruf; lebih pendek koreksinya tak andal.
    if (word.length >= 5) {
      const padded = `  ${word}  `;
      const trigrams = new Set();
      for (let i = 0; i <= padded.length - 3; i += 1) trigrams.add(padded.slice(i, i + 3));
      for (const trig of trigrams) insertTrig.run(word, trig);
    }
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

const total = db.prepare('SELECT count(*) AS n FROM vocabulary').get().n;
const trigramRows = db.prepare('SELECT count(*) AS n FROM vocabulary_trigram').get().n;
console.log(`[vocabulary] ${total} kata dari ${rows.length} judul (${trigramRows} baris trigram)`);
db.close();
