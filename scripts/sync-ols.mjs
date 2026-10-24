#!/usr/bin/env node
/**
 * Sinkronisasi riwayat sirkulasi dari OLS Mercu Buana ke database OPAC.
 *
 * OPAC bersifat BACA-SAJA. Sumber kebenaran sirkulasi tetap OLS
 * (https://ols.mercubuana.ac.id). Skrip ini hanya menyalin riwayat
 * peminjaman per anggota agar bisa ditampilkan di halaman akun.
 *
 * Pemakaian:
 *   node scripts/sync-ols.mjs                 # semua anggota yang terdaftar di OPAC
 *   node scripts/sync-ols.mjs --member=0160312-067
 *   node scripts/sync-ols.mjs --limit=50
 *
 * Kredensial diambil dari environment:
 *   OLS_USER / OLS_PASS
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as cheerio from 'cheerio';
import { loadEnv } from './env.mjs';

loadEnv();

const BASE = process.env.OLS_BASE_URL ?? 'https://ols.mercubuana.ac.id';
const USER = process.env.OLS_USER;
const PASS = process.env.OLS_PASS;
const DB_PATH = process.env.OPAC_DB_PATH ?? path.join(process.cwd(), 'data', 'opac.db');
const SCHEMA = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

if (!USER || !PASS) {
  console.error('OLS_USER dan OLS_PASS wajib diisi (environment atau .env.local).');
  process.exit(1);
}

const args = process.argv.slice(2);
const opt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
};
const ONLY_MEMBER = opt('member');
const LIMIT = opt('limit') ? Number(opt('limit')) : null;

// ---------------------------------------------------------------- HTTP client

const jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

function storeCookies(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    redirect: 'manual',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9',
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...(options.headers ?? {}),
    },
  });
  storeCookies(res);
  return res;
}

async function login() {
  const page = await request(`${BASE}/login`);
  const html = await page.text();
  const token = html.match(/name="_token" value="([^"]+)"/)?.[1];
  if (!token) throw new Error('Token CSRF login tidak ditemukan.');

  await request(`${BASE}/login`, {
    method: 'POST',
    body: new URLSearchParams({ _token: token, username: USER, password: PASS }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const home = await request(`${BASE}/home`);
  if (home.status !== 200) throw new Error(`Login gagal (status ${home.status}).`);
  console.log('[ols] login berhasil sebagai', USER);
}

async function csrfToken() {
  const page = await request(`${BASE}/sirkulasi/history-anggota`);
  const html = await page.text();
  const token = html.match(/csrf-token" content="([^"]+)"/)?.[1];
  if (!token) throw new Error('Token CSRF halaman history tidak ditemukan.');
  return token;
}

// ------------------------------------------------------------------- scraping

const TABS = [
  { key: 'buku', path: 'buku' },
  { key: 'loker', path: 'loker' },
];

function parseRows(html) {
  const $ = cheerio.load(html);
  const rows = [];

  $('table tbody tr').each((_, tr) => {
    const cells = $(tr)
      .find('td')
      .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();
    if (cells.length < 4) return;

    rows.push({
      barcode: cells[0] || null,
      title: cells[1] || null,
      author: cells[2] || null,
      borrowed_at: cells[3] || null,
      due_at: cells[4] || null,
      returned_at: cells[5] || null,
      officer_in: cells[6] || null,
      officer_out: cells[7] || null,
    });
  });

  return rows;
}

/**
 * Tabel loker/tas memiliki header sendiri:
 * No Barcode | Nama Loker | Tgl Pinjam | Tgl Seharusnya | Kembali | Cetak
 *
 * Halaman OLS juga memuat tabel identitas anggota, jadi kita pilih tabel yang
 * header-nya memuat kolom loker, lalu petakan kolom berdasarkan nama header
 * (bukan posisi) agar tahan terhadap perubahan urutan.
 */
