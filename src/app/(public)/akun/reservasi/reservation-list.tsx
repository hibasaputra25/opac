'use client';

import { useState, useTransition } from 'react';
import { cancelReservation } from '@/actions/reservations';

export function ReservationList({ id, mode }: { id: number; mode: 'cancel' }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (mode !== 'cancel') return null;

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await cancelReservation(id);
            if (!res?.ok) setError(res?.message ?? 'Gagal membatalkan.');
          })
        }
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-[0.68rem] font-medium text-gray-600 hover:border-red-300 hover:text-red-600"
      >
        {pending ? 'Membatalkan…' : 'Batalkan'}
      </button>
      {error && <p className="mt-1 text-[0.6rem] text-red-600">{error}</p>}
    </div>
  );
}
