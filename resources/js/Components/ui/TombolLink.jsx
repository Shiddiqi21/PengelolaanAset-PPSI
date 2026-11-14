import { Link } from '@inertiajs/react';

const VARIAN = {
    utama: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600',
    sekunder: 'border border-line bg-white text-ink-900 hover:bg-surface focus-visible:ring-brand-600',
};

/**
 * Tautan berbentuk tombol (satu elemen <a>, bukan tombol di dalam tautan).
 * varian: utama | sekunder. Contoh: <TombolLink href={route('aset.create')}>+ Tambah aset</TombolLink>
 */
export default function TombolLink({ href, varian = 'utama', className = '', children, ...props }) {
    return (
        <Link
            href={href}
            {...props}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${VARIAN[varian] ?? VARIAN.utama} ${className}`}
        >
            {children}
        </Link>
    );
}
