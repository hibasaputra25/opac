#!/usr/bin/env node
/**
 * Seed akun staf, lokasi, agenda contoh, dan (opsional) anggota demo.
 * Pemakaian: npm run db:seed
 */
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadEnv } from './env.mjs';

loadEnv();
import { randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';

const DB_PATH = process.env.OPAC_DB_PATH ?? path.join(process.cwd(), 'data', 'opac.db');
const SCHEMA = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(fs.readFileSync(SCHEMA, 'utf8'));

function hash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

const users = [
  {
    name: 'Administrator OPAC',
    email: 'admin@mercubuana.ac.id',
    password: 'Admin#2026',
    role: 'admin',
    member_no: 'ADM001',
  },
  {
    name: 'Pustakawan Meruya',
    email: 'pustakawan@mercubuana.ac.id',
    password: 'Pustakawan#2026',
    role: 'librarian',
    member_no: 'PST001',
  },
  {
    name: 'Anggota Demo',
    email: 'anggota@mercubuana.ac.id',
    password: 'Anggota#2026',
    role: 'member',
    member_no: '2026010001',
    program: 'Teknik Informatika',
  },
];

for (const user of users) {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
  if (exists) {
    console.log(`[seed] lewati ${user.email} (sudah ada)`);
    continue;
  }
  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, member_no, program)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(user.name, user.email, hash(user.password), user.role, user.member_no, user.program ?? null);
  console.log(`[seed] dibuat ${user.email} / ${user.password}`);
}

const locations = [
  ['MRY', 'Perpustakaan Pusat — Meruya', 'Meruya', 'Jl. Meruya Selatan No.1, Kembangan, Jakarta Barat 11650'],
  ['MTN', 'Perpustakaan Menteng', 'Menteng', 'Jl. Menteng Raya No.29, Jakarta Pusat 10340'],
  ['BNC', 'Perpustakaan Buncit', 'Buncit', 'Jl. Kemang Selatan, Jakarta Selatan'],
];

for (const [code, name, campus, address] of locations) {
  db.prepare(
    `INSERT OR IGNORE INTO locations (code, name, campus, address) VALUES (?, ?, ?, ?)`,
  ).run(code, name, campus, address);
}

const now = Date.now();
const events = [
  {
    title: 'Bedah Buku: Literasi Digital untuk Mahasiswa',
    slug: 'bedah-buku-literasi-digital',
    description:
      'Diskusi bedah buku bertema literasi digital bersama dosen dan praktisi, terbuka untuk seluruh mahasiswa UMB.',
    location: 'Aula Perpustakaan Pusat Meruya',
    starts_at: new Date(now + 6 * 864e5).toISOString(),
    category: 'Diskusi',
  },
  {
    title: 'Pelatihan Mendeley & Sitasi Otomatis',
    slug: 'pelatihan-mendeley',
    description: 'Workshop penggunaan Mendeley untuk pengelolaan referensi tugas akhir dan skripsi.',
    location: 'Ruang Literasi Komputer',
    starts_at: new Date(now + 13 * 864e5).toISOString(),
    category: 'Pelatihan',
  },
  {
    title: 'Bincang Karya: Publikasi Jurnal Terindeks',
    slug: 'bincang-karya-publikasi-jurnal',
    description: 'Berbagi pengalaman menulis dan menerbitkan artikel di jurnal terindeks.',
    location: 'Perpustakaan Menteng',
    starts_at: new Date(now + 21 * 864e5).toISOString(),
    category: 'Seminar',
  },
];

for (const event of events) {
  db.prepare(
    `INSERT OR IGNORE INTO events (title, slug, description, location, starts_at, category)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(event.title, event.slug, event.description, event.location, event.starts_at, event.category);
}

console.log('[seed] selesai');
db.close();
