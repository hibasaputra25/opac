import Link from 'next/link';
import { CatalogFilters } from '@/components/ui/catalog-filters';
import { CatalogGrid } from '@/components/ui/catalog-grid';
import { FilterModal } from '@/components/ui/filter-modal';
import { Pagination } from '@/components/ui/pagination';
import { getFacets, searchBooks } from '@/lib/queries';
import { buildQuery, parseCatalogParams, type RawSearchParams } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

const SORTS = [
  { value: '', label: 'Relevan' },
  { value: 'newest', label: 'Terbaru' },
  { value: 'title', label: 'A-Z' },
  { value: 'year_desc', label: 'Tahun' },
];

/**
 * Gaya chip mengikuti Jaklitera: latar transparan, border solid, hover berwarna.
 * Aktif: latar biru transparan + border solid biru UMB.
 */
const CHIP_BASE =
  'shrink-0 rounded-lg border py-1.5 px-3 text-xs font-medium transition';
const CHIP_IDLE =
  'border-gray-200 bg-gray-50 text-gray-500 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600';
const CHIP_ACTIVE = 'border-primary-500 bg-primary-500/10 text-primary-600';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const query = parseCatalogParams(raw);
  const perPage = 16;

  const result = searchBooks({ ...query, perPage });
  const facets = getFacets(query);
  const filters = <CatalogFilters query={query} facets={facets} />;

  return (
    <div className="min-h-screen">
      {/* Pencarian */}
      <form action="/katalog" method="GET">
        <label htmlFor="search-books" className="sr-only">
          Cari koleksi
        </label>
        <div className="relative">
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
        </div>
      </form>

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FilterModal>{filters}</FilterModal>

          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
            {SORTS.map((sort) => {
              const active = (query.sort ?? '') === sort.value;
              return (
                <Link
                  key={sort.value || 'relevance'}
                  href={buildQuery(query, { sort: sort.value || undefined, page: 1 })}
                  className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
                >
                  {sort.label}
                </Link>
              );
            })}
          </div>
        </div>

        <p className="shrink-0 text-xs text-gray-400">
          <span className="font-bold text-gray-700">{result.total.toLocaleString('id-ID')}</span>{' '}
          koleksi
        </p>
      </div>

      {/* Hasil */}
      <div className="mt-4">
        {result.rows.length ? (
          <>
            <CatalogGrid books={result.rows} />

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
