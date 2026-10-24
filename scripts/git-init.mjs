/**
 * Menyiapkan repository Git lokal memakai isomorphic-git (tanpa butuh Git CLI).
 * Hanya membuat repo + commit pertama; proses push dilakukan terpisah.
 */
import fs from 'node:fs';
import path from 'node:path';
import git from 'isomorphic-git';

const dir = 'C:/opac';

const author = {
  name: 'Hiba Saputra',
  email: 'hibasaputra25@users.noreply.github.com',
};

// Pola yang tidak boleh masuk repo
const IGNORE = [
  'node_modules/',
  '.next/',
  '.git/',
  'data/opac.db',
  'data/opac.db-wal',
  'data/opac.db-shm',
  'data/scrape/',
  '.env',
  '.env.local',
  '*.tsbuildinfo',
  'next-env.d.ts',
  'tsconfig.tsbuildinfo',
  'dev.log',
  'start.log',
  'build.log',
  'logo_umb.png',
];

function walk(current, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;

    if (IGNORE.some((pattern) => matches(rel, pattern) || matches(`${rel}/`, pattern))) continue;

    if (entry.isDirectory()) {
      out.push(...walk(path.join(current, entry.name), rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}

function matches(filePath, pattern) {
  if (pattern.startsWith('*.')) return filePath.endsWith(pattern.slice(1));
  return filePath === pattern || filePath.startsWith(pattern);
}

async function main() {
  const files = walk(dir).filter(
    (f) =>
      !f.startsWith('.env') &&
      !f.endsWith('.db') &&
      !f.endsWith('.db-wal') &&
      !f.endsWith('.db-shm'),
  );

  console.log(`[git] ${files.length} berkas akan di-commit`);

  if (!fs.existsSync(path.join(dir, '.git'))) {
    await git.init({ fs, dir, defaultBranch: 'main' });
    console.log('[git] repository diinisialisasi (branch: main)');
  }

  // Tulis .gitignore agar konsisten untuk penggunaan Git CLI nanti
  fs.writeFileSync(path.join(dir, '.gitignore.repo'), IGNORE.join('\n') + '\n');

  let added = 0;
  for (const file of files) {
    await git.add({ fs, dir, filepath: file });
    added += 1;
  }
  console.log(`[git] ${added} berkas ditambahkan ke staging`);

  const sha = await git.commit({
    fs,
    dir,
    message:
      'Initial commit: OPAC Perpustakaan Universitas Mercu Buana\n\n' +
      '- Katalog 36.286 judul dengan pencarian FTS5 dan filter faset\n' +
      '- Area anggota: reservasi, peminjaman, aktivitas, favorit, profil\n' +
      '- Sinkronisasi riwayat sirkulasi dari OLS UMB\n' +
      '- Next.js 16 + TypeScript + Tailwind v4 + SQLite (node:sqlite)',
    author,
  });

  console.log('[git] commit dibuat:', sha);
  fs.unlinkSync(path.join(dir, '.gitignore.repo'));
}

main().catch((err) => {
  console.error('[git] gagal:', err.message);
  process.exit(1);
});
