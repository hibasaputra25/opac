import Link from 'next/link';
import type { CatalogQuery } from '@/lib/search-params';
import { buildQuery } from '@/lib/search-params';
import type { Facet } from '@/lib/queries';

type Props = {
  query: CatalogQuery;
  facets: {
    subjects: Facet[];
    categories: Facet[];
    languages: Facet[];
    locations: Facet[];
  };
};

/**
 * Gaya chip mengikuti Jaklitera: latar transparan, border solid, hover berwarna.
 * Aktif: latar biru transparan dengan border solid biru UMB.
 */
const CHIP_BASE = 'inline-flex items-center gap-1 rounded-lg border py-1.5 px-3 text-xs font-medium transition';
const CHIP_IDLE =
  'border-gray-200 bg-gray-50 text-gray-500 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600';
const CHIP_ACTIVE = 'border-primary-500 bg-primary-500/10 text-primary-600';

function FacetGroup({
  title,
  items,
  query,
  keyName,
  limit = 8,
}: {
  title: string;
  items: Facet[];
  query: CatalogQuery;
  keyName: 'subject' | 'category' | 'language' | 'location';
  limit?: number;
}) {
  if (!items.length) return null;
  const active = query[keyName];

  return (
    <div>
      <h4 className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        {title}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, limit).map((item) => {
          const isActive = active === item.value;
          return (
            <Link
              key={item.value}
              href={buildQuery(query, { [keyName]: isActive ? undefined : item.value, page: 1 })}
              aria-pressed={isActive}
              className={`${CHIP_BASE} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              <span className="max-w-[10rem] truncate">{item.label}</span>
              <span className={isActive ? 'text-primary-400' : 'text-gray-400'}>
                {item.count.toLocaleString('id-ID')}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function CatalogFilters({ query, facets }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Saring hasil</h3>
        <Link
          href={buildQuery({
            ...query,
            q: query.q,
            page: 1,
            subject: undefined,
            category: undefined,
            language: undefined,
            location: undefined,
            available: undefined,
            yearFrom: undefined,
            yearTo: undefined,
          })}
          className="text-[0.7rem] font-semibold text-primary-500 hover:underline"
        >
          Bersihkan
        </Link>
      </div>

      <Link
        href={buildQuery(query, { available: query.available ? undefined : true, page: 1 })}
        aria-pressed={Boolean(query.available)}
        className={`${CHIP_BASE} ${query.available ? CHIP_ACTIVE : CHIP_IDLE}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            query.available ? 'bg-primary-500' : 'bg-gray-400'
          }`}
        />
        Hanya yang tersedia
      </Link>

      <FacetGroup title="Lokasi" items={facets.locations} query={query} keyName="location" limit={4} />
      <FacetGroup title="Bidang Ilmu" items={facets.categories} query={query} keyName="category" limit={10} />
      <FacetGroup title="Subjek" items={facets.subjects} query={query} keyName="subject" limit={10} />
      <FacetGroup title="Bahasa" items={facets.languages} query={query} keyName="language" limit={4} />
    </div>
  );
}
