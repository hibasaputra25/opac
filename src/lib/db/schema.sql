-- ============================================================
-- OPAC Perpustakaan Universitas Mercu Buana
-- Skema database (SQLite) — dirancang dari awal
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------- Referensi master ----------

CREATE TABLE IF NOT EXISTS publishers (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  city      TEXT
);

CREATE TABLE IF NOT EXISTS authors (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS subjects (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  slug      TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS locations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  code      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  campus    TEXT,
  address   TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  slug      TEXT NOT NULL UNIQUE
);

-- ---------- Koleksi ----------

CREATE TABLE IF NOT EXISTS books (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id       TEXT UNIQUE,               -- ID_Buku dari katalog lama, untuk penelusuran asal
  title           TEXT NOT NULL,
  subtitle        TEXT,
  call_number     TEXT,
  isbn            TEXT,
  issn            TEXT,
  edition         TEXT,
  publisher_id    INTEGER REFERENCES publishers(id),
  year            INTEGER,
  language        TEXT DEFAULT 'Indonesia',
  origin          TEXT,
  category_id     INTEGER REFERENCES categories(id),
  pages           TEXT,
  size            TEXT,
  description     TEXT,
  abstract        TEXT,
  cover_url       TEXT,
  collection_type TEXT NOT NULL DEFAULT 'Buku',  -- Buku | Tugas Akhir | Artikel | Jurnal | E-Book
  digital_url     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS book_authors (
  book_id   INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'Pengarang',
  position  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (book_id, author_id, role)
);

CREATE TABLE IF NOT EXISTS book_subjects (
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, subject_id)
);

-- Eksemplar fisik (satu baris = satu barcode)
CREATE TABLE IF NOT EXISTS items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id        INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  barcode        TEXT UNIQUE,
  register_no    TEXT,
  location_id    INTEGER REFERENCES locations(id),
  call_number    TEXT,
  acquisition    TEXT,                       -- Sumbangan | Pembelian | Hibah ...
  status         TEXT NOT NULL DEFAULT 'available', -- available | borrowed | reserved | lost | damaged | reference
  condition      TEXT,
  acquired_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Pengguna ----------

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no     TEXT UNIQUE,                 -- nomor anggota / NIM
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',  -- member | librarian | admin
  phone         TEXT,
  address       TEXT,
  identity_no   TEXT,                        -- NIK
  program       TEXT,                        -- program studi
  status        TEXT NOT NULL DEFAULT 'active',  -- active | inactive | blocked
  max_loans     INTEGER NOT NULL DEFAULT 3,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Transaksi peminjaman ----------

CREATE TABLE IF NOT EXISTS loans (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT NOT NULL UNIQUE,       -- kode transaksi, mis. PJM-2026-000123
  user_id        INTEGER NOT NULL REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | active | returned | overdue | cancelled | rejected
  requested_at   TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at    TEXT,
  approved_by    INTEGER REFERENCES users(id),
  due_at         TEXT,
  returned_at    TEXT,
  notes          TEXT
);

CREATE TABLE IF NOT EXISTS loan_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id     INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES items(id),
  book_id     INTEGER REFERENCES books(id) ON DELETE CASCADE,
  returned_at TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'  -- pending | on_loan | returned
);

CREATE TABLE IF NOT EXISTS wishlists (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, book_id)
);

-- Riwayat sirkulasi (baca-saja), disalin dari sistem OLS.
-- Sumber kebenaran tetap OLS; tabel ini hanya cermin untuk ditampilkan di OPAC.
CREATE TABLE IF NOT EXISTS circulation_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no   TEXT NOT NULL,                 -- No Anggota pada OLS
  barcode     TEXT,
  title       TEXT,
  author      TEXT,
  borrowed_at TEXT,
  due_at      TEXT,
  returned_at TEXT,
  officer_in  TEXT,
  officer_out TEXT,
  source      TEXT NOT NULL DEFAULT 'ols',
  synced_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (member_no, barcode, borrowed_at)
);

