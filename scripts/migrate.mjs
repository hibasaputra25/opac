import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.argv[2] ?? 'C:/opac-data/opac.db');
const cols = db.prepare('PRAGMA table_info(loan_items)').all().map((c) => c.name);
console.log('columns:', cols.join(', '));

if (!cols.includes('book_id')) {
  db.exec('ALTER TABLE loan_items ADD COLUMN book_id INTEGER REFERENCES books(id)');
  console.log('added column book_id');
}

db.exec(`
  UPDATE loan_items
     SET book_id = (SELECT i.book_id FROM items i WHERE i.id = loan_items.item_id)
   WHERE book_id IS NULL
`);

console.log(db.prepare('SELECT loan_id, item_id, book_id, status FROM loan_items').all());
