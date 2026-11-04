import { all, one, getDb } from '@/lib/db';
import { parseMulti } from '@/lib/search-params';

export type BookListItem = {
  id: number;
  title: string;
  call_number: string | null;
  isbn: string | null;
  year: number | null;
  edition: string | null;
  language: string | null;
  cover_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  publisher: string | null;
  category: string | null;
  authors: string | null;
  subjects: string | null;
  available_count: number;
  total_count: number;
};

export type SearchParams = {
  q?: string;
  /** Mode pencarian kata kunci: 'and' (ketat) atau 'or' (longgar/fallback). */
  qMode?: 'and' | 'or';
  subject?: string;
  category?: string;
  language?: string;
  location?: string;
  type?: string;
  yearFrom?: number;
  yearTo?: number;
  available?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
};

/**
 * Mengambil detail lengkap untuk sekumpulan id buku.
 * Dipisah dari query pencarian agar subquery hanya dieksekusi untuk
 * baris yang benar-benar ditampilkan (bukan seluruh 36 ribu judul).
 */
function hydrateBooks(ids: number[]): BookListItem[] {
  if (!ids.length) return [];

  const placeholders = ids.map(() => '?').join(',');
  const rows = all<BookListItem>(
    `SELECT b.id, b.title, b.call_number, b.isbn, b.year, b.edition, b.language,
            b.cover_url, b.cover_width, b.cover_height,
            p.name AS publisher,
            c.name AS category,
            (SELECT group_concat(a.name, ' ; ')
               FROM book_authors ba JOIN authors a ON a.id = ba.author_id
              WHERE ba.book_id = b.id) AS authors,
            (SELECT group_concat(s.name, ' ; ')
               FROM book_subjects bs JOIN subjects s ON s.id = bs.subject_id
              WHERE bs.book_id = b.id) AS subjects,
            (SELECT count(*) FROM items i
              WHERE i.book_id = b.id AND i.status = 'available') AS available_count,
            (SELECT count(*) FROM items i WHERE i.book_id = b.id) AS total_count
       FROM books b
       LEFT JOIN publishers p ON p.id = b.publisher_id
       LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.id IN (${placeholders})`,
    ids,
  );

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export function ftsQuery(q: string): string | null {
  const tokens = q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 8);
  if (!tokens.length) return null;
  return tokens.map((t) => `"${t}"*`).join(' AND ');
}

/** Versi OR dari ftsQuery — untuk fallback hasil longgar. */
export function ftsQueryOr(q: string): string | null {
  const tokens = q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 8);
  if (!tokens.length) return null;
  return tokens.map((t) => `"${t}"*`).join(' OR ');
}

/**
 * Bobot relevansi bm25 per kolom FTS: judul 5x, pengarang 3x, subjek 2x,
 * sisanya 1x. Angka negatif (skor bm25 lebih kecil = lebih relevan).
 */
const BM25_WEIGHTS = 'bm25(books_fts, 5.0, 3.0, 2.0, 1.0, 1.0, 1.0)';

