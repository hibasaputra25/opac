# OPAC Perpustakaan Universitas Mercu Buana

Katalog online (OPAC) untuk Perpustakaan Universitas Mercu Buana, dibangun **dari awal**
(from scratch) — bukan pengembangan lanjutan dari OPAC lama
`digilib.mercubuana.ac.id/katalog_meruya`.

OPAC ini adalah **katalog baca-saja**: untuk menelusuri koleksi dan melihat riwayat
peminjaman. Proses sirkulasi (pinjam/kembali) tetap dilakukan di sistem **OLS UMB**
(`https://ols.mercubuana.ac.id`).

Identitas visual sepenuhnya milik Universitas Mercu Buana — palet dan tipografi diambil
dari situs resmi `mercubuana.ac.id`.

---

## Ruang lingkup peran

| Bisa dilakukan di OPAC | Dilakukan di OLS |
| --- | --- |
| Menelusuri & memfilter koleksi | Peminjaman buku |
| Melihat ketersediaan eksemplar | Pengembalian buku |
| Menyimpan buku favorit | Denda & perpanjangan |
| Melihat riwayat sirkulasi (salinan) | Pengelolaan sirkulasi oleh petugas |
| Mengusulkan pembelian buku | Pengelolaan data koleksi |

Panel admin internal tidak disertakan karena operasional koleksi sudah dikelola di OLS.

> **Ide pengembangan berikutnya (belum diimplementasikan):** pemesanan/reservasi buku
> langsung dari OPAC. Saat ini alur tersebut tetap di OLS.

---

## Identitas visual

**Palet UMB** (sumber: `mercubuana.ac.id/css/style.css`)

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `primary-500` | `#1062ED` | Warna utama, tombol, tautan |
| `primary-700` | `#0B419E` | Header gelap, aksen kuat |
| `primary-100` | `#E6EFFF` | Latar chip & item aktif |
| `primary-200` | `#D2DEF5` | Hover |
| `accent-500` | `#4AD319` | Aksen hijau: status tersedia, indikator aktif |
| `accent-400` | `#82FF55` | Gradien aksen |
| `gray-900` | `#121212` | Teks utama |
| `gray-700` | `#3D3D3E` | Teks sekunder |
| `gray-500` | `#6B6E72` | Teks muted |
| `gray-400` | `#B3B7BD` | Placeholder, ikon nonaktif |
| `gray-100` | `#EAEAEA` | Border |
| `gray-50` | `#F6F9FC` | Latar permukaan |

**Tipografi:** Cabin (teks antarmuka) + Figtree (judul).

Semua token terpusat di blok `@theme` pada `src/app/globals.css`. Untuk mengubah
identitas visual, cukup edit token di sana.

---

## Tumpukan teknologi

| Lapisan | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript |
| Gaya | Tailwind CSS v4 (`@theme` di CSS) |
| Basis data | SQLite via `node:sqlite` (bawaan Node 24) + FTS5 |
| Autentikasi | Session cookie httpOnly + scrypt (`node:crypto`) |
| Data pipeline | Node `https` + Cheerio |

Dependency produksi hanya tiga: `next`, `react`, `react-dom`. Tidak ada ORM, library
auth, maupun komponen UI pihak ketiga.

---

## Fitur

### OPAC publik
- **Beranda** - rekomendasi buku, telusur subjek, dan lokasi layanan.
- **Katalog** - pencarian teks penuh FTS5 (judul, pengarang, subjek, penerbit, ISBN,
  call number) + filter lokasi, bidang DDC, subjek, bahasa, ketersediaan, dan 4 opsi
  urutan. Paginasi menyediakan tombol halaman pertama/terakhir, jendela nomor halaman,
  serta input "ke halaman".
- **Detail koleksi** - metadata lengkap, subjek, deskripsi, ketersediaan eksemplar per
  lokasi, koleksi terkait, tombol **Reservasi**, bagikan, dan favorit.
- **Usul buku**, **Lokasi & jam layanan**, **Panduan**.

### Area anggota
Halaman yang memerlukan login menampilkan **popup login di atas halaman** (bukan
mengalihkan ke halaman terpisah). Navigasi anggota memakai sidebar utama, tanpa sidebar
bersarang.

| Menu | Isi |
| --- | --- |
| Ringkasan | Statistik pinjaman, pintasan, peminjaman terakhir |
| **Reservasi** | Reservasi aktif (maks. 3), riwayat reservasi, cara pengambilan |
| **Peminjaman** | Riwayat pinjam buku, statistik ketepatan waktu, pengingat jatuh tempo |
| **Aktivitas** | Riwayat kunjungan + pemakaian loker & tas |
| Buku Favorit | Koleksi tersimpan |
| Profil | Data anggota & kata sandi |

