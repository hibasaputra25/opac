'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getDb, one, run } from '@/lib/db';
import { CART_HOLD_DAYS, CART_MAX_ITEMS, expireCartItems } from '@/lib/cart';

export type CartState = { ok: boolean; message: string } | null;

/**
 * Menambahkan satu eksemplar ke keranjang anggota.
 *
 * Seluruh proses berjalan dalam satu transaksi `BEGIN IMMEDIATE` agar dua
 * anggota yang menekan tombol bersamaan tidak bisa mengambil eksemplar terakhir
 * yang sama.
 */
export async function addToCart(bookId: number): Promise<CartState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };
  if (user.role !== 'member') {
    return { ok: false, message: 'Keranjang hanya tersedia untuk akun anggota.' };
  }

  expireCartItems();

  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Batas isi keranjang
    const active =
      one<{ n: number }>(
        `SELECT count(*) AS n FROM reservations WHERE user_id = ? AND status = 'active'`,
        [user.id],
      )?.n ?? 0;

    if (active >= CART_MAX_ITEMS) {
      db.exec('ROLLBACK');
      return {
        ok: false,
        message: `Keranjang Anda sudah penuh (maksimal ${CART_MAX_ITEMS} buku).`,
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
      return { ok: false, message: 'Buku ini sudah ada di keranjang Anda.' };
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

    // 4. Tandai eksemplar & simpan di keranjang
    run(`UPDATE items SET status = 'booked' WHERE id = ? AND status = 'available'`, [item.id]);
    run(
      `INSERT INTO reservations (user_id, book_id, item_id, status, expires_at)
       VALUES (?, ?, ?, 'active', datetime('now', ?))`,
      [user.id, bookId, item.id, `+${CART_HOLD_DAYS} days`],
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
    return { ok: false, message: `Gagal menambahkan ke keranjang: ${message}` };
  }

  revalidatePath(`/koleksi/${bookId}`);
  revalidatePath('/akun/keranjang');
  revalidatePath('/katalog');

  return {
    ok: true,
    message: `Ditambahkan ke keranjang. Ambil buku dalam ${CART_HOLD_DAYS} hari di meja layanan.`,
  };
}

/** Mengeluarkan satu buku dari keranjang milik sendiri. */
export async function removeFromCart(cartItemId: number): Promise<CartState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };

  const row = one<{ id: number; item_id: number; book_id: number; status: string }>(
    `SELECT id, item_id, book_id, status FROM reservations
      WHERE id = ? AND user_id = ?`,
    [cartItemId, user.id],
  );

  if (!row) return { ok: false, message: 'Buku tidak ditemukan di keranjang.' };
  if (row.status !== 'active') {
    return { ok: false, message: 'Buku ini sudah tidak ada di keranjang.' };
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
    return { ok: false, message: `Gagal mengeluarkan dari keranjang: ${message}` };
  }

  revalidatePath('/akun/keranjang');
  revalidatePath(`/koleksi/${row.book_id}`);
  revalidatePath('/katalog');

  return { ok: true, message: 'Buku dikeluarkan dari keranjang.' };
}
