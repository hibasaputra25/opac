import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LoginGate } from '@/components/login-gate';
import { one } from '@/lib/db';
import { formatShortDate } from '@/lib/format';
import { getActivitySummary, getLockerUsage, getVisits } from '@/lib/circ-history';

export const metadata: Metadata = { title: 'Aktivitas' };
export const dynamic = 'force-dynamic';

/** Menghitung durasi kunjungan bila jam masuk & keluar tersedia. */
function duration(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn.replace(' ', 'T'));
  const end = new Date(checkOut.replace(' ', 'T'));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginGate
        next="/akun/aktivitas"
        title="Aktivitas"
        description="Riwayat kunjungan serta pemakaian loker dan tas Anda."
      />
    );
  }

  const profile = one<{ member_no: string | null }>(
    'SELECT member_no FROM users WHERE id = ?',
    [user.id],
  )!;

  const memberNo = profile.member_no ?? '';
  const visits = getVisits(memberNo);
  const lockers = getLockerUsage(memberNo);
  const summary = getActivitySummary(memberNo);

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Aktivitas</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Riwayat kunjungan serta pemakaian loker dan tas Anda.
      </p>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Kunjungan', value: summary.visits },
            { label: 'Pemakaian loker/tas', value: summary.lockers },
            { label: 'Masih dipakai', value: summary.openLockers },
            {
              label: 'Kunjungan terakhir',
              value: summary.lastVisit ? formatShortDate(summary.lastVisit) : '—',
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-gray-200 p-3">
              <p className="truncate text-lg font-bold text-primary-600">{stat.value}</p>
              <p className="mt-0.5 text-[0.65rem] leading-tight text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Kunjungan */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
            <h4 className="text-sm font-semibold text-gray-900">Riwayat kunjungan</h4>
            <span className="text-[0.65rem] text-gray-400">{visits.length} catatan</span>
          </div>

          {visits.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[0.62rem] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Tanggal</th>
                    <th className="px-3 py-2 font-semibold">Masuk</th>
                    <th className="px-3 py-2 font-semibold">Keluar</th>
                    <th className="px-3 py-2 font-semibold">Durasi</th>
                    <th className="px-4 py-2 font-semibold">Keperluan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visits.map((visit) => {
                    const dur = duration(visit.check_in, visit.check_out);
                    return (
                      <tr key={visit.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2.5 text-gray-700">
                          {visit.check_in ? formatShortDate(visit.check_in) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {visit.check_in?.split(' ')[1] ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {visit.check_out?.split(' ')[1] ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{dur ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{visit.purpose ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">Belum ada catatan kunjungan.</p>
              <p className="mx-auto mt-1.5 max-w-md text-[0.7rem] leading-relaxed text-gray-400">
                Kunjungan tercatat saat Anda meminjam loker atau tas di meja layanan. Bila Anda masuk
                tanpa meminjam loker, petugas mencatatnya secara manual dan belum tentu tersalin ke
                sini.
              </p>
            </div>
          )}
        </div>

        {/* Loker & tas */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
            <h4 className="text-sm font-semibold text-gray-900">Loker & tas</h4>
            <span className="text-[0.65rem] text-gray-400">{lockers.length} catatan</span>
          </div>

          {lockers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[0.62rem] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Kode</th>
                    <th className="px-3 py-2 font-semibold">Jenis</th>
                    <th className="px-3 py-2 font-semibold">Pinjam</th>
                    <th className="px-3 py-2 font-semibold">Kembali</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lockers.map((row) => {
                    const open = !row.returned_at;
                    return (
                      <tr key={row.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{row.code ?? '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {row.kind === 'bag' ? 'Tas' : 'Loker'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {row.borrowed_at ? formatShortDate(row.borrowed_at) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {row.returned_at ? formatShortDate(row.returned_at) : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[0.58rem] font-semibold ${
                              open ? 'bg-primary-100 text-primary-700' : 'bg-accent-50 text-accent-700'
                            }`}
                          >
                            {open ? 'Masih dipakai' : 'Dikembalikan'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">Belum ada catatan loker atau tas.</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 border-l-[3px] border-l-accent-500 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">Catatan</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Jam keluar dihitung dari waktu pengembalian loker/tas. Sistem perpustakaan belum mencatat
            jam keluar secara terpisah, sehingga kunjungan tanpa peminjaman loker hanya menampilkan
            jam masuk.
          </p>
          <Link
            href="/lokasi"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
          >
            Lihat jam layanan
          </Link>
        </div>
      </div>
    </div>
  );
}
