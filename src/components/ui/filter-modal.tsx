'use client';

import { useState } from 'react';
import type { CatalogQuery } from '@/lib/search-params';
import { parseMulti } from '@/lib/search-params';
import type { Facet } from '@/lib/queries';

type Props = {
  query: CatalogQuery;
  facets: {
    subjects: Facet[];
    categories: Facet[];
    languages: Facet[];
    locations: Facet[];
  };
};

/**
 * Modal filter pola Jaklitera: checkbox multi-pilih untuk kategori & lokasi,
 * dropdown untuk bahasa & urutan, dan tahun terbit, ditutup tombol Terapkan.
 * Seluruh isi adalah satu <form method="GET"> — tanpa state filter rumit;
 * membatalkan cukup menutup modal tanpa mengirim apa pun.
 */
export function FilterModal({ query, facets }: Props) {
  const [open, setOpen] = useState(false);

  const checkedCategories = parseMulti(query.category);
  const checkedLocations = parseMulti(query.location);
  const checkedLanguages = parseMulti(query.language);
  const checkedSubjects = parseMulti(query.subject);

  const count =
    checkedCategories.length +
    checkedLocations.length +
    checkedLanguages.length +
    checkedSubjects.length +
    (query.available ? 1 : 0) +
    (query.yearFrom ? 1 : 0) +
    (query.yearTo ? 1 : 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-lg border border-primary-500 py-1.5 px-3 text-xs font-medium text-primary-600 transition hover:bg-primary-50"
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
        Filter
        {count > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[0.6rem] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Filter koleksi">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setOpen(false)} aria-hidden="true" />

          <form action="/katalog" method="GET" className="relative mx-auto my-8 w-[calc(100%-2rem)] max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-end p-4 pb-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Tutup"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="max-h-[65vh] space-y-6 overflow-y-auto px-5 pb-4">
              {/* Kategori — checkbox multi-pilih */}
              <CheckboxGroup
                title="Saring Kategori"
                name="category"
                items={facets.categories}
                checked={checkedCategories}
              />

              {/* Subjek — checkbox multi-pilih */}
              <CheckboxGroup
                title="Saring Subjek"
                name="subject"
                items={facets.subjects}
                checked={checkedSubjects}
                limit={12}
              />

              {/* Lokasi — checkbox multi-pilih */}
              <CheckboxGroup
                title="Saring Lokasi"
                name="location"
                items={facets.locations}
                checked={checkedLocations}
              />

              {/* Bahasa — dropdown */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-900">Saring Bahasa</p>
                <div className="flex flex-wrap gap-1.5">
                  {facets.languages.map((language) => {
                    const checked = checkedLanguages.includes(language.value);
                    return (
                      <label
                        key={language.value}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border py-1.5 px-3 text-xs font-medium transition ${
                          checked
                            ? 'border-primary-500 bg-primary-500/10 text-primary-600'
                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-primary-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="language"
                          value={language.value}
                          defaultChecked={checked}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        {language.label}
                        <span className="text-gray-400">{language.count.toLocaleString('id-ID')}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tahun terbit */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-900">Tahun Terbit</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="yearFrom"
                    min={1900}
                    max={2100}
                    defaultValue={query.yearFrom ?? ''}
                    placeholder="Dari"
                    className="h-9 w-28 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none"
                  />
                  <span className="text-xs text-gray-400">s.d.</span>
                  <input
                    type="number"
                    name="yearTo"
                    min={1900}
                    max={2100}
                    defaultValue={query.yearTo ?? ''}
                    placeholder="Sampai"
                    className="h-9 w-28 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Urutkan */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-900">Urut Berdasarkan</p>
                <select
                  name="sort"
                  defaultValue={query.sort ?? ''}
                  className="h-9 w-full rounded-lg border-2 border-gray-100 bg-gray-50 px-3 text-sm text-gray-800 focus:border-primary-400 focus:outline-none"
                >
                  <option value="">Paling relevan</option>
                  <option value="newest">Terbaru</option>
                  <option value="year_desc">Tahun terbit terbaru</option>
                  <option value="year_asc">Tahun terbit terlama</option>
                  <option value="title">Judul A-Z</option>
                </select>
              </div>

              {/* Hanya tersedia */}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  name="available"
                  value="1"
                  defaultChecked={Boolean(query.available)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Hanya tampilkan koleksi yang tersedia
              </label>
            </div>

            {/* Aksi */}
            <div className="flex items-center justify-center gap-2 rounded-b-xl bg-gray-50 px-4 py-3">
              <button
                type="submit"
                className="w-full rounded-lg bg-primary-500 py-2 px-3 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Terapkan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function CheckboxGroup({
  title,
  name,
  items,
  checked,
  limit,
}: {
  title: string;
  name: 'category' | 'subject' | 'location';
  items: Facet[];
  checked: string[];
  limit?: number;
}) {
  if (!items.length) return null;
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-900">{title}</p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {shown.map((item) => (
          <label key={item.value} className="flex cursor-pointer items-center gap-2 rounded-lg py-1 text-sm text-gray-700 hover:bg-gray-50">
            <input
              type="checkbox"
              name={name}
              value={item.value}
              defaultChecked={checked.includes(item.value)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="ml-auto shrink-0 text-xs text-gray-400">{item.count.toLocaleString('id-ID')}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
