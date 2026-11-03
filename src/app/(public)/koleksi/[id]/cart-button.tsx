'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { addToCart, type CartState } from '@/actions/cart';

export function CartButton({
  bookId,
  availableCount,
  isLoggedIn,
  inCart,
}: {
  bookId: number;
  availableCount: number;
  isLoggedIn: boolean;
  inCart: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<CartState>(null);

  if (!isLoggedIn) {
    return (
      <Link
        href={`/akun/profil?next=/koleksi/${bookId}`}
        className="flex w-full items-center justify-center rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
      >
        Tambahkan ke keranjang
      </Link>
    );
  }

  const added = inCart || state?.ok === true;
  const disabled = pending || added || availableCount === 0;

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => startTransition(async () => setState(await addToCart(bookId)))}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          disabled
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'bg-primary-500 text-white hover:bg-primary-600'
        }`}
      >
        {pending
          ? 'Memproses…'
           : added
            ? 'Sudah di keranjang'
            : availableCount === 0
              ? 'Tidak tersedia'
              : 'Tambahkan ke keranjang'}
      </button>

      {/* Pesan ditampilkan di bawah tombol agar tidak terpotong di layar sempit */}
      {state && (
        <p
          role="status"
          className={`mt-2 rounded-lg px-3 py-2 text-[0.7rem] leading-relaxed ${
            state.ok
              ? 'bg-accent-50 text-accent-700 ring-1 ring-accent-200'
              : 'bg-red-50 text-red-700 ring-1 ring-red-200'
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}