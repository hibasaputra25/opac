'use client';

import { useActionState } from 'react';
import { login, register } from '@/actions/auth';

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full">
      {pending ? 'Memproses…' : label}
    </button>
  );
}

function Alert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200"
    >
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Alert message={state?.error} />
      <div>
        <label htmlFor="login-email" className="label">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field h-11"
          placeholder="nama@mercubuana.ac.id"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="label">
          Kata Sandi
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field h-11"
          placeholder="••••••••"
        />
      </div>
      <SubmitButton pending={pending} label="Masuk" />
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Alert message={state?.error} />
      <div className="sm:col-span-2">
        <label htmlFor="reg-name" className="label">
          Nama Lengkap *
        </label>
        <input id="reg-name" name="name" required className="field h-11" placeholder="Nama sesuai identitas" />
      </div>
      <div>
        <label htmlFor="reg-member" className="label">
          Nomor Anggota / NIM
        </label>
        <input id="reg-member" name="member_no" className="field h-11" placeholder="Opsional" />
      </div>
      <div>
        <label htmlFor="reg-phone" className="label">
          No. WhatsApp
        </label>
        <input id="reg-phone" name="phone" className="field h-11" placeholder="08xxxxxxxxxx" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="reg-program" className="label">
          Program Studi / Unit
        </label>
        <input id="reg-program" name="program" className="field h-11" placeholder="Contoh: Teknik Informatika" />
      </div>
      <div>
        <label htmlFor="reg-email" className="label">
          Email *
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field h-11"
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="label">
          Kata Sandi *
        </label>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field h-11"
          placeholder="Minimal 8 karakter"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="reg-confirm" className="label">
          Ulangi Kata Sandi *
        </label>
        <input
          id="reg-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field h-11"
        />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending} label="Daftar Sekarang" />
        <p className="mt-3 text-center text-[0.7rem] leading-relaxed text-muted">
          Dengan mendaftar, Anda menyetujui peraturan peminjaman Perpustakaan Universitas Mercu
          Buana.
        </p>
      </div>
    </form>
  );
}
