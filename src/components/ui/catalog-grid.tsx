import { BookCard } from './book-card';

type Book = React.ComponentProps<typeof BookCard>['book'];

/**
 * Grid katalog bergaya Jaklitera dengan tinggi kolom seimbang.
 *
 * Masalah sebelumnya: kartu terakhir dipaksa memanjang (`flex-1`) agar garis
 * bawah rata. Bila judulnya pendek, kartu terlihat aneh dan dipaksakan.
 *
 * Solusi sekarang — tiga langkah, tanpa memanjangkan kartu:
 *
 * 1. **Distribusi berdasarkan tinggi.** Setiap kartu diperkirakan tingginya
 *    (jumlah baris judul + ada/tidaknya chip subjek), lalu ditempatkan ke
 *    kolom dengan total terkecil (algoritma greedy).
 *
 * 2. **Tukar-silang satu kartu.** Bila masih ada selisih, satu kartu pada
 *    kolom tertinggi ditukar dengan satu kartu pada kolom terendah jika itu
 *    memperkecil selisih. Ini menekan selisih dari ~36px menjadi ~18px.
 *
 * 3. **Kartu terakhir didorong ke dasar kolom** (`mt-auto`), bukan
 *    dipanjangkan. Kartu tetap berukuran natural; sisa ruang menjadi celah
 *    tipis di atas kartu terakhir sehingga garis bawah grid sejajar.
 */

/** Perkiraan tinggi kartu. Angka mengikuti padding & ukuran font di BookCard. */
function estimateHeight(book: Book) {
  const hasSubject = Boolean(book.subjects?.split(' ; ').filter(Boolean)[0]);
  const title = book.title ?? '';

  // Lebar kolom desktop ~270px, font judul 0.82rem, ±42 karakter per baris.
  const titleLines = Math.min(2, Math.max(1, Math.ceil(title.length / 42)));

  // 68 = padding + pengarang + baris meta; 24 = chip subjek; 18 = baris judul tambahan
  return 68 + (hasSubject ? 24 : 0) + (titleLines - 1) * 18;
}

function spread(heights: number[]) {
  return Math.max(...heights) - Math.min(...heights);
}

function distribute(books: Book[], columnCount: number) {
  const heights = Array<number>(columnCount).fill(0);
  const columns: Book[][] = Array.from({ length: columnCount }, () => []);

  // Langkah 1: greedy berdasarkan tinggi
  for (const book of books) {
    let target = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (heights[i] < heights[target]) target = i;
    }
    columns[target].push(book);
    heights[target] += estimateHeight(book);
  }

  // Langkah 2: tukar-silang satu kartu bila memperkecil selisih
  let bestSpread = spread(heights);
  let bestColumns = columns;
  let bestHeights = heights;

  for (let a = 0; a < columnCount; a += 1) {
    for (let b = a + 1; b < columnCount; b += 1) {
      for (const bookA of columns[a]) {
        for (const bookB of columns[b]) {
          const delta = estimateHeight(bookA) - estimateHeight(bookB);
          const trial = [...heights];
          trial[a] -= delta;
          trial[b] += delta;
          const trialSpread = spread(trial);
          if (trialSpread < bestSpread) {
            bestSpread = trialSpread;
            const nextColumns = columns.map((column) => [...column]);
            nextColumns[a] = nextColumns[a].filter((item) => item.id !== bookA.id);
            nextColumns[b] = nextColumns[b].filter((item) => item.id !== bookB.id);
            nextColumns[a].push(bookB);
            nextColumns[b].push(bookA);
            bestColumns = nextColumns;
            bestHeights = trial;
          }
        }
      }
    }
  }

  return { columns: bestColumns, heights: bestHeights };
}

export function CatalogGrid({ books }: { books: Book[] }) {
  const COLUMNS = 4;
  const { columns } = distribute(books, COLUMNS);
  const visibleColumns = columns.filter((column) => column.length > 0);

  return (
    <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-4 md:gap-4">
      {visibleColumns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex h-full flex-col gap-3 md:gap-4">
          {column.map((book, index) => {
            const isLast = index === column.length - 1;
            return (
              <div key={book.id} className={isLast ? 'mt-auto' : undefined}>
                <BookCard book={book} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
