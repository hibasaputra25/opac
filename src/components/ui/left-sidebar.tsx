'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/actions/auth';

type NavItem = {
  href: string;
  label: string;
  badge?: string;
  /** Perlu login; bila belum masuk, halaman akan menampilkan popup login. */
  auth?: boolean;
  icon: React.ReactNode;
};

const ICON = 'h-[18px] w-[18px] shrink-0';

function icon(path: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={ICON}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

/**
 * Urutan menu mengikuti struktur yang sudah disepakati.
 * Menu bertanda `auth` tetap tampil saat belum login; halaman tujuan yang
 * menampilkan popup login, bukan sidebar yang menyembunyikannya.
 */
const NAV: NavItem[] = [
  {
    href: '/',
    label: 'Beranda',
    icon: icon(
      <>
        <path d="M3 10.5 12 3l9 7.5V21H3z" />
        <path d="M9.5 21v-6h5v6" />
      </>,
    ),
  },
  {
    href: '/katalog',
    label: 'Daftar Koleksi',
    badge: 'Baru',
    icon: icon(
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M8 7h7M8 11h5" />
      </>,
    ),
  },
  {
    href: '/akun/reservasi',
    label: 'Reservasi',
    auth: true,
    icon: icon(
      <>
        <path d="M6 6h15l-1.5 9h-12z" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M6 6 5 3H3" />
      </>,
    ),
  },
  {
    href: '/akun/peminjaman',
    label: 'Peminjaman',
    auth: true,
    icon: icon(
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="m9 11 2 2 4-4" />
      </>,
    ),
  },
  {
    href: '/akun/aktivitas',
    label: 'Aktivitas',
    auth: true,
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>,
    ),
  },
  {
    href: '/akun/favorit',
    label: 'Buku Favorit',
    auth: true,
    icon: icon(<path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7 3.1c0 4.9-7 9.3-7 9.3Z" />),
  },
  {
    href: '/akun/profil',
    label: 'Profil',
    auth: true,
    icon: icon(
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 21c0-3.6 3.4-6.2 7.5-6.2s7.5 2.6 7.5 6.2" />
      </>,
    ),
  },
  {
    href: '/lokasi',
    label: 'Lokasi',
    icon: icon(
      <>
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </>,
    ),
  },
  {
    href: '/usul-buku',
    label: 'Usul Buku',
    icon: icon(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />),
  },
  {
    href: '/panduan',
    label: 'Panduan',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.3M12 17h.01" />
      </>,
    ),
  },
];

export function LeftSidebar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-1/6 flex-col overflow-y-auto border-r border-gray-200 bg-white px-3 py-6 lg:flex">
      {/* Logo resmi UMB di dalam kotak biru kecil + nama katalog */}
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-700 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-umb-putih.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
          />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-base font-extrabold tracking-tight text-gray-900">
            Katalog Online
          </span>
          <span className="block truncate text-[0.62rem] font-medium text-gray-500">
            Universitas Mercu Buana
          </span>
        </span>
      </Link>

      <nav className="mt-7 flex flex-col gap-1" aria-label="Navigasi utama">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? 'bg-primary-100 font-semibold text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span
                className={active ? 'text-primary-500' : 'text-gray-400 group-hover:text-primary-500'}
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="hidden rounded bg-accent-500 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase leading-none tracking-wide text-white xl:block">
                  {item.badge}
                </span>
              )}
              {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-5">
        {isLoggedIn ? (
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <span className="text-gray-400">
                {icon(
                  <>
                    <path d="M15 17l5-5-5-5" />
                    <path d="M20 12H9" />
                    <path d="M12 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                  </>,
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">Keluar</span>
            </button>
          </form>
        ) : (
          <Link
            href="/akun/profil"
            className="flex items-center gap-2.5 rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
          >
            <span className="text-white/80">
              {icon(
                <>
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M4.5 21c0-3.6 3.4-6.2 7.5-6.2s7.5 2.6 7.5 6.2" />
                </>,
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">Masuk</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
