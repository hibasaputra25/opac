/**
 * Mengukur keseimbangan kolom masonry lewat HTML halaman katalog.
 *
 * Tinggi kartu dihitung dengan rumus yang sama seperti aplikasi, memakai data
 * dimensi sampul dari database, lalu dibandingkan antar kolom.
 *
 * Pemakaian: node scripts/check-masonry.mjs [nomorHalaman...]
 */
import { DatabaseSync } from 'node:sqlite';

const BASE = 'http://localhost:3000';
const COLUMN_WIDTH = (1152 - 16 * 3) / 4;
const GAP = 16;
const RATIO_MIN = 0.62;
const RATIO_MAX = 1.12;

const db = new DatabaseSync(process.env.OPAC_DB_PATH ?? 'C:/opac-data/opac.db', { readOnly: true });
const meta = new Map();
for (const r of db.prepare('SELECT id, title, cover_width, cover_height FROM books').all()) meta.set(r.id, r);
const subject = new Map();
for (const r of db
  .prepare(
    `SELECT bs.book_id id, s.name name FROM book_subjects bs
       JOIN subjects s ON s.id = bs.subject_id ORDER BY s.name`,
  )
  .all()) {
  if (!subject.has(r.id)) subject.set(r.id, r.name);
}
db.close();
for (const [id, m] of meta) m.subjects = subject.get(id) ?? null;

function estimate(book) {
  const raw =
    book.cover_width > 0 && book.cover_height > 0 ? book.cover_width / book.cover_height : 3 / 4;
  const ratio = Math.min(RATIO_MAX, Math.max(RATIO_MIN, raw));
  const hasSubject = Boolean(book.subjects);
  const titleLines = Math.min(2, Math.max(1, Math.ceil((book.title ?? '').length / 42)));
  return COLUMN_WIDTH / ratio + 68 + (hasSubject ? 24 : 0) + (titleLines - 1) * 18;
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['1', '2', '50'];
let worst = 0;

for (const target of targets) {
  const url = `${BASE}/katalog${target.startsWith('/') ? target : `?page=${target}`}`;
  const html = await (await fetch(url)).text();

  const desktop = html.split('md:grid-cols-4')[1] ?? '';
  const chunks = desktop.split('class="flex flex-col gap-4"').slice(1, 5);

  const columns = chunks.map((chunk) => {
    const ids = [...chunk.matchAll(/href="\/koleksi\/(\d+)"/g)].map((m) => Number(m[1]));
    const books = ids.map((id) => meta.get(id)).filter(Boolean);
    return {
      cards: books.length,
      height: Math.round(books.reduce((sum, b) => sum + estimate(b) + GAP, 0)),
    };
  });

  const heights = columns.map((c) => c.height);
  const spread = Math.max(...heights) - Math.min(...heights);
  worst = Math.max(worst, spread);
  const pct = Math.max(...heights) ? ((spread / Math.max(...heights)) * 100).toFixed(1) : '0.0';

  console.log(
    `${String(target).padStart(16)} | kartu: ${columns.map((c) => c.cards).join('/')} | ` +
      `tinggi: ${heights.join(' / ')} | selisih ${spread}px (${pct}%)`,
  );
}

console.log(`\nselisih terbesar: ${worst}px`);
