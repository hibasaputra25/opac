import Link from 'next/link';
import { BookCard, coverAspectRatio, RATIO_FALLBACK } from './book-card';

type Book = React.ComponentProps<typeof BookCard>['book'] & {
  publisher?: string | null;
  call_number?: string | null;
};

/**
 * Baris buku untuk tampilan daftar. Informasi padat: judul penuh, pengarang,
 * penerbit, tahun, call number, subjek, dan status ketersediaan — semuanya
 * terlihat tanpa membuka halaman detail. Sampul mini memakai gradient yang
 * sama seperti kartu grid bila gambar tidak tersedia.
 */
function BookRow({ book }: { book: Book }) {
  const subject = book.subjects?.split(' ; ').filter(Boolean).slice(0, 3) ?? [];
  const available = book.availableCount ?? 0;
  const total = book.totalCount ?? 0;
  const authors = book.authors?.split(' ; ').filter(Boolean) ?? [];
  const cover = book.cover_url ?? null;
  const ratio = cover
    ? coverAspectRatio(book)
    : RATIO_FALLBACK;

  return (
    <Link
      href={`/koleksi/${book.id}`}
      className="group flex gap-3 rounded-lg border border-gray-200 bg-white p-2.5 transition hover:border-primary-300 hover:shadow-lift sm:gap-4 sm:p-3"
    >
      {/* Sampul mini 48x64 — gradient sama seperti grid bila tak ada gambar */}
      <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded bg-gray-100 sm:w-14">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center p-1"
            style={{ backgroundImage: 'linear-gradient(150deg, #0B419E, #1062ED)' }}
          >
            <span className="line-clamp-2 text-center text-[0.45rem] font-bold leading-tight text-white/90">
              {book.title}
            </span>
          </div>
        )}
        <span className="sr-only">{`Rasio ${ratio}`}</span>
      </div>

      {/* Info utama */}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 group-hover:text-primary-600">
          {book.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {authors.length ? authors.join(' ; ') : 'Pengarang tidak tercatat'}
          {book.publisher ? ` — ${book.publisher}` : ''}
          {book.year ? ` (${book.year})` : ''}
        </p>

        {subject.length > 0 && (
          <p className="mt-1 truncate text-[0.68rem] text-primary-600/80">
            {subject.join(' · ')}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-gray-400">
          {book.call_number && (
            <span className="font-mono">
              <span className="text-gray-300">Call No.</span> {book.call_number}
            </span>
          )}
          <span>
            {available > 0 ? (
              <span className="font-semibold text-accent-600">{available} tersedia</span>
            ) : (
              'Sedang dipinjam'
            )}
            {total > 0 && <span> · {total} eks.</span>}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Tampilan daftar: satu kolom, informasi lengkap per baris. */
export function BookList({ books }: { books: Book[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {books.map((book) => (
        <BookRow key={book.id} book={book} />
      ))}
    </div>
  );
}
