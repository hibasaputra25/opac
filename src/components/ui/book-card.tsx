import Link from 'next/link';

type Props = {
  id: number;
  title: string;
  authors?: string | null;
  subjects?: string | null;
  year?: number | null;
  /** Nama kolom dari query (snake_case). */
  cover_url?: string | null;
  cover_width?: number | null;
  cover_height?: number | null;
  /** Alias camelCase untuk kompatibilitas. */
  coverUrl?: string | null;
  availableCount?: number;
  totalCount?: number;
};

/**
 * Palet sampul pengganti. Variasinya lebih beragam agar daftar tidak monoton,
 * tetap dalam keluarga warna UMB (biru, hijau, netral) ditambah beberapa
 * nuansa hangat dan dingin sebagai pembeda antar kartu.
 */
const COVER_TONES = [
  ['#0B419E', '#1062ED'],
  ['#0A3578', '#2F6BF5'],
  ['#0B419E', '#3D7BEE'],
  ['#082A5E', '#1062ED'],
  ['#121212', '#3D3D3E'],
  ['#2E870E', '#4AD319'],
  ['#0D5B6B', '#14919B'],
  ['#3B3B98', '#5A5AC9'],
  ['#6B3FA0', '#9B6FD1'],
  ['#8A3B4A', '#C2586B'],
  ['#8A5A1E', '#C98A2E'],
  ['#2F4F4F', '#4E7A7A'],
  ['#1E3A5F', '#3E6E9E'],
  ['#4A3B1E', '#8A7038'],
];

function tone(seed: number) {
  return COVER_TONES[Math.abs(seed) % COVER_TONES.length];
}

/**
 * Lebar/tinggi area sampul.
 *
 * Rasio asli berkas gambar dipakai apa adanya supaya sampul tidak menyisakan
 * ruang kosong, tetapi dibatasi agar tidak merusak grid: rasio sangat lebar
 * (mis. 1,9:1) akan membuat kartu pendek dan melebar, sedangkan sampul yang
 * sangat jangkung membuat satu kartu mendominasi kolom.
 *
 * Batas diambil dari sebaran data: 94% sampul berada di 0,63–1,00, median 0,70.
 */
export const RATIO_MIN = 0.62;
export const RATIO_MAX = 1.12;

/** Rasio sampul yang dipakai untuk buku tanpa gambar sampul. */
export const RATIO_FALLBACK = 3 / 4;

/**
 * Lebar/tinggi area sampul untuk satu buku. Diekspor agar pengatur tata letak
 * (mis. CatalogGrid) bisa menghitung tinggi kartu tanpa mencbak.
 */
export function coverAspectRatio(book: {
  cover_width?: number | null;
  cover_height?: number | null;
}) {
  const w = book.cover_width ?? 0;
  const h = book.cover_height ?? 0;
  const raw = w > 0 && h > 0 ? w / h : RATIO_FALLBACK;
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, raw));
}

/**
 * Tinggi total kartu dalam piksel bila lebarnya `width` piksel.
 *
 * Angka 68 px adalah tinggi blok keterangan (padding, judul, pengarang, baris
 * tahun) menurut literal ukuran di bawah; galat ±beberapa piksel tidak masalah
 * karena hanya dipakai untuk menyeimbangkan kolom.
 */
export function estimateCardHeight(
  book: {
    title?: string | null;
    subjects?: string | null;
    cover_width?: number | null;
    cover_height?: number | null;
  },
  width: number,
) {
  const cover = width / coverAspectRatio(book);
  const hasSubject = Boolean(book.subjects?.split(' ; ').filter(Boolean)[0]);
  const titleLines = Math.min(2, Math.max(1, Math.ceil((book.title ?? '').length / 42)));
  return cover + 68 + (hasSubject ? 24 : 0) + (titleLines - 1) * 18;
}

/**
 * Kartu koleksi adaptif (pola katalog Jaklitera).
 *
 * Tinggi area sampul mengikuti rasio asli gambar sampul (lihat `coverRatio`),
 * sehingga setiap kartu punya tinggi berbeda. Buku tanpa sampul memakai rasio
 * 3:4 standar.
 */
export function BookCard({ book }: { book: Props }) {
  const [from, to] = tone(book.id);
  const subject = book.subjects?.split(' ; ').filter(Boolean)[0] ?? null;
  const available = book.availableCount ?? 0;
  const total = book.totalCount ?? 0;
  const cover = book.cover_url ?? book.coverUrl ?? null;
  const ratio = coverAspectRatio(book);

  return (
    <Link
      href={`/koleksi/${book.id}`}
      className="group block w-full overflow-hidden rounded-lg border border-gray-200 bg-white transition duration-200 hover:border-primary-300 hover:shadow-lift"
    >
      {/* Sampul — tinggi mengikuti rasio asli gambar */}
      <div
        className="relative w-full overflow-hidden bg-gray-100"
        style={{ aspectRatio: `${ratio}` }}
      >
        {cover ? (
          // Sampul asli dari katalog, ditampilkan penuh tanpa terpotong.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={`Sampul ${book.title}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col justify-between p-3"
            style={{ backgroundImage: `linear-gradient(150deg, ${from}, ${to})` }}
            aria-hidden="true"
          >
            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/55">
              Perpustakaan UMB
            </span>
            <span className="line-clamp-3 text-[0.8rem] font-bold leading-snug text-white/95">
              {book.title}
            </span>
          </div>
        )}

        {total > 0 && (
          <span
            className={`absolute right-2 top-2 flex items-center gap-1 rounded px-2 py-1 text-[0.6rem] font-bold shadow-sm ${
              available > 0 ? 'bg-white text-accent-700' : 'bg-white/90 text-gray-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                available > 0 ? 'bg-accent-500' : 'bg-gray-400'
              }`}
            />
            {available > 0 ? `${available} tersedia` : 'Dipinjam'}
          </span>
        )}
      </div>

      {/* Keterangan */}
      <div className="p-3">
        {subject && (
          <span className="mb-1.5 block w-fit max-w-full truncate rounded bg-primary-100 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-primary-700">
            {subject}
          </span>
        )}

        <h3 className="line-clamp-2 text-[0.82rem] font-bold leading-snug text-gray-900 group-hover:text-primary-600">
          {book.title}
        </h3>

        <p className="mt-1 line-clamp-1 text-[0.7rem] text-gray-500">
          {book.authors ?? 'Tanpa pengarang'}
        </p>

        <div className="mt-2 flex items-center justify-between text-[0.62rem] text-gray-400">
          <span>{book.year ?? '—'}</span>
          {total > 0 && <span>{total} eks.</span>}
        </div>
      </div>
    </Link>
  );
}
