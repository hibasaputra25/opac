export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-[0_8px_18px_-8px_rgba(11,65,158,0.9)] ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" fill="none" className="h-[62%] w-[62%]">
        <path
          d="M16 6c3.4 3.2 5.6 6.3 5.6 9.6 0 3.9-2.5 6.9-5.6 8.9-3.1-2-5.6-5-5.6-8.9C10.4 12.3 12.6 9.2 16 6Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <path
          d="M6 24.5c2.4-1.2 4.6-1.2 6.6 0M19.4 24.5c2-1.2 4.2-1.2 6.6 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />
      </svg>
    </span>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <BrandMark className={compact ? 'h-9 w-9' : 'h-11 w-11'} />
      <span className="flex flex-col leading-tight">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-700">
          Universitas Mercu Buana
        </span>
        <span className="text-base font-extrabold tracking-tight text-ink sm:text-lg">
          Perpustakaan
        </span>
      </span>
    </span>
  );
}
