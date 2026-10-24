import Link from 'next/link';
import { buildQuery, type CatalogQuery } from '@/lib/search-params';

/**
 * Paginasi bergaya katalog besar: beberapa halaman di sekitar posisi aktif,
 * tombol lompat ke halaman pertama & terakhir, serta input nomor halaman.
 */
export function Pagination({
  query,
  page,
  pages,
}: {
  query: CatalogQuery;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;

  const WINDOW = 2;
  const numbers: (number | '…')[] = [];

  for (let i = 1; i <= pages; i += 1) {
    const nearCurrent = Math.abs(i - page) <= WINDOW;
    const nearEdge = i === 1 || i === pages || Math.abs(i - 2) <= WINDOW || Math.abs(i - (pages - 1)) <= WINDOW;
    if (nearCurrent || nearEdge) {
      numbers.push(i);
    } else if (numbers[numbers.length - 1] !== '…') {
      numbers.push('…');
    }
  }

  const cell =
    'relative inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-xl px-3 text-xs font-semibold transition';

  return (
    <nav className="mt-8 flex flex-col items-center gap-3" aria-label="Navigasi halaman">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {/* Halaman pertama */}
        <Link
          href={buildQuery(query, { page: 1 })}
          aria-disabled={page === 1}
          aria-label="Halaman pertama"
          className={`${cell} ${
            page === 1
              ? 'pointer-events-none text-gray-300'
              : 'border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M12.7 5.3a1 1 0 010 1.4L9.4 10l3.3 3.3a1 1 0 01-1.4 1.4l-4-4a1 1 0 010-1.4l4-4a1 1 0 011.4 0z" />
            <path d="M16.7 5.3a1 1 0 010 1.4L13.4 10l3.3 3.3a1 1 0 01-1.4 1.4l-4-4a1 1 0 010-1.4l4-4a1 1 0 011.4 0z" />
          </svg>
        </Link>

        {/* Sebelumnya */}
        <Link
          href={buildQuery(query, { page: Math.max(1, page - 1) })}
          aria-disabled={page === 1}
          aria-label="Halaman sebelumnya"
          className={`${cell} ${
            page === 1
              ? 'pointer-events-none text-gray-300'
              : 'border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M12.7 5.3a1 1 0 010 1.4L9.4 10l3.3 3.3a1 1 0 01-1.4 1.4l-4-4a1 1 0 010-1.4l4-4a1 1 0 011.4 0z" />
          </svg>
          <span className="hidden sm:inline">Sebelumnya</span>
        </Link>

        <span className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* Nomor halaman */}
        {numbers.map((n, index) =>
          n === '…' ? (
            <span key={`gap-${index}`} className="px-1 text-xs text-gray-400">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={buildQuery(query, { page: n })}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Halaman ${n}`}
              className={`${cell} ${
                n === page
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              {n.toLocaleString('id-ID')}
            </Link>
          ),
        )}

        <span className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* Berikutnya */}
        <Link
          href={buildQuery(query, { page: Math.min(pages, page + 1) })}
          aria-disabled={page === pages}
          aria-label="Halaman berikutnya"
          className={`${cell} ${
            page === pages
              ? 'pointer-events-none text-gray-300'
              : 'border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M7.3 5.3a1 1 0 011.4 0l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4-1.4l3.3-3.3-3.3-3.3a1 1 0 010-1.4z" />
          </svg>
        </Link>

        {/* Halaman terakhir */}
        <Link
          href={buildQuery(query, { page: pages })}
          aria-disabled={page === pages}
          aria-label="Halaman terakhir"
          className={`${cell} ${
            page === pages
              ? 'pointer-events-none text-gray-300'
              : 'border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M7.3 5.3a1 1 0 011.4 0l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4-1.4l3.3-3.3-3.3-3.3a1 1 0 010-1.4z" />
            <path d="M3.3 5.3a1 1 0 011.4 0l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4-1.4l3.3-3.3-3.3-3.3a1 1 0 010-1.4z" />
          </svg>
        </Link>
      </div>

      {/* Lompat ke halaman tertentu */}
      <form action="/katalog" method="GET" className="flex items-center gap-2 text-xs text-gray-500">
        {query.q && <input type="hidden" name="q" value={query.q} />}
        {query.subject && <input type="hidden" name="subject" value={query.subject} />}
        {query.category && <input type="hidden" name="category" value={query.category} />}
        {query.language && <input type="hidden" name="language" value={query.language} />}
        {query.location && <input type="hidden" name="location" value={query.location} />}
        {query.available && <input type="hidden" name="available" value="1" />}
        {query.sort && <input type="hidden" name="sort" value={query.sort} />}
        <label htmlFor="jump-page">Ke halaman</label>
        <input
          id="jump-page"
          name="page"
          type="number"
          min={1}
          max={pages}
          defaultValue={page}
          className="h-8 w-16 rounded-xl border border-gray-200 px-3 text-center text-xs text-gray-800 focus:border-primary-400 focus:outline-none"
        />
        <span>dari {pages.toLocaleString('id-ID')}</span>
        <button
          type="submit"
          className="h-8 rounded-xl bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-800"
        >
          Buka
        </button>
      </form>
    </nav>
  );
}
