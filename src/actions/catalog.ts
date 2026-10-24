'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { run } from '@/lib/db';
import { isFavorite } from '@/lib/wishlist';

export type ActionState = { ok: boolean; message: string } | null;

/**
 * OPAC ini bersifat baca-saja untuk koleksi.
 * Peminjaman/pengembalian dilakukan di sistem sirkulasi OLS
 * (https://ols.mercubuana.ac.id), bukan di sini.
 */
export async function toggleFavorite(bookId: number): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Silakan masuk terlebih dahulu.' };

  if (isFavorite(user.id, bookId)) {
    run('DELETE FROM wishlists WHERE user_id = ? AND book_id = ?', [user.id, bookId]);
  } else {
    run('INSERT OR IGNORE INTO wishlists (user_id, book_id) VALUES (?, ?)', [user.id, bookId]);
  }

  revalidatePath(`/koleksi/${bookId}`);
  revalidatePath('/akun/favorit');
  return { ok: true, message: 'Daftar favorit diperbarui.' };
}
