export type RawSearchParams = Record<string, string | string[] | undefined>;

export type CatalogQuery = {
  q?: string;
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
};

export function parseCatalogParams(raw: RawSearchParams): CatalogQuery {
  const get = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
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