function buildWhere(params: SearchParams, exclude?: keyof SearchParams) {
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (params.q) {
    const match = params.qMode === 'or' ? ftsQueryOr(params.q) : ftsQuery(params.q);
    if (match) {
      clauses.push('b.id IN (SELECT rowid FROM books_fts WHERE books_fts MATCH ?)');
      args.push(match);
    } else {
      clauses.push('(b.title LIKE ? OR b.isbn LIKE ?)');
      args.push(`%${params.q}%`, `%${params.q}%`);
    }
  }

  if (params.subject && exclude !== 'subject') {
    const slugs = parseMulti(params.subject);
    if (slugs.length) {
      clauses.push(`b.id IN (
        SELECT bs.book_id FROM book_subjects bs
        JOIN subjects s ON s.id = bs.subject_id WHERE s.slug IN (${slugs.map(() => '?').join(',')}))`);
      args.push(...slugs);
    }
  }

  if (params.category && exclude !== 'category') {
    const slugs = parseMulti(params.category);
    if (slugs.length) {
      clauses.push(`c.slug IN (${slugs.map(() => '?').join(',')})`);
      args.push(...slugs);
    }
  }

  if (params.language && exclude !== 'language') {
    const langs = parseMulti(params.language);
    if (langs.length) {
      clauses.push(`b.language IN (${langs.map(() => '?').join(',')})`);
      args.push(...langs);
    }
  }

  if (params.type && exclude !== 'type') {
    clauses.push('b.collection_type = ?');
    args.push(params.type);
  }

  if (params.location && exclude !== 'location') {
    const codes = parseMulti(params.location);
    if (codes.length) {
      clauses.push(`b.id IN (
        SELECT i.book_id FROM items i
        JOIN locations l ON l.id = i.location_id WHERE l.code IN (${codes.map(() => '?').join(',')}))`);
      args.push(...codes);
    }
  }

  if (params.available && exclude !== 'available') {
    clauses.push(`EXISTS (SELECT 1 FROM items i WHERE i.book_id = b.id AND i.status = 'available')`);
  }

  if (params.yearFrom) {
    // Clamp ke rentang wajar; data sumber punya beberapa nilai salah parse
    // (mis. "19", "2204") yang sebaiknya tidak memengaruhi filter.
    const from = Math.max(1900, Math.min(2100, params.yearFrom));
    clauses.push('b.year >= ?');
    args.push(from);
  }
  if (params.yearTo) {
    const to = Math.max(1900, Math.min(2100, params.yearTo));
    clauses.push('b.year <= ?');
    args.push(to);
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args };
}

/**
 * Koleksi yang punya sampul asli diutamakan agar daftar terlihat lebih hidup.
 * Urutan ini hanya berlaku untuk daftar penelusuran (bukan hasil pencarian
 * kata kunci, yang tetap mengikuti relevansi).
 */
const HAS_COVER = "(b.cover_url IS NOT NULL AND b.cover_url != '') DESC";

function orderBy(params: SearchParams) {
  switch (params.sort) {
    case 'title':
      return `ORDER BY ${HAS_COVER}, b.title COLLATE NOCASE ASC`;
    case 'year_desc':
      return `ORDER BY ${HAS_COVER}, b.year DESC NULLS LAST, b.title ASC`;
    case 'year_asc':
      return `ORDER BY ${HAS_COVER}, b.year ASC NULLS LAST, b.title ASC`;
    case 'newest':
      return `ORDER BY ${HAS_COVER}, b.id DESC`;
    default:
      if (params.q && ftsQuery(params.q)) {
        // Pencarian kata kunci: relevansi dihitung SEKALI di derived table FTS
        // (bukan subquery per baris — bm25 di 8 ribu baris butuh ~10 detik,
        // lewat derived table hanya ~30 ms). Hasilnya digabung balik ke books.
        const match = (params.qMode === 'or' ? ftsQueryOr(params.q) : ftsQuery(params.q)) ?? '';
        const literal = match.replace(/'/g, "''");
        return `ORDER BY (SELECT score FROM (
            SELECT rowid AS fts_rowid, ${BM25_WEIGHTS} AS score
              FROM books_fts WHERE books_fts MATCH '${literal}'
          ) WHERE fts_rowid = b.id) ASC, ${HAS_COVER}, b.title ASC`;
      }
      return `ORDER BY ${HAS_COVER}, b.id DESC`;
  }
}

/**
 * Skor relevansi sekali di CTE (materialized), lalu JOIN — bukan subquery per
 * baris. bm25 per baris di 8 ribu hasil butuh ~12 detik; lewat CTE ~36 ms.
 * Mengembalikan null bila pencarian bukan mode kata kunci.
 */
function relevanceCte(params: SearchParams): { cte: string; order: string } | null {
  if (!params.q) return null;
  const match = (params.qMode === 'or' ? ftsQueryOr(params.q) : ftsQuery(params.q)) ?? null;
  if (!match) return null;
  const literal = match.replace(/'/g, "''");
  return {
    cte: `WITH scored AS MATERIALIZED (
  SELECT rowid AS fts_rowid, ${BM25_WEIGHTS} AS score
    FROM books_fts WHERE books_fts MATCH '${literal}'
)`,
    order: `ORDER BY rel.score ASC, ${HAS_COVER}, b.title ASC`,
  };
}

/**
 * Cari koreksi untuk kata yang tidak ditemukan di indeks.
 *
 * Kandidat diambil dari judul memakai awalan pendek token (4 huruf). Awalan
 * sengaja pendek karena kata yang salah ketik justru bisa menemukan dirinya
 * sendiri bila LIKE memakai token penuh — dan kandidat salah itu bisa
 * menghabiskan jendela LIMIT sebelum kata yang benar ditemukan.
 */
function bestTypoFix(token: string): string | null {
  if (token.length < 5) return null;
  const prefix = token.slice(0, 4);
  const candidates = all<{ word: string }>(
    `SELECT lower(title) AS word FROM books WHERE title LIKE ? LIMIT 1200`,
    [`%${prefix}%`],
  ).flatMap((row) => row.word.split(/\s+/));

  const unique = [...new Set(candidates)].filter(
    (w) =>
      w !== token.toLowerCase() &&
      w.length >= 4 &&
      w.length <= token.length + 2 &&
      /^[a-z]+$/.test(w),
  );
  if (!unique.length) return null;

  const distance = (a: string, b: string) => {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]);
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
    }
    return dp[m][n];
  };

  let best: { word: string; dist: number } | null = null;
  for (const word of unique) {
    const dist = distance(token.toLowerCase(), word);
    const allowed = token.length >= 7 ? 2 : 1;
    if (dist <= allowed && (!best || dist < best.dist)) {
      best = { word, dist };
    }
  }
  return best?.word ?? null;
}

