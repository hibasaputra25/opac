import Link from 'next/link';
import { BookCard } from '@/components/ui/book-card';
import { getNewBooks, getTopSubjects, getLocations } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const RECOMMEND_TABS = ['Direkomendasikan', 'Manajemen', 'Ekonomi', 'Psikologi', 'Teknik'];

export default async function HomePage() {
  const [newBooks, subjects, locations] = await Promise.all([
    Promise.resolve(getNewBooks(8)),
    Promise.resolve(getTopSubjects(6)),
    Promise.resolve(getLocations()),
  ]);

  return (
    <div className="min-h-screen">
      {/* Rekomendasi Buku */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold lg:text-xl">Rekomendasi Buku</h3>
            <p className="mt-1 hidden text-xs text-gray-500 lg:block lg:text-sm">
              Temukan inspirasi baca kamu!
            </p>
          </div>
          <Link
            href="/katalog"
            className="rounded bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 lg:text-sm"
          >
            Lihat Semua
          </Link>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {RECOMMEND_TABS.map((tab, index) => (
            <Link
              key={tab}
              href={index === 0 ? '/katalog?sort=newest' : `/katalog?q=${encodeURIComponent(tab)}`}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium ${
                index === 0
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-700'
              }`}
            >
              {tab}
            </Link>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {newBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      {/* Cara meminjam */}
      <section className="my-8">
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 border-l-[3px] border-l-accent-500 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Ingin meminjam buku?</p>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-gray-500">
              Keranjang terlebih dahulu, lalu ambil di meja layanan perpustakaan dengan
              menyebutkan nomor anggota Anda.
            </p>
          </div>
          <Link
            href="/akun/keranjang"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
          >
            Keranjang
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Telusuri subjek */}
      {subjects.length > 0 && (
        <section className="my-8">
          <h3 className="text-base font-bold lg:text-xl">Telusuri Subjek</h3>
          <p className="mt-1 hidden text-xs text-gray-500 lg:block lg:text-sm">
            Subjek paling banyak tersedia di perpustakaan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <Link
                key={subject.value}
                href={`/katalog?subject=${subject.value}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-primary-300 hover:text-primary-600 lg:text-sm"
              >
                {subject.label}
                <span className="ml-1 text-gray-400">({subject.count.toLocaleString('id-ID')})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Lokasi */}
      <section className="my-8">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold lg:text-xl">Lokasi Perpustakaan</h3>
          <Link href="/lokasi" className="text-xs font-medium text-primary-500 hover:underline lg:text-sm">
            Lihat semua
          </Link>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {locations.map((location) => (
            <div key={location.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{location.name}</p>
                <p className="text-xs text-gray-500">
                  {location.book_count.toLocaleString('id-ID')} judul koleksi
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
