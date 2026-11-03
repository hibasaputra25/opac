import { BookCard, estimateCardHeight } from './book-card';

type Book = React.ComponentProps<typeof BookCard>['book'];

/**
 * Grid katalog.
 *
 * - **Mobile (<768px): 2 kolom** memakai CSS multi-column, jadi tidak ada
 *   ruang kosong di bawah kartu pendek yang bersebelahan dengan kartu tinggi.
 * - **Tablet & desktop (≥768px): 4 kolom masonry** — kolom independen yang
 *   diisi sampai penuh, jadi tidak ada ruang menganga di dasar halaman.
 *
 * ## Kenapa bukan CSS columns / grid biasa
 *
 * Tinggi kartu mengikuti rasio sampul, jadi setiap kartu berbeda tinggi.
 * Pendekatan `columns` menyamakan *tinggi* kolom, bukan mengisi ruang: kolom
 * yang lebih tinggi berhenti lebih awal dan menyisakan gap di dasar halaman
 * meski satu kartu lagi sebenarnya masih muat.
 *
 * Karena itu pembagian kolom dihitung di server memakai `estimateCardHeight`:
 * greedy, lalu disempurnakan dengan uji tukar kartu sampai selisih tinggi
 * kolom tinggal beberapa piksel.
 *
 * Trade-off yang diterima: urutan baca jadi per-kolom (atas→bawah, lalu kolom
 * berikutnya), bukan per-baris.
 */
const COLUMNS = 4;
const GAP = 16;
/** Lebar kolom utama halaman (lihat layout publik: `max-w-6xl`). */
const CONTAINER_WIDTH = 1152;

type Layout = { columns: Book[][]; heights: number[] };
type Swap = { a: number; b: number; ia: number; ib: number };

/** Terapkan satu pertukaran kartu antar dua kolom. */
function applySwap(columns: Book[][], heights: number[], weight: (b: Book) => number, s: Swap) {
  const cardA = columns[s.a][s.ia];
  const cardB = columns[s.b][s.ib];
  columns[s.a][s.ia] = cardB;
  columns[s.b][s.ib] = cardA;
  heights[s.a] += weight(cardB) - weight(cardA);
  heights[s.b] += weight(cardA) - weight(cardB);
}

/**
 * Cari dua pertukaran (pada pasangan kolom berbeda) yang bila diterapkan
 * bersama-sama memperkecil selisih tinggi kolom. Mengembalikan null bila tidak ada.
 */
function findDoubleSwap(
  columns: Book[][],
  heights: number[],
  weight: (b: Book) => number,
  spread: (h?: number[]) => number,
): [Swap, Swap] | null {
  const current = spread();
  const candidates: { swap: Swap; impact: number[] }[] = [];

  for (let a = 0; a < COLUMNS; a += 1) {
    for (let b = a + 1; b < COLUMNS; b += 1) {
      for (let ia = 0; ia < columns[a].length; ia += 1) {
        for (let ib = 0; ib < columns[b].length; ib += 1) {
          const delta = weight(columns[a][ia]) - weight(columns[b][ib]);
          if (delta === 0) continue;
          const impact = Array<number>(COLUMNS).fill(0);
          impact[a] = -delta;
          impact[b] = delta;
          candidates.push({ swap: { a, b, ia, ib }, impact });
        }
      }
    }
  }

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const s1 = candidates[i].swap;
      const s2 = candidates[j].swap;
      // Jangan pakai kartu yang sama dua kali.
      if (s1.a === s2.a && s1.ia === s2.ia) continue;
      if (s1.b === s2.b && s1.ib === s2.ib) continue;

      const trial = heights.map((_, k) => heights[k] + candidates[i].impact[k] + candidates[j].impact[k]);
      if (spread(trial) < current - 0.5) return [s1, s2];
    }
  }

  return null;
}

