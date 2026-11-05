import Link from 'next/link';
import type { CatalogQuery } from '@/lib/search-params';
import { buildQuery, parseMulti } from '@/lib/search-params';
import type { Facet } from '@/lib/queries';

/**
 * Daftar chip subjek di atas grid (pola Jaklitera): tautan cepat satu klik,
 * digeser horizontal bila melebihi lebar layar.
 *
 * Chip adalah satu-satunya indikator filter subjek di luar modal: menyala
 * (biru) bila subjeknya terpilih, klik lagi untuk melepas. Hanya 7 subjek
 * terpopuler â€” baris pendek selalu muat di desktop tanpa perlu menggeser,
 * dan pilihan lengkap tetap tersedia di modal Filter.
 */
export function SubjectChips({ query, subjects }: { query: CatalogQuery; subjects: Facet[] }) {
  if (!subjects.length) return null;
  const active = parseMulti(query.subject);

  return (
    <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5">
      {subjects.slice(0, 7).map((subject) => {
        const isActive = active.includes(subject.value);
        const next = isActive
          ? active.filter((s) => s !== subject.value)
          : [...active, subject.value];
        return (
          <Link
            key={subject.value}
            href={buildQuery(query, {
              subject: next.length ? next.join(',') : undefined,
              page: 1,
            })}
            aria-pressed={isActive}
            className={`shrink-0 rounded-lg border py-1.5 px-3 text-xs font-medium transition ${
              isActive
                ? 'border-primary-500 bg-primary-500/10 text-primary-600'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600'
            }`}
          >
            {subject.label}
          </Link>
        );
      })}
    </div>
  );
}
