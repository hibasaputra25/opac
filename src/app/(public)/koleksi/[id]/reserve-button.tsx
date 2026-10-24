'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { reserveBook, type ReserveState } from '@/actions/reservations';

export function ReserveButton({
  bookId,
  availableCount,
  isLoggedIn,
  alreadyReserved,
}: {
  bookId: number;
  availableCount: number;
  isLoggedIn: boolean;
  alreadyReserved: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ReserveState>(null);

  if (!isLoggedIn) {
    return (
      <Link
        href={`/akun/profil?next=/koleksi/${bookId}`}
        className="flex items-center justify-center rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
      >
        Masuk untuk reservasi
      </Link>
    );
  }

  const reserved = alreadyReserved || state?.ok === true;
  const disabled = pending || reserved || availableCount === 0;

  return (
    <div className="relative">
      {state && (
        <p
          role="status"
          className={`absolute bottom-full right-0 mb-2 w-72 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg ${
            state.ok ? 'bg-accent-50 text-accent-700' : 'bg-gray-900 text-white'
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => startTransition(async () => setState(await reserveBook(bookId)))}
        className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          disabled
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'bg-primary-500 text-white hover:bg-primary-600'
        }`}
      >
        {pending
          ? 'Memproses…'
          : reserved
            ? 'Sudah direservasi'
            : availableCount === 0
              ? 'Tidak tersedia'
              : 'Reservasi buku ini'}
      </button>
    </div>
  );
}
