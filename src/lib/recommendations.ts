import { cookies } from 'next/headers';
import { all, one, run, getDb } from '@/lib/db';
import { hydrateBooks, getNewBooks, type BookListItem } from '@/lib/queries';

const COOKIE_NAME = 'opac_id';
const MAX_RECENT_VIEWS = 10;

/**
 * Identitas aktivitas pengunjung: user id untuk anggota, cookie UUID untuk
 * anonim. Cookie di-set oleh middleware (src/middleware.ts) — di sini cukup
 * membaca. Bila tidak ada keduanya (mis. request tanpa middleware), kembalikan
 * null dan tracking dilewati.
 */
export async function getUserRef(): Promise<string | null> {
  const user = await getCurrentUserRef();
  if (user) return user;

  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/** User id bila login, tanpa menulis cookie. */
async function getCurrentUserRef(): Promise<string | null> {
  try {
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    return user ? `u:${user.id}` : null;
  } catch {
    return null;
  }
}

/** Ref dari cookie bila ada (untuk dibaca saat render, tanpa menulis). */
async function readAnonRef(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export function readUserRef(): Promise<string | null> {
  return (async () => {
    const user = await getCurrentUserRef();
    if (user) return user;
    return readAnonRef();
  })();
}

/** Catat kunjungan detail buku. Dipanggil dari halaman detail. */
export async function trackBookView(bookId: number) {
  try {
    const ref = await getUserRef();
    if (!ref) return;
    run('INSERT INTO book_views (book_id, user_ref) VALUES (?, ?)', [bookId, ref]);
    // Jaga tabel tetap ramping: maksimal 50 baris terakhir per ref.
    getDb()
      .prepare(
        `DELETE FROM book_views WHERE user_ref = ? AND id NOT IN (
           SELECT id FROM book_views WHERE user_ref = ? ORDER BY viewed_at DESC, id DESC LIMIT 50)`,
      )
      .run(ref, ref);
    // Riwayat berubah → rekomendasi yang tersimpan untuk pengunjung ini sudah
    // usang. Tanpa ini beranda masih menampilkan hasil lama sampai TTL habis.
    invalidateRecommendations(ref);
  } catch {
    // Tracking tidak boleh mematahkan halaman detail.
  }
}

/** Buang cache rekomendasi milik satu pengunjung (semua limit). */
function invalidateRecommendations(ref: string) {
  for (const key of recommendationCache.keys()) {
    if (key.startsWith(`${ref}:`)) recommendationCache.delete(key);
  }
}

/** Catat kata kunci pencarian. */
export async function trackSearch(keyword: string, resultCount: number) {
  try {
    const ref = await getUserRef();
    if (!ref || !keyword.trim()) return;
    run('INSERT INTO search_logs (user_ref, keyword, result_cnt) VALUES (?, ?, ?)', [
      ref,
      keyword.slice(0, 200),
      resultCount,
    ]);
    invalidateRecommendations(ref);
  } catch {
    // idem
  }
}

type Recommendation = {
  books: BookListItem[];
  personalized: boolean;
};

/**
 * Rekomendasi personal berbasis riwayat: subjek dari buku yang terakhir
 * dilihat (maks 10), difavoritkan, dan dipinjam; lalu cari buku lain yang
 * berbagi subjek terbanyak. Tanpa riwayat → fallback koleksi terbaru.
 */
export function getRecommendations(userRef: string | null, limit = 8): Recommendation {
  // Hasil per pengunjung di-cache singkat: menghindari agregat subjek (~72 ms)
  // pada setiap refresh, tetapi tetap diperbarui setelah pengguna menjelajah.
  const cacheKey = `${userRef ?? 'anon'}:${limit}`;
  const hit = recommendationCache.get(cacheKey);
  if (hit && Date.now() - hit.at < RECOMMENDATION_TTL_MS) return hit.value;

  const value = computeRecommendations(userRef, limit);
  if (recommendationCache.size >= 200) {
    const oldest = recommendationCache.keys().next().value;
    if (oldest !== undefined) recommendationCache.delete(oldest);
  }
  recommendationCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

const RECOMMENDATION_TTL_MS = 60_000;
const recommendationCache = new Map<string, { at: number; value: Recommendation }>();

function computeRecommendations(userRef: string | null, limit: number): Recommendation {
  if (userRef) {
    // Bobot sinyal: minat terbaru harus mendominasi. Buku yang baru dilihat
    // diberi bobot tertinggi dan menurun untuk yang lebih lama, sehingga
    // beranda bergeser mengikuti subjek yang terakhir dicari/dibuka.
    const weights = new Map<number, number>();
    const add = (id: number, weight: number) => {
      weights.set(id, Math.max(weights.get(id) ?? 0, weight));
    };

    // Sinyal 1: buku yang dilihat (terbaru dulu) — bobot 1.0 turun 0.07/posisi.
    const viewed = all<{ book_id: number }>(
      `SELECT DISTINCT book_id FROM book_views WHERE user_ref = ?
       ORDER BY viewed_at DESC, id DESC LIMIT ?`,
      [userRef, MAX_RECENT_VIEWS],
    ).map((r) => r.book_id);
    viewed.forEach((id, index) => add(id, Math.max(0.3, 1 - index * 0.07)));

    // Sinyal 2: favorit — indikasi minat yang kuat.
    if (userRef.startsWith('u:')) {
      all<{ book_id: number }>(
        `SELECT w.book_id FROM wishlists w JOIN users u ON u.id = w.user_id
          WHERE u.id = ? ORDER BY w.id DESC LIMIT ?`,
        [Number(userRef.slice(2)), MAX_RECENT_VIEWS],
      ).forEach((r) => add(r.book_id, 0.8));
    }

    // Sinyal 3: riwayat pinjam (dicocokkan lewat judul — data lama tanpa id).
    if (userRef.startsWith('u:')) {
      const memberNo = one<{ member_no: string }>(
        'SELECT member_no FROM users WHERE id = ?',
        [Number(userRef.slice(2))],
      )?.member_no;
      if (memberNo) {
        all<{ id: number }>(
          `SELECT DISTINCT b.id FROM books b
             JOIN circulation_history c ON c.title = b.title
            WHERE c.member_no = ? LIMIT ?`,
          [memberNo, MAX_RECENT_VIEWS],
        ).forEach((r) => add(r.id, 0.7));
      }
    }

    // Sinyal 4: kata kunci pencarian terakhir — subjek yang namanya memuat
    // kata tersebut dianggap minat baru, bobot kecil (pencarian belum tentu
    // berarti minat).
    const searches = all<{ keyword: string }>(
      `SELECT keyword FROM search_logs WHERE user_ref = ? ORDER BY id DESC LIMIT 3`,
      [userRef],
    );
    for (const { keyword } of searches) {
      const clean = keyword.trim();
      if (clean.length < 3) continue;
      all<{ id: number }>(
        `SELECT bs.book_id AS id
           FROM book_subjects bs
           JOIN subjects s ON s.id = bs.subject_id
          WHERE s.name LIKE ? OR s.slug LIKE ?
          LIMIT 40`,
        [`%${clean}%`, `%${clean.toLowerCase().replace(/\s+/g, '-')}%`],
      ).forEach((r) => add(r.id, 0.45));
    }

    if (weights.size) {
      const entries = [...weights.entries()];
      const valuesSql = entries.map(() => '(?, ?)').join(',');
      const valuesArgs = entries.flatMap(([id, w]) => [id, w]);
      const idsSql = entries.map(() => '?').join(',');

      // Skor kandidat = jumlah bobot buku sinyal yang berbagi subjek.
      const rows = all<{ id: number; score: number }>(
        `WITH signals(book_id, weight) AS (VALUES ${valuesSql})
         SELECT bs.book_id AS id, sum(sig.weight) AS score
           FROM signals sig
           JOIN book_subjects bs2 ON bs2.book_id = sig.book_id
           JOIN book_subjects bs ON bs.subject_id = bs2.subject_id
          WHERE bs.book_id NOT IN (${idsSql})
          GROUP BY bs.book_id
          ORDER BY score DESC, bs.book_id DESC
          LIMIT ?`,
        [...valuesArgs, ...entries.map(([id]) => id), limit],
      ).map((r) => r.id);

      if (rows.length) {
        return { books: hydrateBooks(rows), personalized: true };
      }
    }
  }

  return { books: getNewBooks(limit), personalized: false };
}
