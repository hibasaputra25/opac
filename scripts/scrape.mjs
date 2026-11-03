#!/usr/bin/env node
/**
 * Scraper katalog lama Perpustakaan UMB (katalog_meruya).
 *
 * Menghasilkan dua berkas JSONL di data/scrape/:
 *   - books.jsonl   : metadata dari halaman daftar (judul, call number, ISBN, pengarang, penerbit, tahun)
 *   - details.jsonl : metadata rinci + daftar eksemplar per buku
 *
 * Resumable: berkas JSONL di-append dan ID yang sudah ada dilewati.
 *
 * Contoh:
 *   node scripts/scrape.mjs --lists              # hanya 1.815 halaman daftar
 *   node scripts/scrape.mjs --details            # detail untuk semua buku
 *   node scripts/scrape.mjs --details --limit=500
 *   node scripts/scrape.mjs --lists --details
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import * as cheerio from 'cheerio';

const BASE = 'https://digilib.mercubuana.ac.id/katalog_meruya';
const OUT_DIR = path.join(process.cwd(), 'data', 'scrape');
const BOOKS_FILE = path.join(OUT_DIR, 'books.jsonl');
const DETAILS_FILE = path.join(OUT_DIR, 'details.jsonl');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const CONCURRENCY = Number(opt('concurrency', 8));
const LIMIT = opt('limit', null) ? Number(opt('limit')) : null;
const START_PAGE = Number(opt('start-page', 1));
const MAX_PAGE = Number(opt('max-page', 1815));
const HARD_CAP = opt('max-page', null) !== null;
const DELAY_MS = Number(opt('delay', 60));
const FORCE = flag('force');

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Server katalog lama memakai rantai sertifikat tidak lengkap, sehingga
// verifikasi TLS gagal. Data yang diambil bersifat publik (katalog),
// jadi verifikasi dimatikan khusus untuk proses scraping ini.
const agent = new https.Agent({
  keepAlive: false,
  maxSockets: CONCURRENCY,
  rejectUnauthorized: false,
});

function getText(url, timeout = 45000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        agent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          Accept: 'text/html,application/xhtml+xml',
          Connection: 'close',
        },
        timeout,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function fetchHtml(url, attempt = 1) {
  try {
    return await getText(url);
  } catch (err) {
    if (attempt >= 5) throw err;
    await sleep(700 * attempt);
    return fetchHtml(url, attempt + 1);
  }
}

const clean = (s) =>
  (s ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function appendJsonl(file, records) {
  if (!records.length) return;
  fs.appendFileSync(file, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// ---------------------------------------------------------------- list pages

function parseListPage(html) {
  const $ = cheerio.load(html);
  const rows = [];

  $('tr').each((_, tr) => {
    const $tr = $(tr);
    const link = $tr.find('a[href*="data13_view.php"]').first();
    if (!link.length) return;

    const href = link.attr('href') ?? '';
    const idMatch = href.match(/ID_Buku=(\d+)/);
    if (!idMatch) return;

    const cells = $tr.find('td');
    if (cells.length < 7) return;

    const isbnCell = cells.eq(3);
    const edition = clean(isbnCell.find('font[color]').text());
    const isbnRaw = clean(isbnCell.text()).replace(edition, '').trim();

    rows.push({
      source_id: idMatch[1],
      call_number: clean(cells.eq(1).text()) || null,
      title: clean(cells.eq(2).text()) || null,
      isbn: isbnRaw || null,
      edition: edition || null,
      author: clean(cells.eq(4).text()) || null,
      publisher: clean(cells.eq(5).text()) || null,
      year: Number(clean(cells.eq(6).text())) || null,
    });
  });

  const maxPage = Math.max(
    0,
    ...Array.from(html.matchAll(/page=(\d+)&per_page=/g)).map((m) => Number(m[1])),
  );

  return { rows, maxPage };
}

function listUrl(page) {
  const params = new URLSearchParams({
    Judulx: '',
    Subyek1: '',
    Pengarang1: '',
    jenisx: '',
    kampus: '',
    matkul: '',
    No_Bahasa1: '',
    No_Penerbit1: '',
    checkbox: '',
    page: String(page),
    per_page: '20',
    show: 'y',
    PHPSESID: '',
  });
  return `${BASE}/c_buku.php?${params.toString()}`;
}

async function scrapeLists() {
  const existing = new Set(readJsonl(BOOKS_FILE).map((r) => r.source_id));
  console.log(`[lists] ${existing.size} buku sudah tersimpan`);

  let discoveredMax = MAX_PAGE;
  let totalNew = 0;

  // Worker pool atas rentang halaman
  const pages = [];
  for (let p = START_PAGE; p <= discoveredMax; p += 1) pages.push(p);

  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < pages.length) {
      const current = pages[cursor++];
      try {
        const html = await fetchHtml(listUrl(current));
        const { rows, maxPage } = parseListPage(html);
        if (maxPage > discoveredMax) {
          discoveredMax = HARD_CAP ? Math.min(maxPage, MAX_PAGE) : maxPage;
          for (let p = pages.length + 1; p <= discoveredMax; p += 1) pages.push(p);
        }
        const fresh = rows.filter((r) => !existing.has(r.source_id));
        fresh.forEach((r) => existing.add(r.source_id));
        appendJsonl(BOOKS_FILE, fresh);
        totalNew += fresh.length;
        done += 1;
        if (done % 25 === 0) {
          console.log(`[lists] halaman ${done}/${pages.length} — ${existing.size} buku`);
        }
      } catch (err) {
        console.error(`[lists] gagal halaman ${current}: ${err.message}`);
      }
      if (DELAY_MS) await sleep(DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`[lists] selesai: +${totalNew} buku baru, total ${existing.size}`);
}

// -------------------------------------------------------------- detail pages

function parseDetail(html, sourceId) {
  const $ = cheerio.load(html);

  const title = clean($('td.j_view').first().text()) || null;
  const authorLine = clean($('td.t10').first().text());
  const author = authorLine.replace(/^by\s*:\s*/i, '').trim() || null;

  const fields = {};
  $('td.tarr, td.tarr2').each((_, td) => {
    const $td = $(td);
    const label = clean($td.text());
    const value = clean($td.next('td').text());
    if (label) fields[label.toLowerCase()] = value || null;
  });

  let cover = $('img[src*="file_buku"]').first().attr('src') ?? null;
  if (cover && /no_cover\.(jpg|png|gif)$/i.test(cover)) cover = null;
  if (cover && cover.startsWith('//')) cover = `https:${cover}`;
  // Server katalog lama hanya menyajikan berkas sampul lewat HTTPS;
  // permintaan HTTP selalu 404 sehingga gambar gagal tampil di browser.
  if (cover && cover.startsWith('http://')) cover = cover.replace('http://', 'https://');

  const synopsis = clean($('textarea[name="Alamat"]').first().text()) || null;

  return {
    source_id: sourceId,
    title,
    author,
    isbn: fields['isbn'] ?? null,
    origin: fields['asal'] ?? null,
    language: fields['bahasa'] ?? null,
    category: fields['jenis'] ?? null,
    call_number: fields['call no'] ?? null,
    publisher: fields['penerbit'] ?? null,
    year: Number(fields['tahun']) || null,
    copies: Number(fields['eksemplar']) || null,
    subject: fields['subjek'] ?? null,
    cover_url: cover,
    synopsis,
  };
}

