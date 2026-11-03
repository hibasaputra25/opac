#!/usr/bin/env node
/**
 * Mengisi kolom cover_width & cover_height untuk semua buku yang punya sampul.
 * Dimensi dipakai BookCard untuk menentukan tinggi area sampul sehingga tiap
 * kartu mengikuti rasio asli gambarnya.
 *
 * Dimensi dibaca dari header berkas gambar tanpa library tambahan (JPEG/PNG/GIF).
 * Berkas tetap diunduh utuh karena sebagian sampul menyimpan blok EXIF/ICC besar
 * yang menunda munculnya penanda dimensi.
 *
 * Resumable & bertahap: buku yang sudah punya dimensi dilewati, dan sampul yang
 * gagal diulang dengan laju lebih lambat (server katalog lama membatasi akses).
 *
 * Pemakaian:
 *   node --use-system-ca scripts/measure-covers.mjs              # semua buku
 *   node --use-system-ca scripts/measure-covers.mjs --limit=500
 *   node --use-system-ca scripts/measure-covers.mjs --refresh    # ukur ulang semua
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
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
const CONCURRENCY = Number(opt('concurrency', 12));
const REFRESH = args.includes('--refresh');

const agent = new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY, rejectUnauthorized: false });

/**
 * Unduh berkas sampul.
 *
 * Sebagian sampul menyimpan blok EXIF/ICC yang besar sehingga penanda dimensi
 * (SOF) baru muncul setelah ratusan KB. Karena itu seluruh isi diunduh; header
 * `Range` tidak dipakai karena server katalog lama kerap mengabaikannya.
 */
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { agent, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' }, timeout: 40000 },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/** Baca dimensi dari header JPEG. */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

/** Baca dimensi dari header PNG. */
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Baca dimensi dari header GIF. */
function gifSize(buf) {
  if (buf.toString('ascii', 0, 3) !== 'GIF') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function imageSize(buf) {
  return jpegSize(buf) ?? pngSize(buf) ?? gifSize(buf);
}

async function measure(url) {
  const buf = await fetchImage(url);
  const size = imageSize(buf);
  if (!size || !size.width || !size.height) return null;
  return size;
}

async function measureAll({ concurrency, delay }) {
  const db = new DatabaseSync(DB_PATH);
  db.exec(fs.readFileSync(SCHEMA, 'utf8'));

  const where = REFRESH
    ? "WHERE cover_url IS NOT NULL AND cover_url != ''"
    : "WHERE cover_url IS NOT NULL AND cover_url != '' AND (cover_width IS NULL OR cover_height IS NULL)";

  let rows = db
    .prepare(`SELECT id, cover_url FROM books ${where} ORDER BY id`)
    .all();

  if (LIMIT) rows = rows.slice(0, LIMIT);

  console.log(`[cover] ${rows.length} sampul akan diukur (paralel ${concurrency})`);

  if (!rows.length) {
    db.close();
    return 0;
  }

  const update = db.prepare('UPDATE books SET cover_width = ?, cover_height = ? WHERE id = ?');
  let done = 0;
  let ok = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < rows.length) {
      const row = rows[cursor++];
      try {
        if (delay) await sleep(delay);
        const size = await measure(row.cover_url);
        if (size) {
          update.run(size.width, size.height, row.id);
          ok += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
      done += 1;
      if (done % 100 === 0 || done === rows.length) {
        console.log(`[cover] ${done}/${rows.length} (ok ${ok}, gagal ${failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const stats = db
    .prepare(
      `SELECT count(*) AS total,
              sum(CASE WHEN cover_width IS NOT NULL THEN 1 ELSE 0 END) AS measured
         FROM books WHERE cover_url IS NOT NULL AND cover_url != ''`,
    )
    .get();

  console.log(`[cover] putaran selesai: ${ok} diukur, ${failed} gagal`);
  console.log('[cover] total:', stats);
  db.close();
  return stats.total - stats.measured;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Server katalog lama menolak sebagian permintaan saat diakses beruntun
 * (koneksi putus di tengah unduhan). Putaran ulang dengan jeda lebih lama
 * menyelamatkan sebagian besar sampul yang gagal pada putaran cepat.
 */
async function main() {
  const passes = [
    { concurrency: CONCURRENCY, delay: 0 },
    { concurrency: 2, delay: 250 },
    { concurrency: 1, delay: 600 },
  ];

  for (const [index, pass] of passes.entries()) {
    const remaining = await measureAll(pass);
    if (remaining === 0) break;
    if (index < passes.length - 1) {
      console.log(`[cover] putaran ${index + 1}: ${remaining} sampul gagal, mencoba lagi…`);
      await sleep(3000);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cover] fatal:', err.message);
    process.exit(1);
  });