### Reservasi (fitur milik OPAC)
Karena anggota tidak memiliki akses ke OLS, OPAC menyediakan kanal reservasi:

- Maksimal **3 reservasi aktif** per anggota, berlaku **2 hari**.
- Reservasi mengikat **eksemplar spesifik** (`item_id`), bukan sekadar judul.
- Pembuatan reservasi berjalan dalam transaksi `BEGIN IMMEDIATE` sehingga dua anggota
  tidak bisa memesan eksemplar terakhir secara bersamaan.
- Reservasi yang lewat masa berlaku otomatis dilepas (dicek setiap kali data dibaca)
  dan eksemplar kembali `available`.
- **Rekonsiliasi otomatis:** saat `sync-ols` menemukan barcode yang sama di riwayat
  pinjam anggota, reservasi ditandai `fulfilled`.

### Grid koleksi yang rata
Kartu memakai `h-full` + `flex-col`, area keterangan `flex-1`, sampul rasio tetap 3:4,
dan judul setinggi tepat 2 baris (`min-h`). Hasilnya semua kartu dalam satu baris
**sama tinggi dan rata atas-bawah** walau panjang judul berbeda.

### Riwayat sirkulasi (salinan dari OLS)
Riwayat peminjaman anggota disalin ke tabel `circulation_history` dan ditampilkan di
**Akun → Riwayat Sirkulasi**, lengkap dengan status "dipinjam", "kembali", atau
"terlambat". Judul ditautkan ke katalog melalui pencocokan `barcode`.

```bash
# isi OLS_USER dan OLS_PASS di .env.local terlebih dahulu
node --use-system-ca scripts/sync-ols.mjs                       # semua anggota terdaftar
node --use-system-ca scripts/sync-ols.mjs --member=0160312-067  # satu anggota
```

Kredensial OLS hanya dipakai skrip ini dan tidak pernah dipakai untuk login OPAC.
Nilai `users.member_no` harus sama dengan No Anggota pada OLS.

---

## Memulai

```bash
# Prasyarat: Node.js 24+ (memakai modul bawaan node:sqlite)
node --version

npm install

copy .env.example .env.local     # Windows
# cp .env.example .env.local     # Linux/macOS

npm run db:import    # impor hasil scraping (data/scrape/*.jsonl)
npm run db:seed      # akun contoh & lokasi
npm run dev          # http://localhost:3000
```

> **Catatan Windows:** simpan berkas SQLite **di luar folder proyek** (contoh
> `C:/opac-data/opac.db`). File watcher Turbopack memantau seluruh folder proyek, dan
> berkas `-wal`/`-shm` SQLite dapat memicu error *file locked*. Nilai default di
> `.env.local` sudah mengarah ke luar proyek.

### Akun contoh

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Anggota | `anggota@mercubuana.ac.id` | `Anggota#2026` |
| Pustakawan | `pustakawan@mercubuana.ac.id` | `Pustakawan#2026` |
| Administrator | `admin@mercubuana.ac.id` | `Admin#2026` |

**Ganti kata sandi ini sebelum dipakai di lingkungan nyata.** Akun anggota contoh memakai
`member_no` yang harus disesuaikan dengan nomor anggota OLS agar riwayatnya tampil.

---

## Sinkronisasi koleksi dari katalog lama

```bash
npm run scrape:lists     # 1.815 halaman daftar  → data/scrape/books.jsonl
npm run scrape:details   # detail + eksemplar    → data/scrape/details.jsonl
npm run db:import        # impor / upsert ke SQLite + bangun ulang indeks FTS5
```

Scraping bersifat **resumable** (JSONL di-append, ID yang sudah ada dilewati) dan impor
bersifat **idempoten** (buku di-upsert by `source_id`, eksemplar by `barcode`).

Kategori bidang diturunkan otomatis dari **nomor panggil DDC** (000–900); subjek diambil
dari kolom Subjek ditambah nama program studi.

| Data | Jumlah |
| --- | --- |
| Judul koleksi | 36.286 |
| Eksemplar fisik | 79.991 |
| Pengarang | 30.214 |
| Subjek | 11.715 |
| Penerbit | 3.432 |
| Lokasi | 4 (Meruya, Menteng, Cibubur, Buncit) |

---

## Struktur proyek

