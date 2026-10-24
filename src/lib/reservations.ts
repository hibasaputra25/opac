import { all, getDb, one, run } from '@/lib/db';

export const MAX_ACTIVE = 3;
export const HOLD_DAYS = 2;

export type ReservationRow = {
  id: number;
  book_id: number;
  item_id: number;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  title: string;
  authors: string | null;
  barcode: string | null;
  cover_url: string | null;
  location: string | null;
};

/**
 * Melepas reservasi yang sudah melewati masa berlaku.
 *
 * Dijalankan "lazy" setiap kali data reservasi dibaca, sehingga status selalu
 * segar tanpa perlu scheduler terpisah. `items.status` dikembalikan ke
 * 'available' agar eksemplar bisa dipinjam pemustaka lain.
 */
export function expireReservations() {
  const db = getDb();
  const expired = all<{ id: number; item_id: number }>(
    `SELECT id, item_id FROM reservations
      WHERE status = 'active' AND expires_at <= datetime('now')`,
  );

  if (!expired.length) return 0;

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const row of expired) {
      run(`UPDATE reservations SET status = 'expired', closed_at = datetime('now') WHERE id = ?`, [
        row.id,
      ]);
      // Hanya lepas item bila tidak ada reservasi aktif lain untuk item ini.
      const stillHeld = one<{ n: number }>(
        `SELECT count(*) AS n FROM reservations
          WHERE item_id = ? AND status = 'active'`,
        [row.item_id],
      );
      if (!stillHeld?.n) {
        run(`UPDATE items SET status = 'available' WHERE id = ? AND status = 'booked'`, [
          row.item_id,
        ]);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return expired.length;
}

export function getReservations(userId: number) {
  expireReservations();

  return all<ReservationRow>(
    `SELECT r.id, r.book_id, r.item_id, r.status, r.created_at, r.expires_at, r.closed_at,
            b.title, b.cover_url,
            (SELECT group_concat(a.name, ' ; ')
               FROM book_authors ba JOIN authors a ON a.id = ba.author_id
              WHERE ba.book_id = b.id) AS authors,
            i.barcode, l.name AS location
       FROM reservations r
       JOIN books b ON b.id = r.book_id
       LEFT JOIN items i ON i.id = r.item_id
       LEFT JOIN locations l ON l.id = i.location_id
      WHERE r.user_id = ?
      ORDER BY CASE r.status WHEN 'active' THEN 0 ELSE 1 END, r.id DESC`,
    [userId],
  );
}

export function getActiveReservations(userId: number) {
  expireReservations();
  return all<ReservationRow>(
    `SELECT r.id, r.book_id, r.item_id, r.status, r.created_at, r.expires_at, r.closed_at,
            b.title, b.cover_url,
            (SELECT group_concat(a.name, ' ; ')
               FROM book_authors ba JOIN authors a ON a.id = ba.author_id
              WHERE ba.book_id = b.id) AS authors,
            i.barcode, l.name AS location
       FROM reservations r
       JOIN books b ON b.id = r.book_id
       LEFT JOIN items i ON i.id = r.item_id
       LEFT JOIN locations l ON l.id = i.location_id
      WHERE r.user_id = ? AND r.status = 'active'
      ORDER BY r.expires_at ASC`,
    [userId],
  );
}

export function countActiveReservations(userId: number) {
  expireReservations();
  return (
    one<{ n: number }>(
      `SELECT count(*) AS n FROM reservations WHERE user_id = ? AND status = 'active'`,
      [userId],
    )?.n ?? 0
  );
}

/** Apakah anggota sudah punya reservasi aktif untuk judul ini. */
export function hasActiveReservationForBook(userId: number, bookId: number) {
  expireReservations();
  return Boolean(
    one(
      `SELECT 1 AS ok FROM reservations
        WHERE user_id = ? AND book_id = ? AND status = 'active'`,
      [userId, bookId],
    ),
  );
}

/** Sisa hari menuju kedaluwarsa (0 = hari ini). */
export function daysLeft(expiresAt: string) {
  const diff = new Date(`${expiresAt.replace(' ', 'T')}Z`).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}
