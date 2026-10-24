import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LoginGate } from '@/components/login-gate';
import { BookCard } from '@/components/ui/book-card';
import { all } from '@/lib/db';
import type { BookListItem } from '@/lib/queries';

export const metadata: Metadata = { title: 'Buku Favorit' };
export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <LoginGate next="/akun/favorit" title="Buku Favorit" description="Koleksi yang Anda simpan untuk dibaca nanti." />;
  }

  const books = all<BookListItem>(
    `SELECT b.id, b.title, b.call_number, b.isbn, b.year, b.edition, b.language, b.cover_url,
            p.name AS publisher, c.name AS category,
            (SELECT group_concat(a.name, ' ; ') FROM book_authors ba
              JOIN authors a ON a.id = ba.author_id WHERE ba.book_id = b.id) AS authors,
            (SELECT group_concat(s.name, ' ; ') FROM book_subjects bs
              JOIN subjects s ON s.id = bs.subject_id WHERE bs.book_id = b.id) AS subjects,
            (SELECT count(*) FROM items i WHERE i.book_id = b.id AND i.status = 'available') AS available_count,
            (SELECT count(*) FROM items i WHERE i.book_id = b.id) AS total_count
       FROM wishlists w
       JOIN books b ON b.id = w.book_id
       LEFT JOIN publishers p ON p.id = b.publisher_id
       LEFT JOIN categories c ON c.id = b.category_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC`,
    [user.id],
  );

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Buku Favorit</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Koleksi yang Anda simpan untuk dibaca nanti.
      </p>

      <div className="mt-4">
        <div>
          {books.length ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">Belum ada buku favorit tersimpan.</p>
              <Link
                href="/katalog"
                className="mt-3 inline-block rounded-xl bg-primary-500 px-4 py-2 text-sm text-white"
              >
                Jelajahi katalog
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
