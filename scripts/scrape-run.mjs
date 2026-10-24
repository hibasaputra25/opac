/**
 * Supervisor scraper: menjalankan scrape.mjs berulang sampai tidak ada
 * kemajuan (semua halaman / detail sudah tersimpan). Menangani crash
 * internal undici (ERR_ASSERTION) dengan melanjutkan dari posisi terakhir.
 *
 * Pemakaian: node --use-system-ca scripts/scrape-run.mjs --details
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv.includes('--details') ? '--details' : '--lists';
const extra = process.argv.slice(2).filter((a) => !a.startsWith('--details') && !a.startsWith('--lists'));

const file =
  mode === '--details'
    ? path.join(process.cwd(), 'data', 'scrape', 'details.jsonl')
    : path.join(process.cwd(), 'data', 'scrape', 'books.jsonl');

const count = () => {
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
};

let previous = -1;
let round = 0;
let startPage = 1;

while (true) {
  round += 1;
  const before = count();
  console.log(`\n[run ${round}] ${mode} — ${before} baris tersimpan`);

  const args = ['--use-system-ca', 'scripts/scrape.mjs', mode, ...extra];
  if (mode === '--lists' && startPage > 1) args.push(`--start-page=${startPage}`);

  spawnSync(process.execPath, args, { stdio: 'inherit' });

  const after = count();
  console.log(`[run ${round}] selesai: ${before} → ${after}`);

  if (after === before && after === previous) {
    console.log('[run] tidak ada kemajuan, berhenti.');
    break;
  }
  previous = after;

  // Untuk daftar, mulai ulang dari halaman yang belum terisi.
  if (mode === '--lists') {
    const pages = Math.ceil(after / 20);
    startPage = Math.max(1, pages - 2);
  }
}
