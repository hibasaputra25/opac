'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getDb, one, run } from '@/lib/db';
import { HOLD_DAYS, MAX_ACTIVE, expireReservations } from '@/lib/reservations';

export type ReserveState = { ok: boolean; message: string } | null;

/**
 * Membuat reservasi untuk satu eksemplar.
 *
 * Seluruh proses berjalan dalam satu transaksi `BEGIN IMMEDIATE` agar dua
 * anggota yang menekan tombol bersamaan tidak bisa memesan eksemplar terakhir
 * yang sama.
 */
export async function reserveBook(bookId: number): Promise<ReserveState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };
  if (user.role !== 'member') {
    return { ok: false, message: 'Reservasi hanya tersedia untuk akun anggota.' };
  }

  expireReservations();

  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Batas reservasi aktif
    const active =
      one<{ n: number }>(
        `SELECT count(*) AS n FROM reservations WHERE user_id = ? AND status = 'active'`,
        [user.id],
      )?.n ?? 0;

    if (active >= MAX_ACTIVE) {
      db.exec('ROLLBACK');
      return {
        ok: false,
        message: `Reservasi aktif Anda sudah mencapai batas ${MAX_ACTIVE} buku.`,
      };
    }

    // 2. Tidak boleh menduplikasi judul yang sama
    const duplicate = one(
      `SELECT 1 AS ok FROM reservations
        WHERE user_id = ? AND book_id = ? AND status = 'active'`,
      [user.id, bookId],
    );
    if (duplicate) {
      db.exec('ROLLBACK');
      return { ok: false, message: 'Anda sudah mereservasi judul ini.' };
    }

    // 3. Ambil eksemplar yang benar-benar masih tersedia (atomik di dalam transaksi)
    const item = one<{ id: number }>(
      `SELECT id FROM items
        WHERE book_id = ? AND status = 'available'
        ORDER BY id ASC LIMIT 1`,
      [bookId],
    );

    if (!item) {
      db.exec('ROLLBACK');
      return { ok: false, message: 'Tidak ada eksemplar yang tersedia saat ini.' };
    }

    // 4. Tandai eksemplar & buat reservasi
    run(`UPDATE items SET status = 'booked' WHERE id = ? AND status = 'available'`, [item.id]);
    run(
      `INSERT INTO reservations (user_id, book_id, item_id, status, expires_at)
       VALUES (?, ?, ?, 'active', datetime('now', ?))`,
      [user.id, bookId, item.id, `+${HOLD_DAYS} days`],
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
    return { ok: false, message: `Gagal membuat reservasi: ${message}` };
  }

  revalidatePath(`/koleksi/${bookId}`);
  revalidatePath('/akun/reservasi');
  revalidatePath('/katalog');

  return {
    ok: true,
    message: `Reservasi berhasil. Ambil buku dalam ${HOLD_DAYS} hari di meja layanan.`,
  };
}

/** Membatalkan reservasi milik sendiri. */
export async function cancelReservation(reservationId: number): Promise<ReserveState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };

  const row = one<{ id: number; item_id: number; book_id: number; status: string }>(
    `SELECT id, item_id, book_id, status FROM reservations
      WHERE id = ? AND user_id = ?`,
    [reservationId, user.id],
  );

  if (!row) return { ok: false, message: 'Reservasi tidak ditemukan.' };
  if (row.status !== 'active') {
    return { ok: false, message: 'Reservasi ini sudah tidak aktif.' };
  }

  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    run(`UPDATE reservations SET status = 'cancelled', closed_at = datetime('now') WHERE id = ?`, [
      row.id,
    ]);
    run(`UPDATE items SET status = 'available' WHERE id = ? AND status = 'booked'`, [row.item_id]);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
    return { ok: false, message: `Gagal membatalkan: ${message}` };
  }

  revalidatePath('/akun/reservasi');
  revalidatePath(`/koleksi/${row.book_id}`);
  revalidatePath('/katalog');

  return { ok: true, message: 'Reservasi dibatalkan.' };
}
