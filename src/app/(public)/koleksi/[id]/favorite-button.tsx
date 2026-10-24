'use client';

import { useState, useTransition } from 'react';
import { toggleFavorite } from '@/actions/catalog';

export function FavoriteButton({ bookId, initial }: { bookId: number; initial: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await toggleFavorite(bookId);
          if (res?.ok) setSaved((v) => !v);
        })
      }
      aria-pressed={saved}
      aria-label={saved ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 ${
        saved ? 'text-accent-700' : 'text-gray-600'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7 3.1c0 4.9-7 9.3-7 9.3Z" />
      </svg>
      <span className="hidden lg:inline">{saved ? 'Tersimpan' : 'Favorit'}</span>
    </button>
  );
}
