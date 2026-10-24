import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { RegisterForm } from '../auth-forms';

export const metadata: Metadata = { title: 'Pendaftaran Anggota' };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/akun');

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Pendaftaran Anggota</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Field bertanda * wajib diisi.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="rounded-xl bg-primary-500 p-4 text-white">
          <h4 className="text-base font-bold leading-tight">Jadi anggota perpustakaan</h4>
          <p className="mt-2 text-xs leading-relaxed text-white/80">
            Dengan akun anggota Anda dapat mengajukan peminjaman, memantau jatuh tempo, dan
            menyimpan daftar buku favorit.
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {[
              'Ajukan peminjaman langsung dari katalog',
              'Pantau status pengajuan dan jatuh tempo',
              'Simpan koleksi favorit',
              'Usulkan buku yang belum tersedia',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  aria-hidden="true"
                >
                  <path d="m4 12.5 5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-300 p-4">
          <RegisterForm />
          <p className="mt-4 text-center text-xs text-gray-500">
            Sudah punya akun?{' '}
            <Link href="/akun/masuk" className="font-medium text-primary-400 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
