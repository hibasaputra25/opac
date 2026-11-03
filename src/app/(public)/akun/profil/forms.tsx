'use client';

import { useActionState } from 'react';
import { updateProfile } from '@/actions/auth';

type State = { error?: string; success?: string } | null;

function Message({ state }: { state: State }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
        {state.error}
      </p>
    );
  }
  return (
    <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200">
      {state.success}
    </p>
  );
}

export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; phone: string | null; address: string | null; program: string | null };
}) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className="label">Nama Lengkap</label>
          <input id="p-name" name="name" defaultValue={user.name} required className="field h-11" />
        </div>
        <div>
          <label htmlFor="p-email" className="label">Email</label>
          <input id="p-email" value={user.email} disabled className="field h-11 bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label htmlFor="p-phone" className="label">No. WhatsApp</label>
          <input id="p-phone" name="phone" defaultValue={user.phone ?? ''} className="field h-11" />
        </div>
        <div>
          <label htmlFor="p-program" className="label">Program Studi / Unit</label>
          <input id="p-program" name="program" defaultValue={user.program ?? ''} className="field h-11" />
        </div>
      </div>
      <div>
        <label htmlFor="p-address" className="label">Alamat</label>
        <textarea id="p-address" name="address" rows={3} defaultValue={user.address ?? ''} className="field" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? 'Menyimpan…' : 'Simpan Perubahan'}
      </button>
    </form>
  );
}
