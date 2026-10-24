import { all, one } from '@/lib/db';

export type CirculationRow = {
  id: number;
  barcode: string | null;
  title: string | null;
  author: string | null;
  borrowed_at: string | null;
  due_at: string | null;
  returned_at: string | null;
  officer_in: string | null;
  officer_out: string | null;
  book_id: number | null;
};

/**
 * Riwayat peminjaman buku anggota, disalin dari OLS.
 * Dicocokkan ke katalog lewat barcode agar judul bisa ditautkan.
 */
export function getCirculationHistory(memberNo: string) {
  return all<CirculationRow>(
    `SELECT h.id, h.barcode, h.title, h.author, h.borrowed_at, h.due_at, h.returned_at,
            h.officer_in, h.officer_out,
            (SELECT i.book_id FROM items i WHERE i.barcode = h.barcode LIMIT 1) AS book_id
       FROM circulation_history h
      WHERE h.member_no = ?
      ORDER BY h.borrowed_at DESC, h.id DESC`,
    [memberNo],
  );
}

export type LoanSummary = {
  total: number;
  active: number;
  overdue: number;
  onTime: number;
  late: number;
  last: string | null;
  nearestDue: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getLoanSummary(memberNo: string): LoanSummary {
  const empty: LoanSummary = {
    total: 0,
    active: 0,
    overdue: 0,
    onTime: 0,
    late: 0,
    last: null,
    nearestDue: null,
  };
  if (!memberNo) return empty;

  return (
    one<LoanSummary>(
      `SELECT
         count(*) AS total,
         sum(CASE WHEN returned_at IS NULL OR returned_at = '' THEN 1 ELSE 0 END) AS active,
         sum(CASE WHEN (returned_at IS NULL OR returned_at = '') AND due_at IS NOT NULL
                       AND due_at < ? THEN 1 ELSE 0 END) AS overdue,
         sum(CASE WHEN returned_at IS NOT NULL AND returned_at != ''
                       AND (due_at IS NULL OR returned_at <= due_at) THEN 1 ELSE 0 END) AS onTime,
         sum(CASE WHEN returned_at IS NOT NULL AND returned_at != ''
                       AND due_at IS NOT NULL AND returned_at > due_at THEN 1 ELSE 0 END) AS late,
         max(borrowed_at) AS last,
         min(CASE WHEN returned_at IS NULL OR returned_at = '' THEN due_at END) AS nearestDue
       FROM circulation_history
      WHERE member_no = ?`,
      [today(), memberNo],
    ) ?? empty
  );
}

/** Status per baris riwayat peminjaman. */
export function loanRowStatus(row: CirculationRow): 'active' | 'overdue' | 'returned' | 'late' {
  const returned = Boolean(row.returned_at);
  if (!returned) {
    if (row.due_at && row.due_at < today()) return 'overdue';
    return 'active';
  }
  if (row.due_at && row.returned_at && row.returned_at > row.due_at) return 'late';
  return 'returned';
}

export type VisitRow = {
  id: number;
  check_in: string | null;
  check_out: string | null;
  purpose: string | null;
  source: string;
};

export function getVisits(memberNo: string) {
  if (!memberNo) return [];
  return all<VisitRow>(
    `SELECT id, check_in, check_out, purpose, source
       FROM visits
      WHERE member_no = ?
      ORDER BY check_in DESC`,
    [memberNo],
  );
}

export type LockerRow = {
  id: number;
  code: string | null;
  kind: string;
  borrowed_at: string | null;
  due_at: string | null;
  returned_at: string | null;
  fine: number;
  paid: number;
  is_problem: number;
};

export function getLockerUsage(memberNo: string) {
  if (!memberNo) return [];
  return all<LockerRow>(
    `SELECT id, code, kind, borrowed_at, due_at, returned_at, fine, paid, is_problem
       FROM locker_usage
      WHERE member_no = ?
      ORDER BY borrowed_at DESC`,
    [memberNo],
  );
}

export function getActivitySummary(memberNo: string) {
  if (!memberNo) {
    return { visits: 0, lockers: 0, openLockers: 0, lastVisit: null as string | null };
  }
  return (
    one<{ visits: number; lockers: number; openLockers: number; lastVisit: string | null }>(
      `SELECT
         (SELECT count(*) FROM visits WHERE member_no = ?) AS visits,
         (SELECT count(*) FROM locker_usage WHERE member_no = ?) AS lockers,
         (SELECT count(*) FROM locker_usage
           WHERE member_no = ? AND (returned_at IS NULL OR returned_at = '')) AS openLockers,
         (SELECT max(check_in) FROM visits WHERE member_no = ?) AS lastVisit`,
      [memberNo, memberNo, memberNo, memberNo],
    ) ?? { visits: 0, lockers: 0, openLockers: 0, lastVisit: null }
  );
}
