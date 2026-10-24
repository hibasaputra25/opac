import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Perpustakaan Universitas Mercu Buana',
    template: '%s | Perpustakaan UMB',
  },
  description:
    'Katalog online Perpustakaan Universitas Mercu Buana. Telusuri koleksi buku, cek ketersediaan eksemplar, dan lihat riwayat peminjaman.',
  keywords: ['perpustakaan', 'UMB', 'Mercu Buana', 'OPAC', 'katalog', 'buku'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
