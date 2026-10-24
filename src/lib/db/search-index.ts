/**
 * Membangun ulang tabel pencarian teks (FTS5) dari tabel books.
 * Tabel FTS5 di sini "contentless" (content=''), sehingga tidak mendukung
 * DELETE — indeks harus dibuat ulang dari nol.
 */
import { getDb } from '.';

export function rebuildSearchIndex() {
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS books_fts;');
  db.exec(`
    CREATE VIRTUAL TABLE books_fts USING fts5(
      title, authors, subjects, publisher, isbn, call_number, content=''
    );
  `);
  db.exec(`
    INSERT INTO books_fts (rowid, title, authors, subjects, publisher, isbn, call_number)
    SELECT
      b.id,
      b.title,
      COALESCE((SELECT group_concat(a.name, ' ')
                FROM book_authors ba JOIN authors a ON a.id = ba.author_id
                WHERE ba.book_id = b.id), ''),
      COALESCE((SELECT group_concat(s.name, ' ')
                FROM book_subjects bs JOIN subjects s ON s.id = bs.subject_id
                WHERE bs.book_id = b.id), ''),
      COALESCE(p.name, ''),
      COALESCE(b.isbn, ''),
      COALESCE(b.call_number, '')
    FROM books b
    LEFT JOIN publishers p ON p.id = b.publisher_id;
  `);
}
