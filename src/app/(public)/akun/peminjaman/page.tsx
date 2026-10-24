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

export default async function LoansPage() {
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

  const profile = one<{ member_no: string | null }>(
    'SELECT member_no FROM users WHERE id = ?',
    [user.id],
  )!;

  const history = profile.member_no ? getCirculationHistory(profile.member_no) : [];
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

        {/* Info kanal peminjaman */}
        <div className="rounded-lg border border-gray-200 border-l-[3px] border-l-primary-500 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">Peminjaman dilakukan di meja layanan</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Katalog ini hanya menampilkan riwayat. Proses pinjam dan kembali dicatat oleh
            pustakawan melalui sistem sirkulasi perpustakaan.
          </p>
          <Link
            href="/panduan"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
          >
            Baca panduan peminjaman
          </Link>
        </div>

        {/* Tabel */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
            <h4 className="text-sm font-semibold text-gray-900">Daftar peminjaman</h4>
            <span className="text-[0.65rem] text-gray-400">
              No. Anggota: {profile.member_no ?? '—'}
            </span>
          </div>

          {history.length ? (
            <div className="overflow-x-auto">
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
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-500">
                {profile.member_no
                  ? 'Belum ada riwayat peminjaman yang tercatat.'
                  : 'Nomor anggota Anda belum terhubung. Hubungi petugas perpustakaan.'}
              </p>
              <Link
                href="/katalog"
                className="mt-3 inline-block rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
              >
                Telusuri katalog
              </Link>
            </div>
          )}
        </div>

        <p className="text-[0.65rem] leading-relaxed text-gray-400">
          Riwayat ini salinan dari sistem perpustakaan. Bila ada ketidaksesuaian, data pada sistem
          tersebut yang berlaku.
        </p>
      </div>
    </div>
  );
}
