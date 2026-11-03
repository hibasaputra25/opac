import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LoginGate } from '@/components/login-gate';
import { getActiveCart, getCart, countCartItems, cartDaysLeft, CART_MAX_ITEMS } from '@/lib/cart';
import { formatShortDate } from '@/lib/format';
import { CartList } from './cart-list';

export const metadata: Metadata = { title: 'Keranjang' };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginGate
        next="/akun/keranjang"
        title="Keranjang"
        description="Daftar buku yang Anda cadangkan sebelum diambil di meja layanan."
      />
    );
  }

  const all = getCart(user.id);
  const active = getActiveCart(user.id);
  const used = countCartItems(user.id);
  const history = all.filter((row) => row.status !== 'active');

  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Keranjang</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Cadangkan buku sebelum diambil di meja layanan. Berlaku 2 hari sejak keranjang dibuat.
      </p>

      <div className="mt-4 space-y-4">
        {/* Kuota */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-lg font-bold text-primary-600">
              {used}
              <span className="text-sm font-medium text-gray-400"> / {CART_MAX_ITEMS}</span>
            </p>
            <p className="mt-0.5 text-[0.65rem] leading-tight text-gray-500">Isi keranjang</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-lg font-bold text-primary-600">{history.length}</p>
            <p className="mt-0.5 text-[0.65rem] leading-tight text-gray-500">Riwayat keranjang</p>
          </div>
          <div className="col-span-2 rounded-lg border border-gray-200 border-l-[3px] border-l-accent-500 p-3 sm:col-span-1">
            <p className="text-xs leading-relaxed text-gray-600">
              Buku di keranjang yang tidak diambil dalam 2 hari otomatis dilepas dan bukunya tersedia kembali
              untuk pemustaka lain.
            </p>
          </div>
        </div>

        {/* Aktif */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
            <h4 className="text-sm font-semibold text-gray-900">Isi keranjang</h4>
            <span className="text-[0.65rem] text-gray-400">{active.length} buku</span>
          </div>

          {active.length ? (
            <ul className="divide-y divide-gray-100">
              {active.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/koleksi/${row.book_id}`}
                      className="line-clamp-2 text-sm font-medium text-gray-800 hover:text-primary-600"
                    >
                      {row.title}
                    </Link>
                    <p className="mt-0.5 text-[0.65rem] text-gray-400">
                      {row.authors ?? 'Tanpa pengarang'} · {row.location ?? 'Lokasi belum ditentukan'}
                      {row.barcode ? ` · ${row.barcode}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] font-semibold text-amber-700">
                      {cartDaysLeft(row.expires_at) === 0
                        ? 'Kedaluwarsa hari ini'
                        : `${cartDaysLeft(row.expires_at)} hari lagi`}
                    </p>
                    <p className="text-[0.6rem] text-gray-400">
                      s/d {formatShortDate(row.expires_at)}
                    </p>
                  </div>
                  <CartList id={row.id} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-500">Belum ada isi keranjang.</p>
              <Link
                href="/katalog"
                className="mt-3 inline-block rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
              >
                Telusuri katalog
              </Link>
            </div>
          )}
        </div>

        {/* Riwayat */}
        {history.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-2.5">
              <h4 className="text-sm font-semibold text-gray-900">Riwayat keranjang</h4>
            </div>
            <ul className="divide-y divide-gray-100">
              {history.map((row) => {
                const meta =
                  row.status === 'fulfilled'
                    ? { label: 'Terpenuhi', className: 'bg-accent-50 text-accent-700' }
                    : row.status === 'expired'
                      ? { label: 'Kedaluwarsa', className: 'bg-gray-100 text-gray-500' }
                      : { label: 'Dibatalkan', className: 'bg-gray-100 text-gray-500' };
                return (
                  <li key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/koleksi/${row.book_id}`}
                        className="line-clamp-1 text-sm font-medium text-gray-800 hover:text-primary-600"
                      >
                        {row.title}
                      </Link>
                      <p className="mt-0.5 text-[0.65rem] text-gray-400">
                        Diajukan {formatShortDate(row.created_at)}
                        {row.closed_at ? ` · selesai ${formatShortDate(row.closed_at)}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[0.58rem] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 border-l-[3px] border-l-primary-500 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">Cara mengambil buku</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-gray-500">
            <li>Keranjang dari halaman detail koleksi.</li>
            <li>Datang ke meja layanan maksimal 2 hari setelah keranjang.</li>
            <li>Sebutkan nomor anggota agar pustakawan memproses peminjaman.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
