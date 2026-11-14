import { Link } from '@inertiajs/react';

/**
 * Kotak pembungkus konten dengan judul bergaya desain.
 * tautan: { label: 'Lihat semua', href: '/...' } tampil di samping judul.
 * Contoh: <Card judul="Antrean pekerjaan" tautan={{ label: 'Lihat pemeriksaan', href: route('pemeriksaan.index') }}> ... </Card>
 */
export default function Card({ judul, deskripsi, tautan, className = '', children }) {
    return (
        <section className={`rounded-kartu border border-line bg-white ${className}`}>
            {(judul || deskripsi) && (
                <header className="px-6 pb-2 pt-6">
                    {judul && (
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                            <h2 className="text-lg font-semibold text-ink-900">{judul}</h2>
                            {tautan && (
                                <Link href={tautan.href} className="text-xs font-medium text-brand-600 hover:underline">
                                    {tautan.label} →
                                </Link>
                            )}
                        </div>
                    )}
                    {deskripsi && <p className="mt-1 text-sm text-ink-600">{deskripsi}</p>}
                </header>
            )}
            {children}
        </section>
    );
}

/**
 * Isi kartu dengan jarak dalam standar (untuk konten selain tabel).
 */
export function IsiKartu({ className = '', children }) {
    return <div className={`px-6 pb-6 pt-4 ${className}`}>{children}</div>;
}
