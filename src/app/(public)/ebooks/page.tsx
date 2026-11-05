import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'E-Books — Katalog Online Perpustakaan UMB',
  description:
    'Akses koleksi e-book Perpustakaan Universitas Mercu Buana melalui platform ProQuest Ebook Central, EBSCO, dan Cambridge Core.',
};

/**
 * Platform akses e-book berlangganan UMB. Halaman ini portal tautan, bukan
 * daftar judul — koleksi digital dikelola di platform masing-masing.
 */
const PLATFORMS = [
  {
    name: 'Ebooks ProQuest',
    url: 'https://ebookcentral.proquest.com/lib/mercubuana',
    description:
      'Koleksi e-book terlengkap: bisnis, ekonomi, komputer, teknik, ilmu sosial, dan lainnya.',
  },
  {
    name: 'Ebooks EBSCO',
    url: 'http://research.ebsco.com',
    description:
      'E-book akademik lintas disiplin dari penerbit universitas dan asosiasi ilmiah.',
  },
  {
    name: 'Ebooks Cambridge',
    url: 'https://www.cambridge.org/core',
    description:
      'Jurnal dan e-book penerbit Cambridge University Press. Hanya bisa diakses dari jaringan kampus.',
  },
];

const NOTES = [
  { text: 'Link lengkap tersedia di web Perpus laman: ', link: 'https://bit.ly/eres-umb' },
  { text: 'Panduan akses klik laman: ', link: 'https://bit.ly/pandu-eres' },
  { text: 'Ebooks Cambridge hanya bisa diakses dari jaringan kampus.' },
  {
    text: 'Semua User dan Password dimohon tidak dipublish di internet atau media terbuka (facebook, X, website, blog, atau sejenisnya).',
  },
  {
    text: 'Cp.: 0823-1123-2229 (Meruya), 0852-1954-2943 (Menteng), 0821-359-359-55 (Warung Buncit).',
  },
];

export default function EbooksPage() {
  return (
    <div className="min-h-screen">
      {/* Judul */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">E-Books</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
          Perpustakaan Universitas Mercu Buana berlangganan beberapa platform
          e-book internasional. Masuk menggunakan akun yang diberikan
          perpustakaan, atau akses langsung dari jaringan kampus.
        </p>
      </div>

      {/* Kartu platform */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => (
          <a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary-400 hover:shadow-lift"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-700 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="3" width="16" height="18" rx="2.5" />
                  <path d="M8 7.5h8M8 11h8M8 14.5h4" />
                </svg>
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-bold text-gray-900 group-hover:text-primary-600">
              {platform.name}
            </h2>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-gray-500">
              {platform.description}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-lg bg-primary-500 px-3.5 py-2 text-xs font-semibold text-white transition group-hover:bg-primary-600">
              Kunjungi Platform
            </span>
          </a>
        ))}
      </div>

      {/* Catatan penting */}
      <div className="mt-4 rounded-xl border border-gray-200 border-l-[3px] border-l-accent-500 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Perhatian</h2>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-600">
          {NOTES.map((note, index) => (
            <li key={index} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
              <span>
                {note.text}
                {note.link && (
                  <a
                    href={note.link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary-600 hover:underline"
                  >
                    {note.link}
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