```
src/
├── app/
│   ├── (public)/            # Situs OPAC — layout 3 kolom
│   │   ├── layout.tsx       # sidebar kiri + main + sidebar kanan + bottom nav
│   │   ├── page.tsx         # Beranda
│   │   ├── katalog/         # Pencarian, filter, paginasi
│   │   ├── koleksi/[id]/    # Detail koleksi
│   │   ├── akun/            # Masuk, daftar, riwayat, favorit, profil
│   │   └── usul-buku/ lokasi/ panduan/
│   ├── layout.tsx           # Root layout + font Cabin/Figtree
│   └── globals.css          # Design token (@theme) + komponen
├── actions/                 # Server Actions (auth, catalog)
├── components/
│   ├── ui/                  # Sidebar, kartu buku, filter, paginasi, mobile nav
│   └── account-nav.tsx
└── lib/
    ├── db/                  # Koneksi, skema SQL, indeks FTS5
    ├── queries.ts           # Query pencarian, faset, detail
    ├── circ-history.ts      # Riwayat sirkulasi (salinan OLS)
    ├── auth.ts              # Sesi, hashing, guard
    ├── format.ts            # Tanggal, label status, palet sampul
    └── wishlist.ts          # Favorit

scripts/
├── scrape.mjs         # Pengambil data katalog lama
├── scrape-run.mjs     # Supervisor scraping (retry otomatis)
├── import.mjs         # Impor JSONL → SQLite
├── sync-ols.mjs       # Sinkronisasi riwayat sirkulasi dari OLS
├── seed.mjs           # Akun contoh, lokasi
├── migrate.mjs        # Migrasi kolom (idempoten)
└── env.mjs            # Pemuat .env untuk skrip CLI
```

---

## Skema basis data

Tabel aktif: `books`, `items` (eksemplar), `authors`, `subjects`, `publishers`,
`categories`, `locations`, `users`, `sessions`, `wishlists`, `book_requests`,
`circulation_history`, plus tabel virtual `books_fts` (FTS5).

Pemisahan `books` dan `items` adalah inti desainnya: satu judul bisa punya banyak
eksemplar fisik, masing-masing dengan status dan lokasi sendiri.

> Tabel `loans`, `loan_items`, dan `events` masih ada di skema (warisan versi sebelumnya)
> tetapi **tidak lagi dipakai** setelah sirkulasi dipindahkan ke OLS. Aman dihapus pada
> migrasi berikutnya.

**Indeks kritis:**

```sql
-- filter "hanya tersedia"
CREATE INDEX idx_items_status_book ON items(status, book_id);
-- facet lokasi
CREATE INDEX idx_items_location_book ON items(location_id, book_id);
```

Tanpa dua indeks komposit tersebut, filter ketersediaan menjadi O(n²)
(36 ribu buku × 80 ribu eksemplar) dan halaman katalog tertahan bermenit-menit.

> `books_fts` memakai `content=''` (contentless) sehingga **tidak mendukung DELETE**.
> Untuk rebuild: `DROP TABLE` lalu `CREATE` ulang — lihat `src/lib/db/search-index.ts`.

Skema lengkap: `src/lib/db/schema.sql`.

---

## Produksi

```bash
npm run build
npm start
```

| Variabel | Keterangan |
| --- | --- |
| `OPAC_DB_PATH` | Lokasi berkas SQLite (default `./data/opac.db`) |
| `OLS_BASE_URL` | Basis URL OLS (default `https://ols.mercubuana.ac.id`) |
| `OLS_USER` / `OLS_PASS` | Kredensial akun layanan untuk skrip sinkronisasi |

Rekomendasi: simpan database di volume terpisah, jalankan di belakang reverse proxy
(Nginx/Caddy) dengan HTTPS, dan cadangkan berkala (`VACUUM INTO` atau salin `.db` + `-wal`).
Jadwalkan `sync-ols.mjs` secara periodik (mis. harian) agar riwayat tetap mutakhir.

---

## Keamanan

- Kata sandi di-hash dengan **scrypt** + salt acak per pengguna.
- Sesi: token acak 32 byte di tabel `sessions`; cookie `httpOnly`, `sameSite=lax`,
  `secure` di produksi; berlaku 30 hari.
- Setiap Server Action memverifikasi sesi dan peran.
- Semua query memakai prepared statement (parameter terikat).
- Kredensial OLS hanya dibaca di sisi server oleh skrip sinkronisasi.

Belum tersedia: verifikasi email, reset kata sandi, rate limiting login, 2FA, audit log.

---

## Lisensi & kredit

Data koleksi berasal dari katalog publik Perpustakaan Universitas Mercu Buana.
Palet dan tipografi mengikuti situs resmi Universitas Mercu Buana.
Riwayat sirkulasi disalin dari sistem OLS UMB dan tetap milik sistem tersebut.
