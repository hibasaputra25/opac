export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

export function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function daysBetween(from: string | Date, to: string | Date = new Date()) {
  const a = typeof from === 'string' ? new Date(from) : from;
  const b = typeof to === 'string' ? new Date(to) : to;
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export const ITEM_STATUS: Record<string, { label: string; tone: string }> = {
  available: { label: 'Tersedia', tone: 'green' },
  booked: { label: 'Di keranjang', tone: 'amber' },
  borrowed: { label: 'Dipinjam', tone: 'amber' },
  reserved: { label: 'Di keranjang', tone: 'amber' },
  reference: { label: 'Baca di tempat', tone: 'blue' },
  lost: { label: 'Hilang', tone: 'red' },
  damaged: { label: 'Rusak', tone: 'red' },
};

export const LOAN_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Menunggu persetujuan', tone: 'amber' },
  active: { label: 'Sedang dipinjam', tone: 'blue' },
  returned: { label: 'Sudah dikembalikan', tone: 'green' },
  overdue: { label: 'Terlambat', tone: 'red' },
  cancelled: { label: 'Dibatalkan', tone: 'gray' },
  rejected: { label: 'Ditolak', tone: 'red' },
};

export const REQUEST_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: 'Baru', tone: 'amber' },
  approved: { label: 'Disetujui', tone: 'blue' },
  rejected: { label: 'Ditolak', tone: 'red' },
  purchased: { label: 'Sudah dibeli', tone: 'green' },
};

export function initials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

const COVER_PALETTES = [
  ['#0B419E', '#1062ED'],
  ['#0A3578', '#2F6BF5'],
  ['#14532D', '#3F7A2E'],
  ['#1E293B', '#475569'],
  ['#0B4FC4', '#5B8DFF'],
  ['#365314', '#74AC2C'],
  ['#07204D', '#0B419E'],
  ['#334155', '#64748B'],
];

export function coverPalette(seed: number) {
  return COVER_PALETTES[Math.abs(seed) % COVER_PALETTES.length];
}

export function truncate(text: string | null | undefined, max = 160) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function statusToneClass(tone: string) {
  switch (tone) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'amber':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'red':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'blue':
      return 'bg-brand-50 text-brand-700 ring-brand-200';
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}
