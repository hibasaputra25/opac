import type { Metadata } from 'next';
import Link from 'next/link';
import { getRecentRequests } from '@/lib/queries';
import { REQUEST_STATUS, formatShortDate, statusToneClass } from '@/lib/format';
import { BookRequestForm } from './form';

export const metadata: Metadata = { title: 'Usul Buku' };
export const dynamic = 'force-dynamic';

export default function BookRequestPage() {
  const recent = getRecentRequests(6);

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Usul Buku</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Tidak menemukan buku yang kamu cari? Sampaikan usulanmu, tim pengembangan koleksi akan
        meninjau setiap usulan.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="rounded-xl border border-gray-300 p-4">
          <BookRequestForm />
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-gray-300 p-3">
            <h4 className="text-sm font-semibold text-gray-800">Usulan Terbaru</h4>
            <ul className="mt-2 divide-y divide-gray-200">
              {recent.length ? (
                recent.map((request) => {
                  const status = REQUEST_STATUS[request.status] ?? REQUEST_STATUS.new;
                  return (
                    <li key={request.id} className="py-2">
                      <p className="line-clamp-2 text-xs font-medium text-gray-700">{request.title}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[0.65rem] text-gray-400">
                          {formatShortDate(request.created_at)}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[0.6rem] ring-1 ${statusToneClass(status.tone)}`}>
                          {status.label}
                        </span>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="py-2 text-xs text-gray-500">Belum ada usulan.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-accent-400 bg-accent-50/50 p-3 text-xs text-accent-700">
            <p className="font-semibold">Tips agar usulan cepat diproses</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-relaxed">
              <li>Cantumkan judul lengkap dan pengarang</li>
              <li>Sertakan ISBN bila tersedia</li>
              <li>Jelaskan keterkaitan dengan mata kuliah</li>
            </ul>
          </div>
        </aside>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        <Link href="/panduan" className="text-primary-400 hover:underline">
          Baca panduan peminjaman
        </Link>
      </p>
    </div>
  );
}
