import Link from 'next/link';
import { SearchAutofocus } from './search-autofocus';

/** Kartu info ringkas dengan garis aksen kiri — bukan blok warna penuh. */
function InfoCard({
  tone,
  title,
  body,
  cta,
}: {
  tone: 'accent' | 'primary';
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  const accent = tone === 'accent' ? 'border-l-accent-500' : 'border-l-primary-500';
  const dot = tone === 'accent' ? 'bg-accent-500' : 'bg-primary-500';
  const link =
    tone === 'accent'
      ? 'text-accent-700 hover:bg-accent-50'
      : 'text-primary-600 hover:bg-primary-50';

  return (
    <div className={`rounded-xl border border-gray-200 border-l-[3px] bg-white p-3 ${accent}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-xl ${dot}`} />
        <h3 className="text-[0.72rem] font-bold uppercase tracking-wide text-gray-700">{title}</h3>
      </div>
      <p className="mt-1.5 text-[0.72rem] leading-relaxed text-gray-500">{body}</p>
      <Link
        href={cta.href}
        className={`mt-2 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[0.68rem] font-semibold ${link}`}
      >
        {cta.label}
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

export function RightSidebar() {
  return (
    <aside className="scroll-container fixed right-0 top-0 z-10 hidden h-screen w-1/6 flex-col gap-3 overflow-y-auto border-l border-gray-200 bg-white p-4 lg:flex">
      <SearchAutofocus inputId="sidebar-search" exceptPaths={['/katalog']} />
      <form action="/katalog" className="w-full">
        <label htmlFor="sidebar-search" className="sr-only">
          Cari koleksi
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="sidebar-search"
            name="q"
            type="search"
            placeholder="Cari judul, pengarang, ISBN"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-[0.72rem] text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none"
          />
        </div>
      </form>

      <InfoCard
        tone="accent"
        title="Jadwal Layanan"
        body="Lihat jam buka dan lokasi layanan perpustakaan."
        cta={{ href: '/lokasi', label: 'Lihat jadwal' }}
      />

      <InfoCard
        tone="primary"
        title="Usul Buku"
        body="Koleksi yang Anda cari belum ada? Sampaikan usulan Anda."
        cta={{ href: '/usul-buku', label: 'Usul buku' }}
      />

      <div>
        <h3 className="mb-2 text-[0.72rem] font-bold uppercase tracking-wide text-gray-500">
          Bahasa
        </h3>
        <div className="grid grid-cols-2 gap-1.5 text-[0.7rem]">
          <span className="flex items-center justify-center gap-1 rounded-lg border border-primary-500 bg-primary-500/10 py-1.5 font-semibold text-primary-600">
            <span aria-hidden="true">🇮🇩</span> ID
          </span>
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 text-gray-500">
            <span aria-hidden="true">🇬🇧</span> EN
          </span>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 text-[0.72rem] font-bold uppercase tracking-wide text-gray-500">
          Hubungi Kami
        </h3>
        <div className="space-y-1.5">
          <a
            href="mailto:perpustakaan@mercubuana.ac.id"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[0.7rem] text-gray-600 hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m3.5 7 8.5 6 8.5-6" />
            </svg>
            Email
          </a>
          <a
            href="https://wa.me/6282311232229"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[0.7rem] text-gray-600 hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </aside>
  );
}
