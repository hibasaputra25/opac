export type RawSearchParams = Record<string, string | string[] | undefined>;

export type CatalogQuery = {
  q?: string;
  /** Multi-pilih, dipisah koma di URL (mis. ?category=fiksi,umum). */
  subject?: string;
  category?: string;
  language?: string;
  location?: string;
  available?: boolean;
  type?: string;
  sort?: string;
  page: number;
  yearFrom?: number;
  yearTo?: number;
  /** Mode tampilan hasil: 'grid' (default) atau 'list'. */
  view?: 'grid' | 'list';
};

/** Pecah nilai filter multi-pilih menjadi daftar bersih & unik. */
export function parseMulti(value: string | undefined): string[] {
  if (!value) return [];
  const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
  return [...new Set(parts)];
}

export function parseCatalogParams(raw: RawSearchParams): CatalogQuery {
  const get = (key: string) => {
    const value = raw[key];
    // Form GET dengan checkbox multi-pilih mengirim parameter berulang
    // (?subject=a&subject=b) — gabungkan menjadi daftar dipisah koma.
    return Array.isArray(value) ? value.map((v) => v.trim()).filter(Boolean).join(',') : value;
  };

  const num = (key: string) => {
    const value = Number(get(key));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };

  return {
    q: get('q')?.trim() || undefined,
    subject: get('subject') || undefined,
    category: get('category') || undefined,
    language: get('language') || undefined,
    location: get('location') || undefined,
    available: get('available') === '1' || undefined,
    type: get('type') || undefined,
    sort: get('sort') || undefined,
    page: num('page') ?? 1,
    yearFrom: num('yearFrom'),
    yearTo: num('yearTo'),
    view: get('view') === 'list' ? 'list' : undefined,
  };
}

export function buildQuery(
  current: CatalogQuery,
  overrides: Partial<Record<keyof CatalogQuery, string | number | boolean | undefined>> = {},
) {
  const merged: Record<string, string | number | boolean | undefined> = { ...current, ...overrides };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (key === 'page' && value === 1) continue;
    if (key === 'view' && value === 'grid') continue;
    if (key === 'available') {
      if (value) params.set('available', '1');
      continue;
    }
    params.set(key, String(value));
  }

  const qs = params.toString();
  // Jangkar `#hasil` membuat perpindahan halaman mendarat langsung di kartu
  // pertama, bukan di atas halaman (penting untuk tata letak masonry).
  return qs ? `/katalog?${qs}#hasil` : '/katalog#hasil';
}

export function activeFilterCount(query: CatalogQuery) {
  return [
    query.subject,
    query.category,
    query.language,
    query.location,
    query.available,
    query.yearFrom,
    query.yearTo,
  ].filter(Boolean).length;
}
