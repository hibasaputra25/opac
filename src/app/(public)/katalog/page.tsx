import Link from 'next/link';
import { CatalogGrid } from '@/components/ui/catalog-grid';
import { BookList } from '@/components/ui/book-list';
import { FilterModal } from '@/components/ui/filter-modal';
import { Pagination } from '@/components/ui/pagination';
import { SubjectChips, ActiveFilterChips } from '@/components/ui/subject-chips';
import { getFacets, searchBooks } from '@/lib/queries';
import {
  buildQuery,
  parseCatalogParams,
  type CatalogQuery,
  type RawSearchParams,
} from '@/lib/search-params';

export const dynamic = 'force-dynamic';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const query = parseCatalogParams(raw);
  const perPage = 32;

  const result = searchBooks({ ...query, perPage });
  const facets = getFacets(query);

  return (
    <div className="min-h-screen">
      {/* Baris 1: pencarian (kiri, lebar) + tombol filter (kanan) */}
      <form action="/katalog" method="GET" className="flex items-center gap-2">
        <label htmlFor="search-books" className="sr-only">
          Cari koleksi
        </label>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="search-books"
            name="q"
            type="search"
            defaultValue={query.q ?? ''}
            placeholder="Cari judul, pengarang, subjek, atau ISBN"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {query.subject && <input type="hidden" name="subject" value={query.subject} />}
          {query.category && <input type="hidden" name="category" value={query.category} />}
          {query.language && <input type="hidden" name="language" value={query.language} />}
          {query.location && <input type="hidden" name="location" value={query.location} />}
          {query.available && <input type="hidden" name="available" value="1" />}
          {query.sort && <input type="hidden" name="sort" value={query.sort} />}
          {query.yearFrom && <input type="hidden" name="yearFrom" value={query.yearFrom} />}
          {query.yearTo && <input type="hidden" name="yearTo" value={query.yearTo} />}
        </div>

        <FilterModal query={query} facets={facets} />
      </form>
      {/* Baris 2: chip subjek (menyala bila aktif) + toggle grid/daftar */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <SubjectChips query={query} subjects={facets.subjects} />
        <ViewToggle view={query.view ?? 'grid'} query={query} />
      </div>

      {/* Jumlah hasil, kanan-bawah */}
      <p className="mt-1.5 text-right text-xs text-gray-400">
        <span className="font-bold text-gray-700">{result.total.toLocaleString('id-ID')}</span>{' '}
        koleksi
      </p>

      {/* Chip filter aktif — masing-masing bisa dihapus satu per satu */}
      <ActiveFilterChips query={query} facets={facets} />

      {/* Pemberitahuan mode pencarian fallback */}
      {result.mode === 'or' && (
        <p className="mt-2 text-xs text-gray-500">
          Tidak ada hasil yang cocok dengan semua kata — menampilkan hasil yang mengandung{' '}
          <span className="font-semibold text-gray-700">salah satu</span> kata kunci.
        </p>
      )}
      {result.mode === 'typo' && result.corrected && (
        <p className="mt-2 text-xs text-gray-500">
          Menampilkan hasil untuk{' '}
          <span className="font-semibold text-primary-600">&ldquo;{result.corrected}&rdquo;</span> —
          hasil untuk &ldquo;{query.q}&rdquo; tidak ditemukan.
        </p>
      )}

      {/* Hasil */}
      <div id="hasil" className="mt-4 scroll-mt-20">
        {result.rows.length ? (
          <>
            {query.view === 'list' ? (
              <BookList books={result.rows} />
            ) : (
              <CatalogGrid books={result.rows} />
            )}

            <Pagination query={query} page={result.page} pages={result.pages} />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-10 text-center">
            <p className="text-sm font-bold text-gray-800">Belum ada koleksi yang cocok</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-gray-500">
              Coba kata kunci yang lebih umum, atau sampaikan usulan judul agar koleksi kami
              lengkapi.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link
                href="/katalog"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
              >
                Bersihkan pencarian
              </Link>
              <Link
                href="/usul-buku"
                className="rounded bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                Usul buku
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Toggle grid/daftar — dua tombol ikon, keduanya navigasi URL (konsisten
 * dengan arsitektur server-side katalog; hasil pencarian bisa dibagikan
 * dengan tampilannya).
 */
function ViewToggle({ view, query }: { view: 'grid' | 'list'; query: CatalogQuery }) {
  const GRID_PATH = 'M4 3.5h5v5H4zM11 3.5h5v5h-5zM4 11.5h5v5H4zM11 11.5h5v5h-5z';
  const LIST_PATH = 'M3 5h14v1.8H3zM3 9.1h14v1.8H3zM3 13.2h14v1.8H3z';

  const button = (target: 'grid' | 'list', active: boolean, label: string, path: string) => (
    <Link
      href={buildQuery(query, { view: target === 'grid' ? undefined : target, page: 1 })}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`relative inline-flex h-8 w-9 items-center justify-center rounded-lg border transition ${
        active
          ? 'border-primary-500 bg-primary-500/10 text-primary-600'
          : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-primary-300 hover:text-primary-500'
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    </Link>
  );

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Mode tampilan">
      {button('grid', view === 'grid', 'Tampilan grid', GRID_PATH)}
      {button('list', view === 'list', 'Tampilan daftar', LIST_PATH)}
    </div>
  );
}
