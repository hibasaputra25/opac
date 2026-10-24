import { redirect } from 'next/navigation';

/**
 * Ringkasan keanggotaan kini digabung ke halaman Profil.
 * Rute lama dipertahankan sebagai pengalihan agar tautan lama tetap bekerja.
 */
export default function AccountIndexPage() {
  redirect('/akun/profil');
}