function parseLockerRows(html) {
  const $ = cheerio.load(html);
  let table = null;
  let headers = [];

  $('table').each((_, candidate) => {
    if (table) return;
    const found = $(candidate)
      .find('thead th')
      .map((__, th) => $(th).text().replace(/\s+/g, ' ').trim().toLowerCase())
      .get();
    if (found.some((h) => h.includes('loker'))) {
      table = $(candidate);
      headers = found;
    }
  });

  if (!table) return [];

  const col = (...needles) => {
    for (const needle of needles) {
      const index = headers.findIndex((h) => h.includes(needle));
      if (index >= 0) return index;
    }
    return -1;
  };

  const idxBarcode = col('barcode');
  const idxName = col('nama loker', 'loker');
  const idxBorrowed = col('tgl pinjam', 'pinjam');
  const idxDue = col('tgl seharusnya', 'seharusnya');
  const idxReturned = col('kembali');

  const rows = [];

  table.find('tbody tr').each((_, tr) => {
    const cells = $(tr)
      .find('td')
      .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();
    if (!cells.length) return;
    if (cells.length === 1 && /tidak ada data/i.test(cells[0])) return;

    const at = (index) => (index >= 0 ? cells[index] || null : null);

    const barcode = at(idxBarcode);
    const name = at(idxName);
    const code = name || barcode;

    if (!code) return;

    rows.push({
      code,
      barcode,
      borrowed_at: at(idxBorrowed),
      due_at: at(idxDue),
      returned_at: at(idxReturned),
      fine: 0,
      paid: 0,
      is_problem: 0,
    });
  });

  return rows;
}

