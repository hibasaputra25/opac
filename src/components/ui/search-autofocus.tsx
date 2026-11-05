'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Membuat kotak pencarian langsung siap diketik tanpa klik:
 * - fokus otomatis saat halaman dibuka (kecuali pengguna sudah memfokuskan
 *   elemen lain, mis. membuka halaman dengan anchor),
 * - tombol "/" memfokuskan kotak pencarian dari mana pun (kebiasaan umum di
 *   mesin pencari & katalog), lalu Escape mengembalikan fokus.
 *
 * Tidak memakai atribut autoFocus agar tidak bentrok bila halaman punya lebih
 * dari satu input pencarian (mis. sidebar kanan).
 *
 * `exceptPaths` dipakai input sekunder: sidebar tidak perlu merebut fokus pada
 * halaman yang sudah punya kotak pencarian utama.
 */
export function SearchAutofocus({
  inputId,
  exceptPaths = [],
}: {
  inputId: string;
  exceptPaths?: string[];
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (exceptPaths.includes(pathname)) return;

    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;

    // Fokus awal: hanya bila belum ada elemen yang aktif dan perangkat punya
    // keyboard (menghindari keyboard virtual langsung terbuka di ponsel).
    const canAutofocus =
      document.activeElement === document.body &&
      window.matchMedia('(min-width: 768px)').matches;
    if (canAutofocus) input.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        input.focus();
        input.select();
      }

      if (event.key === 'Escape' && document.activeElement === input) {
        input.blur();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputId, pathname, exceptPaths]);

  return null;
}
