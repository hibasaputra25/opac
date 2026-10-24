'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '@/actions/auth';

/**
 * Gerbang login: ditampilkan sebagai popup di atas halaman yang sedang dituju,
 * bukan mengalihkan ke halaman login terpisah. Setelah berhasil masuk,
 * pengguna kembali ke halaman yang sama (lewat parameter `next`).
 */
export function LoginGate({
  next,
  title,
  description,
}: {
  next: string;
  title: string;
  description?: string;
}) {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <div className="relative min-h-[70vh]">
      {/* Latar diburamkan agar konteks halaman tetap terlihat */}
      <div className="pointer-events-none select-none blur-sm" aria-hidden="true">
        <h3 className="text-lg font-bold lg:text-xl">{title}</h3>
        <p className="mt-1 text-xs text-gray-500 lg:text-sm">
          {description ?? 'Masuk untuk melihat data ini.'}
        </p>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg border border-gray-200 bg-gray-50" />
            ))}
          </div>
          <div className="h-40 rounded-lg border border-gray-200 bg-gray-50" />
        </div>
      </div>

      {/* Popup login */}
      <div className="absolute inset-0 flex items-start justify-center pt-6">
        <div
          className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-gate-title"
        >
          <h2 id="login-gate-title" className="text-base font-bold text-gray-900">
            Masuk ke akun Anda
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Halaman ini hanya dapat diakses setelah masuk sebagai anggota.
          </p>

          <form action={formAction} className="mt-4 space-y-3">
            <input type="hidden" name="next" value={next} />

            {state?.error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200"
              >
                {state.error}
              </p>
            )}

            <div>
              <label htmlFor="gate-email" className="label">
                Email
              </label>
              <input
                id="gate-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                className="field h-10"
                placeholder="nama@mercubuana.ac.id"
              />
            </div>

            <div>
              <label htmlFor="gate-password" className="label">
                Kata Sandi
              </label>
              <input
                id="gate-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="field h-10"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={pending} className="btn btn-primary h-10 w-full">
              {pending ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <p className="mt-3 text-center text-[0.7rem] text-gray-500">
            Belum punya akun?{' '}
            <Link href="/akun/daftar" className="font-semibold text-primary-600 hover:underline">
              Daftar anggota
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
