'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const ICON = 'h-5 w-5';

/** Taskbar bawah: hanya 5 menu utama. Aktivitas lewat menu hamburger. */
const BOTTOM = [
  {
    href: '/',
    label: 'Beranda',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5V21H3z" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    ),
  },
  {
    href: '/katalog',
    label: 'Koleksi',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      </svg>
    ),
  },
  {
    href: '/akun/favorit',
    label: 'Favorit',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7 3.1c0 4.9-7 9.3-7 9.3Z" />
      </svg>
    ),
  },
  {
    href: '/akun/peminjaman',
    label: 'Pinjam',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="m9 11 2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/akun/profil',
    label: 'Profil',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 21c0-3.6 3.4-6.2 7.5-6.2s7.5 2.6 7.5 6.2" />
      </svg>
    ),
  },
];

const MENU = [
  ['/', 'Beranda'],
  ['/katalog', 'Daftar Koleksi'],
  ['/ebooks', 'E-Books'],
  ['/akun/keranjang', 'Keranjang'],
  ['/akun/peminjaman', 'Peminjaman'],
  ['/akun/aktivitas', 'Aktivitas'],
  ['/akun/favorit', 'Buku Favorit'],
  ['/akun/profil', 'Profil'],
  ['/lokasi', 'Lokasi'],
  ['/usul-buku', 'Usul Buku'],
  ['/panduan', 'Panduan'],
] as const;

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-700 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-umb-putih.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-tight text-gray-900">
              Katalog Online
            </span>
            <span className="block text-[0.58rem] font-medium text-gray-500">
              Universitas Mercu Buana
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-lg p-2 text-gray-600"
          aria-expanded={open}
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 px-4 py-3">
          <form action="/katalog" className="mb-3">
            <label htmlFor="mobile-q" className="sr-only">
              Cari koleksi
            </label>
            <input
              id="mobile-q"
              name="q"
              type="search"
              placeholder="Cari judul, pengarang, ISBN"
              autoFocus
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
            />
          </form>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {MENU.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <section className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white lg:hidden">
      <div className="grid grid-cols-5">
        {BOTTOM.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2 text-[0.62rem] ${
                active ? 'font-semibold text-primary-600' : 'text-gray-500'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}