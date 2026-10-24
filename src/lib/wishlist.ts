import { one } from '@/lib/db';

export function isFavorite(userId: number, bookId: number) {
  return Boolean(
    one('SELECT 1 AS ok FROM wishlists WHERE user_id = ? AND book_id = ?', [userId, bookId]),
  );
}

export function countFavorites(userId: number) {
  return one<{ n: number }>('SELECT count(*) AS n FROM wishlists WHERE user_id = ?', [userId])?.n ?? 0;
}
