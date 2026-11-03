import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LoginGate } from '@/components/login-gate';
import { one } from '@/lib/db';
import { formatShortDate } from '@/lib/format';
import { getCirculationHistory, getLoanSummary, loanRowStatus } from '@/lib/circ-history';

export const metadata: Metadata = { title: 'Peminjaman' };
export const dynamic = 'force-dynamic';

const STATUS_META = {
  active: { label: 'Dipinjam', className: 'bg-primary-100 text-primary-700' },
  overdue: { label: 'Terlambat', className: 'bg-amber-50 text-amber-700' },
  returned: { label: 'Dikembalikan', className: 'bg-accent-50 text-accent-700' },
  late: { label: 'Terlambat dikembalikan', className: 'bg-amber-50 text-amber-700' },
} as const;

function daysUntil(date: string | null) {
  if (!date) return null;
  const diff = new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86_400_000);
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginGate
        next="/akun/peminjaman"
        title="Peminjaman"
        description="Riwayat peminjaman buku Anda."
      />
    );
  }

  const { q } = await searchParams;
  const keyword = q?.trim() ?? '';

  const profile = one<{ member_no: string | null }>(
    'SELECT member_no FROM users WHERE id = ?',
    [user.id],
  )!;

  const history = profile.member_no ? getCirculationHistory(profile.member_no, keyword) : [];
  const summary = getLoanSummary(profile.member_no ?? '');
  const remaining = daysUntil(summary.nearestDue);

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Peminjaman</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Riwayat peminjaman buku Anda. Data disalin dari sistem perpustakaan.
      </p>

      <div className="mt-4 space-y-4">
        {/* Ringkasan */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total pinjam', value: summary.total },
            { label: 'Sedang dipinjam', value: summary.active },
            { label: 'Tepat waktu', value: summary.onTime },
            { label: 'Terlambat', value: summary.late },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-gray-200 p-3">
              <p className="text-lg font-bold text-primary-600">{stat.value}</p>
              <p className="mt-0.5 text-[0.65rem] leading-tight text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pengingat jatuh tempo */}
        {summary.nearestDue && remaining !== null && (
          <div
            className={`rounded-lg border-l-[3px] bg-white p-4 ${
              remaining < 0
                ? 'border border-amber-200 border-l-amber-500'
                : 'border border-gray-200 border-l-accent-500'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">
              {remaining < 0
                ? `Melewati jatuh tempo ${Math.abs(remaining)} hari`
                : remaining === 0
                  ? 'Jatuh tempo hari ini'
                  : `Jatuh tempo dalam ${remaining} hari`}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Buku terdekat harus dikembalikan pada {formatShortDate(summary.nearestDue)}.
            </p>
          </div>
        )}

        {/* Tabel + pencarian */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-gray-900">Daftar peminjaman</h4>
              <span className="text-[0.65rem] text-gray-400">
                No. Anggota: {profile.member_no ?? '—'}
              </span>
            </div>

            {/* Pencarian riwayat */}
            <form action="/akun/peminjaman" method="GET" className="mt-2.5">
              <label htmlFor="history-search" className="sr-only">
                Cari riwayat peminjaman
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="history-search"
                    name="q"
                    type="search"
                    defaultValue={keyword}
                    placeholder="Cari judul, pengarang, atau barcode"
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-600"
                >
                  Cari
                </button>
                {keyword && (
                  <Link
                    href="/akun/peminjaman"
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Reset
                  </Link>
                )}
              </div>

              {keyword && (
                <p className="mt-2 text-[0.68rem] text-gray-500">
                  {history.length > 0
                    ? `${history.length} hasil untuk “${keyword}”`
                    : `Tidak ada hasil untuk “${keyword}”`}
                </p>
              )}
            </form>
          </div>

          {history.length ? (
            <>
              {/* Mobile: kartu bertumpuk (tabel 6 kolom tidak terbaca di layar sempit) */}
              <ul className="divide-y divide-gray-100 md:hidden">
                {history.map((row) => {
                  const status = loanRowStatus(row);
                  const meta = STATUS_META[status];
                  const overdue =
                    status === 'overdue' || status === 'late';

                  return (
                    <li key={row.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {row.book_id ? (
                            <Link
                              href={`/koleksi/${row.book_id}`}
                              className="line-clamp-2 text-[0.82rem] font-semibold leading-snug text-gray-900 hover:text-primary-600"
                            >
                              {row.title}
                            </Link>
                          ) : (
                            <span className="line-clamp-2 text-[0.82rem] font-semibold leading-snug text-gray-900">
                              {row.title ?? '—'}
                            </span>
                          )}
                          <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-gray-500">
                            {row.author ?? 'Tanpa pengarang'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-[0.58rem] font-semibold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <dl className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <dt className="text-[0.58rem] uppercase tracking-wide text-gray-400">
                            Pinjam
                          </dt>
                          <dd className="mt-0.5 text-[0.68rem] text-gray-700">
                            {row.borrowed_at ? formatShortDate(row.borrowed_at) : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[0.58rem] uppercase tracking-wide text-gray-400">
                            Jatuh tempo
                          </dt>
                          <dd
                            className={`mt-0.5 text-[0.68rem] ${
                              overdue ? 'font-semibold text-amber-700' : 'text-gray-700'
                            }`}
                          >
                            {row.due_at ? formatShortDate(row.due_at) : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[0.58rem] uppercase tracking-wide text-gray-400">
                            Kembali
                          </dt>
                          <dd className="mt-0.5 text-[0.68rem] text-gray-700">
                            {row.returned_at ? formatShortDate(row.returned_at) : '—'}
                          </dd>
                        </div>
                      </dl>

                      {row.barcode && (
                        <p className="mt-1.5 font-mono text-[0.6rem] text-gray-400">
                          Barcode {row.barcode}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Tablet & desktop: tabel */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[14%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead className="bg-gray-50 text-[0.62rem] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Judul</th>
                      <th className="px-2 py-2 font-semibold">Barcode</th>
                      <th className="px-2 py-2 font-semibold">Pinjam</th>
                      <th className="px-2 py-2 font-semibold">Jatuh Tempo</th>
                      <th className="px-2 py-2 font-semibold">Kembali</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((row) => {
                      const status = loanRowStatus(row);
                      const meta = STATUS_META[status];
                      return (
                        <tr key={row.id} className="align-top hover:bg-gray-50/60">
                          <td className="px-4 py-2.5">
                            {row.book_id ? (
                              <Link
                                href={`/koleksi/${row.book_id}`}
                                className="line-clamp-2 font-medium text-gray-800 hover:text-primary-600"
                              >
                                {row.title}
                              </Link>
                            ) : (
                              <span className="line-clamp-2 font-medium text-gray-800">
                                {row.title ?? '—'}
                              </span>
                            )}
                            <p className="mt-0.5 line-clamp-1 text-[0.65rem] text-gray-400">
                              {row.author ?? '—'}
                            </p>
                          </td>
                          <td className="truncate px-2 py-2.5 font-mono text-[0.62rem] text-gray-500">
                            {row.barcode ?? '—'}
                          </td>
                          <td className="px-2 py-2.5 text-gray-600">
                            {row.borrowed_at ? formatShortDate(row.borrowed_at) : '—'}
                          </td>
                          <td className="px-2 py-2.5 text-gray-600">
                            {row.due_at ? formatShortDate(row.due_at) : '—'}
                          </td>
                          <td className="px-2 py-2.5 text-gray-600">
                            {row.returned_at ? formatShortDate(row.returned_at) : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[0.58rem] font-semibold ${meta.className}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-500">
                {keyword
                  ? 'Tidak ada peminjaman yang cocok dengan pencarian.'
                  : profile.member_no
                    ? 'Belum ada riwayat peminjaman yang tercatat.'
                    : 'Nomor anggota Anda belum terhubung. Hubungi petugas perpustakaan.'}
              </p>
              {keyword ? (
                <Link
                  href="/akun/peminjaman"
                  className="mt-3 inline-block rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Tampilkan semua
                </Link>
              ) : (
                <Link
                  href="/katalog"
                  className="mt-3 inline-block rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
                >
                  Telusuri katalog
                </Link>
              )}
            </div>
          )}
        </div>

        <p className="text-[0.65rem] leading-relaxed text-gray-400">
          Riwayat ini salinan dari sistem perpustakaan. Bila ada ketidaksesuaian, hubungi petugas di
          meja layanan.
        </p>
      </div>
    </div>
  );
}