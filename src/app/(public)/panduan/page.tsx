import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Panduan & Bantuan' };

const STEPS = [
  {
    title: '1. Telusuri katalog',
    body: 'Gunakan kolom pencarian untuk mencari berdasarkan judul, pengarang, subjek, atau ISBN. Persempit hasil dengan filter lokasi, bidang, subjek, dan ketersediaan.',
  },
  {
    title: '2. Periksa ketersediaan',
    body: 'Pada halaman detail koleksi, lihat bagian “Tersedia di”. Status “Tersedia” berarti eksemplar berada di lokasi tersebut.',
  },
  {
    title: '3. Keranjang',
    body: 'Masuk ke akun anggota, lalu tekan “Tambahkan ke keranjang”. Maksimal 3 buku sekaligus dan berlaku 2 hari.',
  },
  {
    title: '4. Ambil di meja layanan',
    body: 'Datang ke meja layanan maksimal 2 hari setelah keranjang, lalu sebutkan nomor anggota Anda agar pustakawan memproses peminjaman.',
  },
];

const FAQ = [
  {
    q: 'Apakah saya bisa meminjam buku langsung dari katalog ini?',
    a: 'Anda dapat menambahkan ke keranjang buku lewat katalog ini. Pengambilan dan pencatatan peminjaman dilakukan di meja layanan perpustakaan.',
  },
  {
    q: 'Berapa lama keranjang berlaku?',
    a: 'Keranjang berlaku 2 hari sejak dibuat. Bila tidak diambil, buku otomatis tersedia kembali untuk pemustaka lain.',
  },
  {
    q: 'Berapa jumlah buku yang boleh di keranjang?',
    a: 'Maksimal 3 buku dalam satu waktu. Batalkan salah satu keranjang bila ingin menambahkan ke keranjang judul lain.',
  },
  {
    q: 'Bagaimana cara melihat riwayat peminjaman saya?',
    a: 'Masuk ke akun, lalu buka menu Peminjaman. Anda juga bisa mencari judul tertentu pada kolom pencarian riwayat.',
  },
  {
    q: 'Apakah data riwayat saya selalu terbaru?',
    a: 'Riwayat diperbarui berkala oleh petugas perpustakaan. Bila ada ketidaksesuaian, hubungi petugas di meja layanan.',
  },
  {
    q: 'Apakah saya bisa mengusulkan buku baru?',
    a: 'Bisa. Gunakan menu Usul Buku. Sertakan judul, pengarang, dan ISBN agar usulan lebih mudah diproses.',
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      <h3 className="text-lg font-bold lg:text-xl">Panduan</h3>
      <p className="mt-1 text-xs text-gray-500 lg:text-sm">
        Cara menelusuri koleksi dan meminjam buku di Perpustakaan Universitas Mercu Buana.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {STEPS.map((step) => (
          <div key={step.title} className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-primary-600">{step.title}</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{step.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h4 className="text-base font-bold text-gray-800 lg:text-lg">
          Pertanyaan yang Sering Diajukan
        </h4>
        <div className="mt-3 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-xl border border-gray-200">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-800 marker:content-none">
                {item.q}
                <span className="text-primary-500 transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="border-t border-gray-100 px-4 py-3 text-xs leading-relaxed text-gray-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-gray-200 border-l-[3px] border-l-accent-500 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">Siap meminjam buku?</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Keranjang dari katalog, lalu ambil di meja layanan perpustakaan.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/katalog"
            className="rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
          >
            Telusuri katalog
          </Link>
          <Link
            href="/lokasi"
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Lokasi layanan
          </Link>
          <Link
            href="/usul-buku"
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Usul buku
          </Link>
        </div>
      </div>
    </div>
  );
}
