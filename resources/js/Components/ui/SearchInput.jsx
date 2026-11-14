import { forwardRef } from 'react';

/**
 * Kolom pencarian dengan ikon kaca pembesar.
 * Contoh: <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor pengajuan..." />
 */
export default forwardRef(function SearchInput({ className = '', ...props }, ref) {
    return (
        <div className={`relative ${className}`}>
            <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
            >
                <circle cx="9" cy="9" r="5.5" />
                <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
            </svg>
            <input
                {...props}
                ref={ref}
                type="search"
                className="block w-full rounded-lg border-line py-2.5 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
            />
        </div>
    );
});