CREATE INDEX IF NOT EXISTS idx_circulation_member ON circulation_history(member_no);

-- Kunjungan perpustakaan (baca-saja, dari OLS).
-- OLS hanya mencatat check-in lewat menu pengunjung; check-out diambil dari
-- peminjaman loker/tas (lihat locker_usage) bila tersedia.
CREATE TABLE IF NOT EXISTS visits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no  TEXT NOT NULL,
  check_in   TEXT,
  check_out  TEXT,
  purpose    TEXT,
  campus     TEXT,
  source     TEXT NOT NULL DEFAULT 'ols',
  synced_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (member_no, check_in)
);

CREATE INDEX IF NOT EXISTS idx_visits_member ON visits(member_no);

-- Pemakaian loker & tas (baca-saja, dari OLS /sirkulasi/lokertas).
CREATE TABLE IF NOT EXISTS locker_usage (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no   TEXT NOT NULL,
  code        TEXT,
  kind        TEXT NOT NULL DEFAULT 'locker',  -- locker | bag
  borrowed_at TEXT,
  due_at      TEXT,
  returned_at TEXT,
  fine        INTEGER NOT NULL DEFAULT 0,
  paid        INTEGER NOT NULL DEFAULT 0,
  is_problem  INTEGER NOT NULL DEFAULT 0,
  source      TEXT NOT NULL DEFAULT 'ols',
  synced_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (member_no, code, borrowed_at)
);

CREATE INDEX IF NOT EXISTS idx_locker_member ON locker_usage(member_no);

-- ---------------------------------------------------------------
-- Reservasi (fitur milik OPAC, bukan OLS)
-- Anggota mencadangkan eksemplar tertentu; berlaku 2 hari. Bila tidak
-- diambil, eksemplar kembali tersedia. Bila petugas mencatat peminjaman
-- dengan barcode yang sama (terlihat saat sinkronisasi), reservasi
-- ditandai 'fulfilled'.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'active',   -- active | fulfilled | expired | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  closed_at  TEXT,
  note       TEXT
);

CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_item ON reservations(item_id, status);

-- Satu anggota hanya boleh punya satu reservasi aktif per eksemplar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_active_unique
  ON reservations(user_id, item_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS book_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  title       TEXT NOT NULL,
  author      TEXT,
  publisher   TEXT,
  isbn        TEXT,
  year        INTEGER,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'new',   -- new | approved | rejected | purchased
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Agenda & pengumuman ----------

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  location    TEXT,
  starts_at   TEXT NOT NULL,
  ends_at     TEXT,
  cover_url   TEXT,
  category    TEXT,
  is_published INTEGER NOT NULL DEFAULT 1
);

-- ---------- Indeks pencarian ----------

CREATE INDEX IF NOT EXISTS idx_books_title      ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_year       ON books(year);
CREATE INDEX IF NOT EXISTS idx_books_type       ON books(collection_type);
CREATE INDEX IF NOT EXISTS idx_books_publisher  ON books(publisher_id);
CREATE INDEX IF NOT EXISTS idx_books_category   ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_items_book       ON items(book_id);
CREATE INDEX IF NOT EXISTS idx_items_status     ON items(status);
-- Indeks komposit: dipakai filter "hanya yang tersedia" (EXISTS per buku)
CREATE INDEX IF NOT EXISTS idx_items_status_book ON items(status, book_id);
CREATE INDEX IF NOT EXISTS idx_items_location_book ON items(location_id, book_id);
CREATE INDEX IF NOT EXISTS idx_loan_items_loan  ON loan_items(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_items_item  ON loan_items(item_id);
CREATE INDEX IF NOT EXISTS idx_loans_user       ON loans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);

-- Pencarian teks penuh (FTS5) untuk OPAC
CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
  title,
  authors,
  subjects,
  publisher,
  isbn,
  call_number,
  content=''
);

-- ---------- Statistik kunjungan sederhana ----------

CREATE TABLE IF NOT EXISTS search_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword    TEXT,
  result_cnt INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
