import Link from 'next/link';
import { LeftSidebar } from '@/components/ui/left-sidebar';
import { RightSidebar } from '@/components/ui/right-sidebar';
import { BottomNav, MobileHeader } from '@/components/ui/mobile-nav';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isLoggedIn = Boolean(user);

  return (
    <div className="relative flex min-h-screen">
      <MobileHeader />
      <LeftSidebar isLoggedIn={isLoggedIn} />

      <main className="mx-auto mb-16 mt-14 w-full p-4 lg:mb-0 lg:mt-0 lg:w-4/6">
        {children}

        <footer className="mt-12 hidden rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm lg:block">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-md">
              <p className="font-semibold text-gray-800">Perpustakaan Universitas Mercu Buana</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Pusat sumber belajar dan informasi yang mendukung pendidikan, penelitian, dan
                pengabdian masyarakat di lingkungan Universitas Mercu Buana.
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Jl. Meruya Selatan No.1, Kembangan, Jakarta Barat 11650
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-gray-500">
              <div className="space-y-1">
                <Link href="/katalog" className="block hover:text-primary-500">Daftar Koleksi</Link>
                <Link href="/lokasi" className="block hover:text-primary-500">Lokasi Perpustakaan</Link>
                <Link href="/usul-buku" className="block hover:text-primary-500">Usul Buku</Link>
              </div>
              <div className="space-y-1">
                <Link href="/usul-buku" className="block hover:text-primary-500">Usul Buku</Link>
                <Link href="/panduan" className="block hover:text-primary-500">Panduan</Link>
                <a href="https://www.mercubuana.ac.id" className="block hover:text-primary-500">
                  Universitas Mercu Buana
                </a>
              </div>
            </div>
          </div>
          <p className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-400">
            © {new Date().getFullYear()} Perpustakaan Universitas Mercu Buana. Seluruh hak cipta
            dilindungi.
          </p>
        </footer>
      </main>

      <RightSidebar />
      <BottomNav />
    </div>
  );
}
