import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LoginGate } from '@/components/login-gate';
import { one } from '@/lib/db';
import { formatDate, formatShortDate } from '@/lib/format';
import { getCirculationHistory, getLoanSummary } from '@/lib/circ-history';
import { countCartItems, CART_MAX_ITEMS } from '@/lib/cart';
import { logout } from '@/actions/auth';
import { ProfileForm } from './forms';

export const metadata: Metadata = { title: 'Profil' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginGate
        next="/akun/profil"
        title="Profil"
        description="Ringkasan keanggotaan dan data diri Anda."
      />
    );
  }

  const row = one<{
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    program: string | null;
    member_no: string | null;
    created_at: string;
  }>('SELECT name, email, phone, address, program, member_no, created_at FROM users WHERE id = ?', [
    user.id,
  ])!;

  // Ringkasan keanggotaan (sebelumnya halaman terpisah)
  const summary = getLoanSummary(row.member_no ?? '');
  const cartCount = countCartItems(user.id);
  const favorites =
    one<{ n: number }>('SELECT count(*) AS n FROM wishlists WHERE user_id = ?', [user.id])?.n ?? 0;
  const recent = row.member_no ? getCirculationHistory(row.member_no).slice(0, 3) : [];

  // Objek hasil query SQLite memiliki null prototype sehingga tidak bisa
  // dikirim langsung ke Client Component; salin ke objek biasa lebih dulu.
  const profile = {
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    program: row.program,
    member_no: row.member_no,
  };

  const stats = [
    { label: 'Isi keranjang', value: `${cartCount}/${CART_MAX_ITEMS}`, href: '/akun/keranjang' },
    { label: 'Sedang dipinjam', value: summary.active, href: '/akun/peminjaman' },
    { label: 'Total pinjam', value: summary.total, href: '/akun/peminjaman' },
    { label: 'Buku favorit', value: favorites, href: '/akun/favorit' },
  ];

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Profil</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Ringkasan keanggotaan dan data diri Anda.
      </p>

      <div className="mt-4 space-y-4">
        {/* Ringkasan keanggotaan */}
        <section className="rounded-xl border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5">
            <h4 className="text-sm font-semibold text-gray-900">{row.name}</h4>
            <span className="rounded bg-primary-50 px-2 py-0.5 text-[0.65rem] font-medium text-primary-600">
              No. Anggota: {row.member_no ?? '—'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-lg border border-gray-200 p-3 transition hover:border-primary-300 hover:shadow-sm"
              >
                <p className="truncate text-lg font-bold text-primary-600">{stat.value}</p>
                <p className="mt-0.5 text-[0.65rem] leading-tight text-gray-500">{stat.label}</p>
              </Link>
            ))}
          </div>

          <dl className="grid gap-x-6 gap-y-2 border-t border-gray-100 px-4 py-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-gray-400">Email</dt>
              <dd className="truncate text-gray-700">{row.email}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Program studi</dt>
              <dd className="truncate text-gray-700">{row.program ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Terdaftar sejak</dt>
              <dd className="text-gray-700">{formatDate(row.created_at)}</dd>
            </div>
          </dl>
        </section>

        {/* Peminjaman terakhir */}
        <section className="overflow-hidden rounded-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
            <h4 className="text-sm font-semibold text-gray-900">Peminjaman terakhir</h4>
            <Link href="/akun/peminjaman" className="text-xs font-semibold text-primary-500 hover:underline">
              Lihat semua
            </Link>
          </div>

          {recent.length ? (
            <ul className="divide-y divide-gray-100">
              {recent.map((loan) => (
                <li key={loan.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    {loan.book_id ? (
                      <Link
                        href={`/koleksi/${loan.book_id}`}
                        className="line-clamp-1 text-xs font-medium text-gray-800 hover:text-primary-600"
                      >
                        {loan.title}
                      </Link>
                    ) : (
                      <span className="line-clamp-1 text-xs font-medium text-gray-800">
                        {loan.title ?? '—'}
                      </span>
                    )}
                    <p className="mt-0.5 text-[0.62rem] text-gray-400">
                      {loan.borrowed_at ? formatShortDate(loan.borrowed_at) : '—'}
                      {loan.due_at ? ` · jatuh tempo ${formatShortDate(loan.due_at)}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[0.58rem] font-semibold ${
                      loan.returned_at ? 'bg-accent-50 text-accent-700' : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    {loan.returned_at ? 'Dikembalikan' : 'Dipinjam'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-xs text-gray-500">Belum ada peminjaman.</p>
          )}
        </section>

        {/* Data anggota */}
        <section className="rounded-xl border border-gray-200">
          <h4 className="border-b border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900">
            Data Anggota
          </h4>
          <div className="p-4">
            <ProfileForm user={profile} />
          </div>
        </section>

        {/* Keluar */}
        <section className="rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Keluar dari akun</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Anda perlu masuk kembali untuk mengakses menu anggota.
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                Keluar
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
