import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookCard } from '@/components/ui/book-card';
import { getBook, getBookItems, getRelatedBooks } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { isFavorite } from '@/lib/wishlist';
import { ITEM_STATUS, statusToneClass } from '@/lib/format';
import { FavoriteButton } from './favorite-button';
import { ShareButton } from './share-button';
import { CartButton } from './cart-button';
import { isBookInCart } from '@/lib/cart';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const book = getBook(Number(id));
  if (!book) return { title: 'Koleksi tidak ditemukan' };
  return {
    title: book.title,
    description: book.description?.slice(0, 160) ?? `Koleksi ${book.title} di Perpustakaan UMB.`,
  };
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isFinite(bookId)) notFound();

  const book = getBook(bookId);
  if (!book) notFound();

  const items = getBookItems(bookId);
  const related = getRelatedBooks(bookId, 4);
  const user = await getCurrentUser();
  const favorite = user ? isFavorite(user.id, bookId) : false;
  const inCart = user ? isBookInCart(user.id, bookId) : false;

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.location_name ?? 'Lokasi tidak diketahui';
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});

  const availableCount = items.filter((i) => i.status === 'available').length;
  const authors = book.authors?.split(' ; ').filter(Boolean) ?? [];
  const subjects = book.subjects?.split(' ; ').filter(Boolean) ?? [];
  const authorLine = authors.length
    ? `${authors.join(' ; ')} (Pengarang)`
    : 'Pengarang tidak tercatat';

  const meta = [
    { label: 'Edisi', value: book.edition },
    { label: 'Call Number', value: book.call_number },
    { label: 'Penerbit', value: book.publisher },
    { label: 'Tahun Terbit', value: book.year?.toString() },
    { label: 'ISBN', value: book.isbn },
    { label: 'Bahasa', value: book.language },
    { label: 'Bidang', value: book.category },
    { label: 'Jumlah Eksemplar', value: items.length ? `${items.length} eksemplar` : null },
  ].filter((row) => row.value);

  return (
    <section className="relative mb-16">
      {/* Bar aksi mengambang: bagikan & favorit di kiri, keranjang di kanan */}
      <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto w-full px-3 pb-3 lg:left-1/6 lg:right-1/6 lg:w-auto lg:px-0">
        <div className="rounded-xl border border-gray-200 bg-white/95 p-2 shadow-[0_-4px_24px_-12px_rgba(18,18,18,0.25)] backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            {/* Kiri: aksi sekunder */}
            <div className="flex shrink-0 items-center gap-1">
              <ShareButton title={book.title} />
              {user ? (
                <FavoriteButton bookId={book.id} initial={favorite} />
              ) : (
                <Link
                  href={`/akun/profil?next=/koleksi/${book.id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7 3.1c0 4.9-7 9.3-7 9.3Z" />
                  </svg>
                  <span className="hidden sm:inline">Favorit</span>
                </Link>
              )}
            </div>

            {/* Kanan: aksi utama */}
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <CartButton
                bookId={book.id}
                availableCount={availableCount}
                isLoggedIn={Boolean(user)}
                inCart={inCart}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen pb-20">
        {/* Judul */}
        <div className="mb-4 mt-2">
          <h3 className="line-clamp-2 text-lg font-bold text-gray-800 lg:text-2xl">{book.title}</h3>
          <h3 className="mt-1 line-clamp-1 text-sm text-gray-500 lg:text-base">{authorLine}</h3>
          {subjects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {subjects.slice(0, 4).map((subject) => (
                <Link
                  key={subject}
                  href={`/katalog?q=${encodeURIComponent(subject)}`}
                  className="rounded-lg border border-primary-200 bg-primary-100 px-2.5 py-1 text-[0.7rem] font-medium text-primary-700"
                >
                  {subject}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sampul */}
        <div className="mb-4 overflow-hidden rounded">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt={`Sampul ${book.title}`}
              referrerPolicy="no-referrer"
              className="mx-auto max-h-[22rem] w-auto rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-24 w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 px-4 text-center text-sm font-semibold text-white">
              Sampul belum tersedia
            </div>
          )}
        </div>

        {/* Ketersediaan ringkas */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-3">
          <span
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.7rem] font-bold ${
              availableCount > 0 ? 'bg-accent-50 text-accent-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-lg ${
                availableCount > 0 ? 'bg-accent-500' : 'bg-gray-400'
              }`}
            />
            {availableCount > 0 ? `${availableCount} eksemplar tersedia` : 'Sedang tidak tersedia'}
          </span>
          <span className="text-xs text-gray-500">
            {items.length > 0
              ? `Tercatat di ${Object.keys(grouped).length} lokasi layanan`
              : 'Belum ada eksemplar tercatat'}
          </span>
        </div>

        {/* Informasi koleksi */}
        <div className="rounded-lg border border-gray-200">
          <h4 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800">
            Informasi Koleksi
          </h4>
          <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
            {meta.map((row) => (
              <div key={row.label} className="flex flex-col">
                <dt className="text-xs text-gray-400">{row.label}</dt>
                <dd className="mt-0.5 text-sm text-gray-700">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Deskripsi */}
        {book.description && (
          <div className="mt-4 rounded-lg border border-gray-200">
            <h4 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800">
              Deskripsi / Catatan
            </h4>
            <div className="prose-opac p-4 text-sm">
              <p>{book.description}</p>
            </div>
          </div>
        )}

        {/* Ketersediaan per lokasi */}
        <div className="mt-4 rounded-lg border border-gray-200" id="eksemplar">
          <h4 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800">
            Tersedia di
          </h4>

          {items.length ? (
            <div className="divide-y divide-gray-100">
              {Object.entries(grouped).map(([location, rows]) => (
                <div key={location} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{location}</p>
                    <span className="text-xs text-gray-500">
                      {rows.filter((r) => r.status === 'available').length}/{rows.length} tersedia
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {rows.map((item) => {
                      const status = ITEM_STATUS[item.status] ?? ITEM_STATUS.available;
                      return (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-gray-500">
                            {item.barcode ?? '—'}
                            <span className="ml-2 text-gray-400">{item.call_number ?? ''}</span>
                          </span>
                          <span className={`rounded px-2 py-0.5 font-medium ring-1 ${statusToneClass(status.tone)}`}>
                            {status.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-4 text-sm text-gray-500">
              Data eksemplar belum tersedia untuk koleksi ini.
            </p>
          )}
        </div>

        {/* Koleksi terkait */}
        {related.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-base font-bold text-gray-800 lg:text-lg">Koleksi Terkait</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {related.map((row) => (
                <BookCard key={row.id} book={row} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
