'use client';

import { useActionState } from 'react';
import { submitBookRequest } from '@/actions/auth';

export function BookRequestForm() {
  const [state, action, pending] = useActionState(submitBookRequest, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200">
          {state.success}
        </p>
      )}

      <div>
        <label htmlFor="br-title" className="label">Judul Buku *</label>
        <input id="br-title" name="title" required className="field h-11" placeholder="Judul lengkap" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="br-author" className="label">Pengarang</label>
          <input id="br-author" name="author" className="field h-11" />
        </div>
        <div>
          <label htmlFor="br-publisher" className="label">Penerbit</label>
          <input id="br-publisher" name="publisher" className="field h-11" />
        </div>
        <div>
          <label htmlFor="br-isbn" className="label">ISBN</label>
          <input id="br-isbn" name="isbn" className="field h-11" />
        </div>
        <div>
          <label htmlFor="br-year" className="label">Tahun Terbit</label>
          <input id="br-year" name="year" type="number" min="1900" max="2100" className="field h-11" />
        </div>
      </div>

      <div>
        <label htmlFor="br-reason" className="label">Alasan / Keterangan</label>
        <textarea
          id="br-reason"
          name="reason"
          rows={4}
          className="field"
          placeholder="Mengapa buku ini perlu ditambahkan ke koleksi?"
        />
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary h-11 px-6">
        {pending ? 'Mengirim…' : 'Kirim Usulan'}
      </button>
    </form>
  );
}
