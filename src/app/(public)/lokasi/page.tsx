import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocations } from '@/lib/queries';

export const metadata: Metadata = { title: 'Lokasi Perpustakaan' };
export const dynamic = 'force-dynamic';

const SCHEDULE = [
  { day: 'Senin – Jumat', hours: '08.00 – 16.00 WIB' },
  { day: 'Sabtu', hours: '08.00 – 16.00 WIB' },
  { day: 'Minggu & hari libur', hours: 'Tutup' },
];

export default function LocationsPage() {
  const locations = getLocations();

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Lokasi Perpustakaan</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Layanan perpustakaan tersedia di beberapa kampus Universitas Mercu Buana.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {locations.map((location) => (
          <article key={location.id} className="rounded-xl border border-gray-300">
            <div className="rounded-t-lg bg-primary-500 px-4 py-3 text-white">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/60">
                Kampus {location.campus ?? '—'}
              </p>
              <h4 className="mt-0.5 text-sm font-bold">{location.name}</h4>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
                <span>{location.address ?? 'Jl. Meruya Selatan No.1, Kembangan, Jakarta Barat'}</span>
              </div>

              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-400">
                  Jam Layanan
                </p>
                <dl className="mt-1 space-y-1 text-xs">
                  {SCHEDULE.map((row) => (
                    <div key={row.day} className="flex justify-between gap-2">
                      <dt className="text-gray-500">{row.day}</dt>
                      <dd className="text-gray-700">{row.hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <p className="border-t border-gray-200 pt-2 text-[0.7rem] text-gray-500">
                {location.book_count.toLocaleString('id-ID')} judul koleksi
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-accent-400 bg-accent-50/50 p-3 text-xs text-accent-700">
        Pastikan memeriksa lokasi eksemplar pada halaman detail koleksi sebelum datang, agar buku
        yang kamu cari benar-benar tersedia di lokasi tersebut.
      </div>

      <p className="mt-4 text-xs text-gray-400">
        <Link href="/panduan" className="text-primary-400 hover:underline">
          Panduan peminjaman
        </Link>
      </p>
    </div>
  );
}
