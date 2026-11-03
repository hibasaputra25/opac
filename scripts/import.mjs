#!/usr/bin/env node
/**
 * Impor hasil scraping ke database SQLite.
 * Aman dijalankan berulang: buku di-upsert berdasarkan source_id,
 * eksemplar di-upsert berdasarkan barcode.
 *
 * Pemakaian: npm run db:import
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadEnv } from './env.mjs';

loadEnv();

const DB_PATH = process.env.OPAC_DB_PATH ?? path.join(process.cwd(), 'data', 'opac.db');
const SCHEMA = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
const SCRAPE_DIR = path.join(process.cwd(), 'data', 'scrape');
const BOOKS_FILE = path.join(SCRAPE_DIR, 'books.jsonl');
const DETAILS_FILE = path.join(SCRAPE_DIR, 'details.jsonl');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(fs.readFileSync(SCHEMA, 'utf8'));

const readJsonl = (file) => {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
};

const clean = (s) => {
  if (typeof s !== 'string') return null;
  const value = s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  return value || null;
};

const titleCase = (s) =>
  (s ?? '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const slugify = (s) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'subjek';

function splitList(value, separators = /;/) {
  if (!value) return [];
  return [
    ...new Set(
      String(value)
        .split(separators)
        .map((s) => clean(s))
        .filter((s) => s && s.length > 1),
    ),
  ];
}

// ---------------------------------------------------------------- master data

const cache = {
  authors: new Map(),
  subjects: new Map(),
  publishers: new Map(),
  categories: new Map(),
  locations: new Map(),
};

function idFor(table, map, name, extra) {
  const key = name.toLowerCase();
  if (map.has(key)) return map.get(key);
  let row;

  const existing = db.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name);
  if (existing) {
    map.set(key, existing.id);
    return existing.id;
  }

  if (table === 'subjects' || table === 'categories') {
    const slug = slugify(name);
    let candidate = slug;
    let n = 2;
    while (db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`).get(candidate)) {
      candidate = `${slug}-${n++}`;
    }
    row = db
      .prepare(`INSERT INTO ${table} (name, slug) VALUES (?, ?) RETURNING id`)
      .get(name, candidate);
  } else if (table === 'locations') {
    row = db
      .prepare('INSERT INTO locations (code, name, campus) VALUES (?, ?, ?) RETURNING id')
      .get(extra.code, name, extra.campus ?? null);
  } else {
    row = db.prepare(`INSERT INTO ${table} (name) VALUES (?) RETURNING id`).get(name);
  }
  map.set(key, row.id);
  return row.id;
}

function seedLocations() {
  const defaults = [
    ['MRY', 'Perpustakaan Pusat — Meruya', 'Meruya'],
    ['MTN', 'Perpustakaan Menteng', 'Menteng'],
    ['BNC', 'Perpustakaan Buncit', 'Buncit'],
  ];
  for (const [code, name, campus] of defaults) {
    const existing = db.prepare('SELECT id FROM locations WHERE code = ?').get(code);
    if (existing) {
      cache.locations.set(campus.toLowerCase(), existing.id);
    } else {
      const row = db
        .prepare('INSERT INTO locations (code, name, campus) VALUES (?, ?, ?) RETURNING id')
        .get(code, name, campus);
      cache.locations.set(campus.toLowerCase(), row.id);
    }
  }
}

function locationId(raw) {
  if (!raw) return cache.locations.get('meruya');
  const campus = String(raw).split('/')[0].trim();
  const known = ['meruya', 'menteng', 'buncit'];
  const key = known.find((k) => campus.toLowerCase().includes(k)) ?? 'meruya';
  return cache.locations.get(key);
}

// ------------------------------------------------------------------- statuses

function normalizeStatus(raw) {
  const s = (raw ?? '').toLowerCase();
  if (!s) return 'available';
  if (s.includes('hilang')) return 'lost';
  if (s.includes('rusak')) return 'damaged';
  if (s.includes('pinjam')) return 'borrowed';
  if (s.includes('referensi') || s.includes('baca di tempat')) return 'reference';
  if (s.includes('reserv')) return 'reserved';
  return 'available';
}

// ------------------------------------------------------- klasifikasi DDC

const DDC_CLASSES = [
  ['000', 'Ilmu Komputer & Informasi Umum'],
  ['100', 'Filsafat & Psikologi'],
  ['200', 'Agama'],
  ['300', 'Ilmu Sosial'],
  ['400', 'Bahasa'],
  ['500', 'Sains & Matematika'],
  ['600', 'Teknologi & Ilmu Terapan'],
  ['700', 'Seni & Rekreasi'],
  ['800', 'Sastra'],
  ['900', 'Sejarah & Geografi'],
];

function ddcCategory(callNumber) {
  if (!callNumber) return null;
  // Contoh: "658.8 HAK m", "R/155.25 ROB l", "KC/155.25 ROB l"
  const match = String(callNumber).match(/(\d{3})(?:\.\d+)?/);
  if (!match) return null;
  const hundred = `${match[1][0]}00`;
  return DDC_CLASSES.find(([code]) => code === hundred)?.[1] ?? null;
}

// ------------------------------------------------------------------ upserting

const insertBook = db.prepare(`
  INSERT INTO books (source_id, title, call_number, isbn, edition, publisher_id, year,
                     language, origin, category_id, description, cover_url, collection_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_id) DO UPDATE SET
    title        = COALESCE(excluded.title, books.title),
    call_number  = COALESCE(excluded.call_number, books.call_number),
    isbn         = COALESCE(excluded.isbn, books.isbn),
    edition      = COALESCE(excluded.edition, books.edition),
    publisher_id = COALESCE(excluded.publisher_id, books.publisher_id),
    year         = COALESCE(excluded.year, books.year),
    language     = COALESCE(excluded.language, books.language),
    origin       = COALESCE(excluded.origin, books.origin),
    category_id  = COALESCE(excluded.category_id, books.category_id),
    description  = COALESCE(excluded.description, books.description),
    cover_url    = COALESCE(excluded.cover_url, books.cover_url),
    updated_at   = datetime('now')
  RETURNING id
`);

const insertAuthor = db.prepare(
  'INSERT OR IGNORE INTO book_authors (book_id, author_id, role, position) VALUES (?, ?, ?, ?)',
);
const insertSubject = db.prepare(
  'INSERT OR IGNORE INTO book_subjects (book_id, subject_id) VALUES (?, ?)',
);
const insertItem = db.prepare(`
  INSERT INTO items (book_id, barcode, register_no, location_id, call_number, acquisition, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(barcode) DO UPDATE SET
    book_id     = excluded.book_id,
    register_no = COALESCE(excluded.register_no, items.register_no),
    location_id = COALESCE(excluded.location_id, items.location_id),
    status      = excluded.status
`);

function main() {
  seedLocations();

  const books = readJsonl(BOOKS_FILE);
  const details = new Map(readJsonl(DETAILS_FILE).map((d) => [d.source_id, d]));
  console.log(`[import] ${books.length} buku, ${details.size} detail`);


  db.exec('BEGIN');
  try {
    for (const book of books) {
      const detail = details.get(book.source_id);
      const title = clean(detail?.title) || clean(book.title);
      if (!title) continue;

      const publisherName = clean(detail?.publisher) || clean(book.publisher);
      const publisherId = publisherName
        ? idFor('publishers', cache.publishers, publisherName)
        : null;

      const categoryName =
        ddcCategory(clean(detail?.call_number) || clean(book.call_number)) ||
        titleCase(clean(detail?.category));
      const categoryId = categoryName
        ? idFor('categories', cache.categories, categoryName)
        : null;

      const result = insertBook.get(
        book.source_id,
        title,
        clean(detail?.call_number) || clean(book.call_number),
        clean(detail?.isbn) || clean(book.isbn),
        clean(book.edition),
        publisherId,
        Number(detail?.year) || Number(book.year) || null,        clean(detail?.language) || 'Indonesia',
        clean(detail?.origin) || null,
        categoryId,
        clean(detail?.synopsis) || null,
        clean(detail?.cover_url)?.replace('http://', 'https://') ?? null,
        'Buku',
      );
      const bookId = result.id;

      const authorNames = splitList(detail?.author) .length
        ? splitList(detail?.author)
        : splitList(book.author);
      if (authorNames.length) {
        db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(bookId);
        authorNames.forEach((name, index) => {
          const authorId = idFor('authors', cache.authors, name);
          insertAuthor.run(bookId, authorId, 'Pengarang', index);
        });
      }

      const subjectNames = splitList(detail?.subject);
      const department = titleCase(clean(detail?.category));
      if (department && !subjectNames.some((s) => s.toLowerCase() === department.toLowerCase())) {
        subjectNames.push(department);
      }
      if (subjectNames.length) {
        db.prepare('DELETE FROM book_subjects WHERE book_id = ?').run(bookId);
        for (const name of subjectNames) {
          const subjectId = idFor('subjects', cache.subjects, titleCase(name));
          insertSubject.run(bookId, subjectId);
        }
      }

      for (const item of detail?.items ?? []) {
        const barcode = clean(item.barcode);
        if (!barcode) continue;
        insertItem.run(
          bookId,
          barcode,
          clean(item.register_no),
          locationId(item.location),
          clean(book.call_number),
          clean(item.acquisition),
          normalizeStatus(item.status),
        );
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  console.log('[import] membangun indeks pencarian…');
  db.exec('DROP TABLE IF EXISTS books_fts;');
  db.exec(`
    CREATE VIRTUAL TABLE books_fts USING fts5(
      title, authors, subjects, publisher, isbn, call_number, content=''
    );
  `);
  db.exec(`
    INSERT INTO books_fts (rowid, title, authors, subjects, publisher, isbn, call_number)
    SELECT b.id, b.title,
      COALESCE((SELECT group_concat(a.name, ' ') FROM book_authors ba
                JOIN authors a ON a.id = ba.author_id WHERE ba.book_id = b.id), ''),
      COALESCE((SELECT group_concat(s.name, ' ') FROM book_subjects bs
                JOIN subjects s ON s.id = bs.subject_id WHERE bs.book_id = b.id), ''),
      COALESCE(p.name, ''), COALESCE(b.isbn, ''), COALESCE(b.call_number, '')
    FROM books b LEFT JOIN publishers p ON p.id = b.publisher_id;
  `);

  const stats = db
    .prepare(
      `SELECT (SELECT count(*) FROM books) books,
              (SELECT count(*) FROM items) items,
              (SELECT count(*) FROM authors) authors,
              (SELECT count(*) FROM subjects) subjects`,
    )
    .get();
  console.log('[import] selesai:', stats);
  db.close();
}

main();
