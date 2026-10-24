'use client';

import { useState } from 'react';

export function FilterModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-primary-500 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
        Filter
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Filter koleksi">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setOpen(false)} aria-hidden="true" />

          <div className="relative mx-auto my-8 w-[calc(100%-2rem)] max-w-2xl rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-gray-900">Filter</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Tutup"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {children}

            <div className="mt-5 flex justify-end gap-2 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