function splitColumns(books: Book[], columnWidth: number): Layout {
  const heights = Array<number>(COLUMNS).fill(0);
  const columns: Book[][] = Array.from({ length: COLUMNS }, () => []);
  const weight = (book: Book) => estimateCardHeight(book, columnWidth) + GAP;

  // Halaman terakhir sering hanya berisi beberapa kartu. Bila jumlahnya tidak
  // habis dibagi rata ke 4 kolom, sebar seling-seling (kartu ke-i masuk kolom
  // i mod 4) supaya tidak ada kolom yang jauh lebih kosong.
  if (books.length % COLUMNS !== 0 || books.length < COLUMNS * 2) {
    books.forEach((book, index) => {
      columns[index % COLUMNS].push(book);
      heights[index % COLUMNS] += weight(book);
    });
    return { columns, heights };
  }

  // Langkah 1: greedy — setiap kartu masuk ke kolom terpendek.
  for (const book of books) {
    let target = 0;
    for (let i = 1; i < COLUMNS; i += 1) {
      if (heights[i] < heights[target]) target = i;
    }
    columns[target].push(book);
    heights[target] += weight(book);
  }

  // Langkah 2: penyempurnaan. Tukar sepasang kartu antar dua kolom bila selisih
  // tinggi total kolom menyusut. Satu kartu jauh lebih tinggi daripada sisa
  // ruang yang tersedia, sehingga greedy saja menyisakan selisih ~200 px.
  //
  // Perulangan dibatasi dan selalu memilih perbaikan terbaik pada satu putaran,
  // jadi hasilnya deterministik: masukan sama → keluaran sama.
  const spread = (h: number[] = heights) => Math.max(...h) - Math.min(...h);

  for (let pass = 0; pass < 30; pass += 1) {
    let best: { a: number; b: number; ia: number; ib: number; spread: number } | null = null;

    for (let a = 0; a < COLUMNS; a += 1) {
      for (let b = a + 1; b < COLUMNS; b += 1) {
        for (let ia = 0; ia < columns[a].length; ia += 1) {
          for (let ib = 0; ib < columns[b].length; ib += 1) {
            const cardA = columns[a][ia];
            const cardB = columns[b][ib];
            const delta = weight(cardA) - weight(cardB);
            if (delta === 0) continue;

            const trial = [...heights];
            trial[a] -= delta;
            trial[b] += delta;
            const trialSpread = spread(trial);

            if (trialSpread < spread() - 0.5 && (!best || trialSpread < best.spread)) {
              best = { a, b, ia, ib, spread: trialSpread };
            }
          }
        }
      }
    }

    if (!best) {
      // Tukar 1-1 sudah mentok. Sisa selisih biasanya butuh menukar dua pasang
      // kartu sekaligus (A↔B dan C↔D) agar totalnya saling menutup.
      const pair = findDoubleSwap(columns, heights, weight, spread);
      if (!pair) break;
      applySwap(columns, heights, weight, pair[0]);
      applySwap(columns, heights, weight, pair[1]);
      continue;
    }

    const { a, b, ia, ib } = best;
    const cardA = columns[a][ia];
    const cardB = columns[b][ib];
    columns[a][ia] = cardB;
    columns[b][ib] = cardA;
    heights[a] += weight(cardB) - weight(cardA);
    heights[b] += weight(cardA) - weight(cardB);
  }

  // Urutan kartu di dalam kolom dipertahankan sesuai kemunculan aslinya agar
  // hasil pencarian tidak tampak acak.
  const order = new Map(books.map((book, index) => [book.id, index]));
  for (const column of columns) {
    column.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0));
  }

  return { columns, heights };
}

export function CatalogGrid({ books }: { books: Book[] }) {
  // Kolom masonry selebar ~1/4 wadah. Di layar lebih kecil nilainya meleset,
  // tetapi hanya memengaruhi keseimbangan kolom — bukan kebenaran tampilan.
  const columnWidth = (CONTAINER_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;
  const { columns } = splitColumns(books, columnWidth);

  return (
    <>
      {/*
        Mobile: 2 kolom independen (CSS multi-column), bukan `grid`.
        Grid menyamakan tinggi baris, sehingga kartu pendek yang bersebelahan
        dengan kartu tinggi menyisakan ruang kosong di bawahnya. Dengan kolom
        independen setiap kartu langsung diikuti kartu berikutnya.
      */}
      <div className="columns-2 [column-gap:0.75rem] md:hidden">
        {books.map((book) => (
          <div key={book.id} className="mb-3 break-inside-avoid">
            <BookCard book={book} />
          </div>
        ))}
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-4 md:items-start">
        {columns.map((column, index) => (
          <div key={index} className="flex flex-col gap-4">
            {column.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