function parseItems(html) {
  const $ = cheerio.load(html);
  const items = [];

  $('tr.thasil').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < 6) return;
    const status = clean(cells.eq(4).text());
    items.push({
      barcode: clean(cells.eq(1).text()) || null,
      register_no: clean(cells.eq(2).text()) || null,
      acquisition: clean(cells.eq(3).text()) || null,
      status: status || null,
      location: clean(cells.eq(5).text()) || null,
      borrower: clean(cells.eq(6).text()) || null,
    });
  });

  return items;
}

async function scrapeDetails() {
  const books = readJsonl(BOOKS_FILE);
  if (!books.length) {
    console.error('[details] books.jsonl kosong — jalankan --lists dulu');
    return;
  }

  const done = new Set(readJsonl(DETAILS_FILE).map((r) => r.source_id));
  let queue = books.filter((b) => !done.has(b.source_id));
  if (LIMIT) queue = queue.slice(0, LIMIT);
  console.log(`[details] ${done.size} selesai, ${queue.length} dalam antrean`);

  let cursor = 0;
  let processed = 0;

  async function worker() {
    while (cursor < queue.length) {
      const book = queue[cursor++];
      try {
        const [detailHtml, itemsHtml] = await Promise.all([
          fetchHtml(`${BASE}/data13_view.php?ID_Buku=${book.source_id}`),
          fetchHtml(`${BASE}/data13_eksemplar.php?ID_Buku=${book.source_id}`),
        ]);
        const detail = parseDetail(detailHtml, book.source_id);
        detail.items = parseItems(itemsHtml);
        detail.list = {
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          year: book.year,
          isbn: book.isbn,
          call_number: book.call_number,
          edition: book.edition,
        };
        appendJsonl(DETAILS_FILE, [detail]);
        processed += 1;
        if (processed % 50 === 0) {
          console.log(`[details] ${processed}/${queue.length}`);
        }
      } catch (err) {
        console.error(`[details] gagal ${book.source_id}: ${err.message}`);
      }
      if (DELAY_MS) await sleep(DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`[details] selesai: +${processed}`);
}

// ---------------------------------------------------------------------- main

const runLists = flag('lists') || (!flag('details') && !flag('import'));
const runDetails = flag('details');

if (FORCE) {
  if (runLists && fs.existsSync(BOOKS_FILE)) fs.rmSync(BOOKS_FILE);
  if (runDetails && fs.existsSync(DETAILS_FILE)) fs.rmSync(DETAILS_FILE);
}

if (runLists) await scrapeLists();
if (runDetails) await scrapeDetails();

// Koneksi keep-alive undici menahan event loop; keluar eksplisit setelah selesai.
process.exit(0);
