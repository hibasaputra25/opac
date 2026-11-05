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
  } catch {
    // Tracking tidak boleh mematahkan halaman detail.
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
  if (userRef) {
    // Sinyal 1: buku yang dilihat (terbaru dulu).
    const viewed = all<{ book_id: number }>(
      `SELECT DISTINCT book_id FROM book_views WHERE user_ref = ?
       ORDER BY viewed_at DESC, id DESC LIMIT ?`,
      [userRef, MAX_RECENT_VIEWS],
    ).map((r) => r.book_id);

    // Sinyal 2: favorit.
    let favoriteIds: number[] = [];
    if (userRef.startsWith('u:')) {
      favoriteIds = all<{ book_id: number }>(
        `SELECT w.book_id FROM wishlists w JOIN users u ON u.id = w.user_id
          WHERE u.id = ? ORDER BY w.id DESC LIMIT ?`,
        [Number(userRef.slice(2)), MAX_RECENT_VIEWS],
      ).map((r) => r.book_id);
    }

    // Sinyal 3: riwayat pinjam (via member_no di circulation_history).
    let loanedIds: number[] = [];
    if (userRef.startsWith('u:')) {
      const memberNo = one<{ member_no: string }>(
        'SELECT member_no FROM users WHERE id = ?',
        [Number(userRef.slice(2))],
      )?.member_no;
      if (memberNo) {
        // Judul dipinjam dicocokkan ke books lewat title (data riwayat lama
        // tidak menyimpan book_id).
        loanedIds = all<{ id: number }>(
          `SELECT DISTINCT b.id FROM books b
             JOIN circulation_history c ON c.title = b.title
            WHERE c.member_no = ? LIMIT ?`,
          [memberNo, MAX_RECENT_VIEWS],
        ).map((r) => r.id);
      }
    }

    const signalIds = [...new Set([...viewed, ...favoriteIds, ...loanedIds])];
    const excluded = new Set(signalIds);

    if (signalIds.length) {
      const placeholders = signalIds.map(() => '?').join(',');
      const rows = all<{ id: number; shared: number }>(
        `SELECT bs.book_id AS id, count(*) AS shared
           FROM book_subjects bs
           JOIN book_subjects bs2 ON bs2.subject_id = bs.subject_id
          WHERE bs2.book_id IN (${placeholders}) AND bs.book_id NOT IN (${placeholders})
          GROUP BY bs.book_id
          ORDER BY shared DESC, bs.book_id DESC
          LIMIT ?`,
        [...signalIds, ...signalIds, limit],
      ).map((r) => r.id);

      const filtered = rows.filter((id) => !excluded.has(id)).slice(0, limit);
      if (filtered.length) {
        return { books: hydrateBooks(filtered), personalized: true };
      }
    }
  }

  return { books: getNewBooks(limit), personalized: false };
}
