import Link from 'next/link';
import type { CatalogQuery } from '@/lib/search-params';
import { buildQuery, parseMulti } from '@/lib/search-params';
import type { Facet } from '@/lib/queries';

type Facets = {
  subjects: Facet[];
  categories: Facet[];
  languages: Facet[];
  locations: Facet[];
};

/**
 * Daftar chip subjek di atas grid (pola Jaklitera): tautan cepat satu klik,
 * digeser horizontal bila melebihi lebar layar.
 *
 * Terdiri dari dua kelompok, berdampingan dalam satu baris scroll:
 * 1. Subjek terpilih yang di luar 7 besar — "disuntik" paling kiri, menyala,
 *    klik lagi untuk melepas lalu chip-nya lenyap (kembali ke 7 default).
 * 2. 7 subjek terpopuler — menyala bila subjeknya terpilih.
 *
 * Pilihan lengkap tetap tersedia di modal Filter.
 */
export function SubjectChips({ query, subjects }: { query: CatalogQuery; subjects: Facet[] }) {
  const active = parseMulti(query.subject);
  const defaults = subjects.slice(0, 7);
  const defaultValues = new Set(defaults.map((s) => s.value));

  // Subjek terpilih yang tidak termasuk 7 besar - suntik paling awal.
  const injected = active
    .filter((value) => !defaultValues.has(value))
    .map((value) => ({
      value,
      label: subjects.find((s) => s.value === value)?.label ?? value,
      isActive: true,
    }));

  const chips = [
    ...injected,
    ...defaults.map((subject) => ({
      value: subject.value,
      label: subject.label,
      isActive: active.includes(subject.value),
    })),
  ];

  if (!chips.length) return null;

  return (
    <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5">
      {chips.map(({ value, label, isActive }) => {
        const next = isActive
          ? active.filter((s) => s !== value)
          : [...active, value];
        return (
          <Link
            key={value}
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
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Baris chip filter aktif di bawah chip subjek — masing-masing chip menghapus
 * satu nilai tanpa mengganggu filter lain. Chip subjek tidak diulang di sini
 * (sudah menyala di baris atas); yang tampil kategori/bahasa/lokasi/tahun/
 * ketersediaan.
 */
export function ActiveFilterChips({ query, facets }: { query: CatalogQuery; facets: Facets }) {
  const chips: { key: string; label: string; href: string }[] = [];

  const pushMulti = (
    values: string[],
    source: 'category' | 'language' | 'location',
    resolve: (value: string) => string,
  ) => {
    for (const value of values) {
      const rest = values.filter((v) => v !== value);
      chips.push({
        key: `${source}-${value}`,
        label: resolve(value),
        href: buildQuery(query, { [source]: rest.length ? rest.join(',') : undefined, page: 1 }),
      });
    }
  };

  pushMulti(parseMulti(query.category), 'category', (value) => facets.categories.find((c) => c.value === value)?.label ?? value);
  pushMulti(parseMulti(query.language), 'language', (value) => facets.languages.find((l) => l.value === value)?.label ?? value);
  pushMulti(parseMulti(query.location), 'location', (value) => facets.locations.find((l) => l.value === value)?.label ?? value);

  if (query.available) {
    chips.push({
      key: 'available',
      label: 'Hanya yang tersedia',
      href: buildQuery(query, { available: undefined, page: 1 }),
    });
  }
  if (query.yearFrom) {
    chips.push({
      key: 'yearFrom',
      label: `Dari tahun ${query.yearFrom}`,
      href: buildQuery(query, { yearFrom: undefined, page: 1 }),
    });
  }
  if (query.yearTo) {
    chips.push({
      key: 'yearTo',
      label: `Sampai tahun ${query.yearTo}`,
      href: buildQuery(query, { yearTo: undefined, page: 1 }),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="no-scrollbar -mx-1 mt-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary-200 bg-primary-500/10 py-1 px-2.5 text-xs font-medium text-primary-700 transition hover:bg-primary-500/20"
        >
          {chip.label}
          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true">
            <path d="M6.3 5.3a1 1 0 011.4 0L10 7.6l2.3-2.3a1 1 0 111.4 1.4L11.4 9l2.3 2.3a1 1 0 11-1.4 1.4L10 10.4l-2.3 2.3a1 1 0 11-1.4-1.4L8.6 9 6.3 6.7a1 1 0 010-1.4z" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