/** Token kata kunci — dipakai oleh koreksi typo di searchBooks. */
function tokenize(q: string): string[] {
  return q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 8);
}

export type SearchResult = {
  rows: BookListItem[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  /** Mode yang benar-benar dipakai setelah fallback: 'and' | 'or' | 'typo'. */
  mode: 'and' | 'or' | 'typo';
  /** Kata kunci yang dikoreksi saat mode 'typo'. */
  corrected?: string;
};

/**
 * Pencarian koleksi dengan fallback bertingkat:
 *
 * 1. AND ketat (semua kata harus muncul) + urutan relevansi berbobot.
 * 2. Bila hasil < 3: OR longgar (salah satu kata), diurutkan dengan bobot.
 * 3. Bila OR juga gagal: perbaiki satu kata yang dicurigai typo dan ulangi AND.
 */
export function searchBooks(params: SearchParams): SearchResult {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(60, Math.max(6, params.perPage ?? 20));
  const offset = (page - 1) * perPage;

  const attempt = (attemptParams: SearchParams) => {
    const where = buildWhere(attemptParams);
    const rel = relevanceCte(attemptParams);
    const cte = rel?.cte ?? '';
    const total =
      one<{ n: number }>(
        `${cte} SELECT count(*) AS n FROM ${rel ? 'scored rel JOIN books b ON b.id = rel.fts_rowid' : 'books b'}
         LEFT JOIN categories c ON c.id = b.category_id ${where.sql}`,
        where.args,
      )?.n ?? 0;
    return { where, total, cte, rel };
  };

  let q = params.q?.trim() || undefined;
  let mode: SearchResult['mode'] = 'and';
  let corrected: string | undefined;

  // Tingkat 1: AND ketat.
  let attempt1 = attempt({ ...params, q, qMode: 'and' });
  let total = attempt1.total;

  // Tingkat 2: OR longgar bila hasil terlalu sedikit.
  if (q && total < 3) {
    const or = attempt({ ...params, q, qMode: 'or' });
    if (or.total > total) {
      attempt1 = or;
      total = or.total;
      mode = 'or';
    }
  }

  // Tingkat 3: koreksi typo. Dijalankan bila hasil AND jauh lebih sedikit
  // dari yang seharusnya (ambang 20) — "manajamen" (11) korek ke "manajemen"
  // (8.403). Koreksi dipakai hanya bila hasilnya lebih banyak.
  if (q && total < 20) {
    for (const token of tokenize(q)) {
      const fix = bestTypoFix(token);
      if (fix && fix.toLowerCase() !== token.toLowerCase()) {
        const fixed = q.replace(new RegExp(token, 'i'), fix);
        const retry = attempt({ ...params, q: fixed, qMode: 'and' });
        if (retry.total > total) {
          q = fixed;
          corrected = fix;
          attempt1 = retry;
          total = retry.total;
          mode = 'typo';
          break;
        }
      }
    }
  }

  const { where, cte, rel } = attempt1;
  const from = rel ? 'scored rel JOIN books b ON b.id = rel.fts_rowid' : 'books b';
  const ids = all<{ id: number }>(
    `${cte} SELECT b.id FROM ${from}
     LEFT JOIN categories c ON c.id = b.category_id
     ${where.sql} ${rel ? rel.order : orderBy({ ...params, q })} LIMIT ? OFFSET ?`,
    [...where.args, perPage, offset],
  ).map((row) => row.id);

  return {
    rows: hydrateBooks(ids),
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
    mode,
    corrected,
  };
}export type Facet = { label: string; value: string; count: number };

export function getFacets(params: SearchParams) {
  const subjectsWhere = buildWhere(params, 'subject');
  const subjects = all<Facet>(
    `SELECT s.name AS label, s.slug AS value, count(*) AS count
       FROM subjects s
       JOIN book_subjects bs ON bs.subject_id = s.id
       JOIN books b ON b.id = bs.book_id
       LEFT JOIN categories c ON c.id = b.category_id
       ${subjectsWhere.sql}
      GROUP BY s.id ORDER BY count DESC, s.name ASC LIMIT 24`,
    subjectsWhere.args,
  );

  const categoriesWhere = buildWhere(params, 'category');
  const categories = all<Facet>(
    `SELECT c.name AS label, c.slug AS value, count(*) AS count
       FROM categories c JOIN books b ON b.category_id = c.id
       ${categoriesWhere.sql}
      GROUP BY c.id ORDER BY count DESC, c.name ASC LIMIT 16`,
    categoriesWhere.args,
  );

  const languagesWhere = buildWhere(params, 'language');
  const languages = all<Facet>(
    `SELECT b.language AS label, b.language AS value, count(*) AS count
       FROM books b LEFT JOIN categories c ON c.id = b.category_id
       ${languagesWhere.sql} ${languagesWhere.sql ? 'AND' : 'WHERE'} b.language IS NOT NULL
      GROUP BY b.language ORDER BY count DESC LIMIT 8`,
    languagesWhere.args,
  );

  const locationsWhere = buildWhere(params, 'location');
  const locations = all<Facet>(
    `SELECT l.name AS label, l.code AS value, count(*) AS count
       FROM locations l
       JOIN (
         SELECT i.location_id, i.book_id
           FROM items i
          WHERE i.status IS NOT NULL
          GROUP BY i.location_id, i.book_id
       ) li ON li.location_id = l.id
       JOIN books b ON b.id = li.book_id
       LEFT JOIN categories c ON c.id = b.category_id
       ${locationsWhere.sql}
      GROUP BY l.id ORDER BY l.name ASC`,
    locationsWhere.args,
  );

  // Baris dari node:sqlite punya null-prototype dan tidak boleh diteruskan
  // langsung ke Client Component — salin ke objek biasa.
  const plain = (rows: Facet[]) => rows.map((row) => ({ ...row }));

  return {
    subjects: plain(subjects),
    categories: plain(categories),
    languages: plain(languages),
    locations: plain(locations),
  };
}

export function getBook(id: number) {
  const [book] = hydrateBooks([id]);
  if (!book) return undefined;
  const extra = one<{ description: string | null; origin: string | null }>(
    'SELECT description, origin FROM books WHERE id = ?',
    [id],
  );
  return { ...book, description: extra?.description ?? null, origin: extra?.origin ?? null };
}

export type ItemRow = {
  id: number;
  barcode: string | null;
  register_no: string | null;
  status: string;
  acquisition: string | null;
  call_number: string | null;
  location_name: string | null;
  location_code: string | null;
};

export function getBookItems(bookId: number) {
  return all<ItemRow>(
    `SELECT i.id, i.barcode, i.register_no, i.status, i.acquisition, i.call_number,
            l.name AS location_name, l.code AS location_code
       FROM items i LEFT JOIN locations l ON l.id = i.location_id
      WHERE i.book_id = ?
      ORDER BY l.name ASC, i.barcode ASC`,
    [bookId],
  );
}

export function getRelatedBooks(bookId: number, limit = 6) {
  const ids = all<{ id: number }>(
    `SELECT b.id FROM books b
      WHERE b.id != ? AND b.id IN (
        SELECT bs2.book_id FROM book_subjects bs1
        JOIN book_subjects bs2 ON bs2.subject_id = bs1.subject_id
        WHERE bs1.book_id = ?)
      ORDER BY (SELECT count(*) FROM book_subjects bs WHERE bs.book_id = b.id) DESC
      LIMIT ?`,
    [bookId, bookId, limit],
  ).map((row) => row.id);
  return hydrateBooks(ids);
}

export function getNewBooks(limit = 12, subject?: string) {
  const ids = subject
    ? all<{ id: number }>(
        `SELECT b.id FROM books b
          WHERE b.id IN (SELECT bs.book_id FROM book_subjects bs
                         JOIN subjects s ON s.id = bs.subject_id WHERE s.slug = ?)
          ORDER BY b.id DESC LIMIT ?`,
        [subject, limit],
      ).map((row) => row.id)
    : all<{ id: number }>('SELECT id FROM books ORDER BY id DESC LIMIT ?', [limit]).map(
        (row) => row.id,
      );
  return hydrateBooks(ids);
}

export function getStats() {
  const row = one<{
    books: number;
    items: number;
    available: number;
    members: number;
    subjects: number;
  }>(`
    SELECT (SELECT count(*) FROM books) AS books,
           (SELECT count(*) FROM items) AS items,
           (SELECT count(*) FROM items WHERE status = 'available') AS available,
           (SELECT count(*) FROM users WHERE role = 'member') AS members,
           (SELECT count(*) FROM subjects) AS subjects
  `);
  return row ?? { books: 0, items: 0, available: 0, members: 0, subjects: 0 };
}

export function getTopSubjects(limit = 8) {
  return all<{ label: string; value: string; count: number }>(
    `SELECT s.name AS label, s.slug AS value, count(*) AS count
       FROM subjects s JOIN book_subjects bs ON bs.subject_id = s.id
      GROUP BY s.id ORDER BY count DESC LIMIT ?`,
    [limit],
  );
}

export function getLocations() {
  return all<{
    id: number;
    code: string;
    name: string;
    campus: string | null;
    address: string | null;
    book_count: number;
  }>(`
    SELECT l.id, l.code, l.name, l.campus, l.address,
           (SELECT count(DISTINCT i.book_id) FROM items i WHERE i.location_id = l.id) AS book_count
      FROM locations l WHERE l.is_active = 1 ORDER BY l.id
  `);
}

export function getUpcomingEvents(limit = 3) {
  return all<{
    id: number;
    title: string;
    slug: string;
    description: string | null;
    location: string | null;
    starts_at: string;
    category: string | null;
  }>(
    `SELECT id, title, slug, description, location, starts_at, category
       FROM events WHERE is_published = 1
      ORDER BY starts_at ASC LIMIT ?`,
    [limit],
  );
}

export function getRecentRequests(limit = 5) {
  return all<{
    id: number;
    title: string;
    author: string | null;
    status: string;
    created_at: string;
  }>(
    `SELECT id, title, author, status, created_at FROM book_requests
      ORDER BY id DESC LIMIT ?`,
    [limit],
  );
}

export function getDistinctLanguages() {
  return all<{ language: string }>(
    `SELECT DISTINCT language FROM books WHERE language IS NOT NULL ORDER BY language`,
  );
}

export function getDbForAdmin() {
  return getDb();
}
