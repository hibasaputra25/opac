import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from '../auth-forms';

export const metadata: Metadata = { title: 'Masuk Anggota' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect('/akun');

  const { next } = await searchParams;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md">
        <h3 className="text-lg font-bold lg:text-xl">Masuk ke akun Anda</h3>
        <p className="mt-1 text-xs text-gray-500 lg:text-sm">
          Gunakan email dan kata sandi anggota Perpustakaan UMB.
        </p>

        <div className="mt-4 rounded-xl border border-gray-300 p-4">
          <LoginForm next={next && next.startsWith('/') ? next : '/akun'} />
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Belum punya akun?{' '}
          <Link href="/akun/daftar" className="font-medium text-primary-400 hover:underline">
            Daftar anggota
          </Link>
        </p>
      </div>
    </div>
  );
}
