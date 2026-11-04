#!/usr/bin/env node
/**
 * Mencari sampul tambahan dari sumber eksternal untuk buku yang belum punya:
 *
 *   1. OpenLibrary  — gratis tanpa API key, diuji dulu (cepat, tanpa kuota).
 *   2. Google Books — butuh API key (GBS_API_KEY di .env.local); kuota gratis
 *      1.000 permintaan/hari, jadi skrip berhenti otomatis saat kuota habis.
 *
 * Buku tanpa ISBN atau dengan ISBN terbitan Indonesia (602/979) sangat
 * kecil kemungkinannya tercatat di sumber luar — dilewati agar kuota tidak
 * terbuang (lihat survey: OpenLibrary 1/20, GBS 0/8 untuk ISBN lokal).
 *
 * Sampul yang ditemukan disimpan ke books.cover_url + dimensi dihitung dari
 * header gambar, sehingga BookCard langsung memakainya.
 *
 * Resumable: buku yang sudah bersampul dilewati. Jalankan berulang sampai
 * kuota harian habis lalu besoknya lagi.
 *
 * Pemakaian:
 *   node --use-system-ca scripts/fetch-external-covers.mjs              # semua
 *   node --use-system-ca scripts/fetch-external-covers.mjs --limit=500
 *   node --use-system-ca scripts/fetch-external-covers.mjs --source=openlibrary
 *   node --use-system-ca scripts/fetch-external-covers.mjs --source=gbooks
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadEnv } from './env.mjs';

loadEnv();

const DB_PATH = process.env.OPAC_DB_PATH ?? path.join(process.cwd(), 'data', 'opac.db');
const SCHEMA = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

const args = process.argv.slice(2);
const opt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
};
const LIMIT = opt('limit') ? Number(opt('limit')) : null;
const SOURCE = opt('source') ?? 'both';
const DELAY = Number(opt('delay') ?? 400);
const GBS_KEY = process.env.GBS_API_KEY ?? null;

// Awalan ISBN International ISBN Agency untuk terbitan Indonesia.
const ID_PREFIXES = ['978602', '978979', '978623', '978634', '602', '979', '623', '634'];

function isLikelyIndonesian(clean) {
  return ID_PREFIXES.some((p) => clean.startsWith(p));
}

/** Dimensi dari header JPEG/PNG/GIF (tanpa library). */
function imageSize(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.toString('ascii', 0, 3) === 'GIF') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  return null;
}

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // Gambar placeholder ("tidak ada sampul") berukuran ratusan byte - tolak.
  if (buf.length < 2000) return null;
  const size = imageSize(buf);
  if (!size || size.width < 80 || size.height < 100) return null;
  // Rasio sampul buku wajar: 0.4 - 1.2. Tolak spanduk/ikon.
  const ratio = size.width / size.height;
  if (ratio < 0.4 || ratio > 1.2) return null;
  return { url, width: size.width, height: size.height };
}

async function tryOpenLibrary(isbn) {
  try {
    return await download(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
  } catch {
    return null;
  }
}

async function tryGoogleBooks(isbn) {
  try {
    const key = GBS_KEY ? `&key=${GBS_KEY}` : '';
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key}`, {
      signal: AbortSignal.timeout(25000),
    });
    if (res.status === 429) return { quota: true };
    if (!res.ok) return null;
    const data = await res.json();
    const links = data.items?.[0]?.volumeInfo?.imageLinks;
    if (!links) return null;
    // thumbnail = ~128px, zoom=1 lebih besar. GBS menyajikan http:// - paksa https.
    const raw = links.thumbnail ?? links.smallThumbnail;
    if (!raw) return null;
    const url = raw.replace(/^http:/, 'https:').replace('&edge=curl', '');
    return await download(url);
  } catch {
    return null;
  }
}

async function main() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(fs.readFileSync(SCHEMA, 'utf8'));

  const rows = db
    .prepare(
      `SELECT id, isbn FROM books
       WHERE cover_url IS NULL AND isbn IS NOT NULL AND isbn != ''
       ORDER BY id`,
    )
    .all();
  let queue = rows.filter((r) => {
    const clean = r.isbn.replace(/[^0-9Xx]/g, '');
    r.clean = clean;
    return clean.length >= 10 && clean.length <= 17 && !isLikelyIndonesian(clean);
  });
  if (LIMIT) queue = queue.slice(0, LIMIT);

  const useOL = SOURCE === 'both' || SOURCE === 'openlibrary';
  const useGBS = (SOURCE === 'both' || SOURCE === 'gbooks') && GBS_KEY;
  if (!useGBS && (SOURCE === 'gbooks' || SOURCE === 'both')) {
    console.log('[covers] GBS_API_KEY tidak ada di .env.local - Google Books dilewati.');
  }

  console.log(`[covers] ${queue.length} buku layak dicek (OpenLibrary=${useOL}, GoogleBooks=${useGBS})`);

  const update = db.prepare(
    'UPDATE books SET cover_url = ?, cover_width = ?, cover_height = ? WHERE id = ?',
  );
  let ok = 0;
  let miss = 0;
  let quotaLeft = true;

  for (const [index, row] of queue.entries()) {
    if (!quotaLeft) {
      console.log(`[covers] kuota Google Books habis di item ${index} - berhenti (resumable).`);
      break;
    }

    let found = null;

    if (useOL) {
      found = await tryOpenLibrary(row.clean);
      await new Promise((r) => setTimeout(r, DELAY));
    }

    if (!found && useGBS) {
      const result = await tryGoogleBooks(row.clean);
      if (result?.quota) {
        quotaLeft = false;
        continue;
      }
      found = result;
      await new Promise((r) => setTimeout(r, DELAY));
    }

    if (found) {
      update.run(found.url, found.width, found.height, row.id);
      ok += 1;
    } else {
      miss += 1;
    }

    if ((index + 1) % 50 === 0) {
      console.log(`[covers] ${index + 1}/${queue.length} (dapat ${ok}, kosong ${miss})`);
    }
  }

  const stats = db
    .prepare(
      `SELECT count(*) AS total,
              sum(CASE WHEN cover_url IS NOT NULL THEN 1 ELSE 0 END) AS withCover
         FROM books`,
    )
    .get();
  console.log(`[covers] selesai: +${ok} sampul baru`);
  console.log(`[covers] total koleksi: ${stats.withCover}/${stats.total} bersampul`);
  db.close();
}

main().catch((err) => {
  console.error('[covers] fatal:', err.message);
  process.exit(1);
});