async function postHistory(token, memberNo, path) {
  const res = await request(`${BASE}/sirkulasi/history-anggota/${path}`, {
    method: 'POST',
    body: new URLSearchParams({ anggota: memberNo, _token: token }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${BASE}/sirkulasi/history-anggota`,
    },
  });

  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchHistory(token, memberNo) {
  const collected = [];

  for (const tab of TABS) {
    const payload = await postHistory(token, memberNo, tab.path);

    if (!payload || payload.status !== 'success' || !payload.html) continue;
    collected.push(...parseRows(payload.html));
  }

  return collected;
}

async function fetchLockerUsage(token, memberNo) {
  const payload = await postHistory(token, memberNo, 'loker');
  if (!payload || payload.status !== 'success' || !payload.html) return [];
  return parseLockerRows(payload.html);
}

// ---------------------------------------------------------------------- main

function normalizeDate(value) {
  if (!value) return null;
  // 24-01-2006 → 2006-01-24
  const m = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // 24-01-2006 14:30 → 2006-01-24 14:30
  const dt = value.match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}:\d{2})/);
  if (dt) return `${dt[3]}-${dt[2]}-${dt[1]} ${dt[4]}`;
  return value;
}

/** Menebak jenis: tas biasanya berawalan huruf, loker berupa angka. */
function guessLockerKind(code) {
  if (!code) return 'locker';
  return /^[A-Za-z]/.test(code.trim()) ? 'bag' : 'locker';
}

async function main() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(fs.readFileSync(SCHEMA, 'utf8'));

  let members = [];
  if (ONLY_MEMBER) {
    members = [ONLY_MEMBER];
  } else {
    members = db
      .prepare(
        `SELECT member_no FROM users
          WHERE role = 'member' AND member_no IS NOT NULL AND status = 'active'`,
      )
      .all()
      .map((r) => r.member_no);
  }

  if (LIMIT) members = members.slice(0, LIMIT);
  console.log(`[ols] ${members.length} anggota akan disinkronkan`);

  if (!members.length) {
    console.log('[ols] tidak ada nomor anggota. Isi member_no pada tabel users.');
    db.close();
    return;
  }

  await login();
  const token = await csrfToken();

  const upsertLoan = db.prepare(`
    INSERT INTO circulation_history
      (member_no, barcode, title, author, borrowed_at, due_at, returned_at, officer_in, officer_out, source, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ols', datetime('now'))
    ON CONFLICT(member_no, barcode, borrowed_at) DO UPDATE SET
      title       = excluded.title,
      author      = excluded.author,
      due_at      = excluded.due_at,
      returned_at = excluded.returned_at,
      officer_in  = excluded.officer_in,
      officer_out = excluded.officer_out,
      synced_at   = datetime('now')
  `);

  const upsertLocker = db.prepare(`
    INSERT INTO locker_usage
      (member_no, code, kind, borrowed_at, due_at, returned_at, fine, paid, is_problem, source, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ols', datetime('now'))
    ON CONFLICT(member_no, code, borrowed_at) DO UPDATE SET
      due_at      = excluded.due_at,
      returned_at = excluded.returned_at,
      fine        = excluded.fine,
      paid        = excluded.paid,
      is_problem  = excluded.is_problem,
      synced_at   = datetime('now')
  `);

  // Kunjungan diturunkan dari pemakaian loker/tas: Tgl Pinjam = masuk,
  // Tgl Kembali = keluar. Anggota yang tidak meminjam loker tidak tercatat
  // di sini (hanya terdata lewat menu pengunjung OLS).
  const upsertVisit = db.prepare(`
    INSERT INTO visits (member_no, check_in, check_out, purpose, source, synced_at)
    VALUES (?, ?, ?, ?, 'ols-loker', datetime('now'))
    ON CONFLICT(member_no, check_in) DO UPDATE SET
      check_out = COALESCE(excluded.check_out, visits.check_out),
      synced_at = datetime('now')
  `);

  /**
   * Rekonsiliasi reservasi OPAC dengan kenyataan di OLS.
   *
   * Jika seorang anggota punya reservasi aktif untuk sebuah eksemplar, lalu
   * barcode eksemplar itu muncul di riwayat pinjamnya (artinya petugas sudah
   * memproses peminjaman), reservasi ditandai 'fulfilled'.
   */
  const findReservation = db.prepare(`
    SELECT r.id FROM reservations r
      JOIN users u ON u.id = r.user_id
      JOIN items i ON i.id = r.item_id
     WHERE u.member_no = ?
       AND i.barcode = ?
       AND r.status = 'active'
     LIMIT 1
  `);

  const fulfillReservation = db.prepare(`
    UPDATE reservations
       SET status = 'fulfilled', closed_at = datetime('now')
     WHERE id = ?
  `);

  let fulfilled = 0;

  let loanCount = 0;
  let lockerCount = 0;
  let visitCount = 0;

  for (const member of members) {
    try {
      // 1. Riwayat pinjam buku
      const loans = await fetchHistory(token, member);
      for (const row of loans) {
        upsertLoan.run(
          member,
          row.barcode,
          row.title,
          row.author,
          normalizeDate(row.borrowed_at),
          normalizeDate(row.due_at),
          normalizeDate(row.returned_at),
          row.officer_in,
          row.officer_out,
        );

        // Rekonsiliasi: bila barcode ini sedang direservasi anggota tsb,
        // tandai reservasinya terpenuhi.
        if (row.barcode) {
          const reservation = findReservation.get(member, row.barcode.trim());
          if (reservation) {
            fulfillReservation.run(reservation.id);
            fulfilled += 1;
          }
        }
      }
      loanCount += loans.length;

      // 2. Loker & tas
      const lockers = await fetchLockerUsage(token, member);
      for (const row of lockers) {
        const borrowed = normalizeDate(row.borrowed_at);
        const returned = normalizeDate(row.returned_at);
        upsertLocker.run(
          member,
          row.code,
          guessLockerKind(row.code),
          borrowed,
          normalizeDate(row.due_at),
          returned,
          row.fine,
          row.paid,
          row.is_problem,
        );
        // Turunkan kunjungan dari pemakaian loker
        if (borrowed) {
          upsertVisit.run(member, borrowed, returned, 'Peminjaman loker/tas');
          visitCount += 1;
        }
      }
      lockerCount += lockers.length;

      console.log(`[ols] ${member} → ${loans.length} pinjam, ${lockers.length} loker/tas`);
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`[ols] gagal ${member}: ${err.message}`);
    }
  }

  const stats = db
    .prepare(
      `SELECT (SELECT count(*) FROM circulation_history) AS pinjam,
              (SELECT count(*) FROM locker_usage) AS loker,
              (SELECT count(*) FROM visits) AS kunjungan`,
    )
    .get();

  console.log(
    `[ols] selesai: ${loanCount} pinjam, ${lockerCount} loker/tas, ${visitCount} kunjungan diproses`,
  );
  if (fulfilled) console.log(`[ols] ${fulfilled} reservasi ditandai terpenuhi`);
  console.log('[ols] total di database:', stats);
  db.close();
}

main().catch((err) => {
  console.error('[ols] fatal:', err.message);
  process.exit(1);
});
