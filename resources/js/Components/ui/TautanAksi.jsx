import { Link } from '@inertiajs/react';

/**
 * Tautan aksi di kolom tabel: hijau tebal dengan panah. Contoh: <TautanAksi href={...}>Periksa</TautanAksi>
 */
export default function TautanAksi({ href, children, ...props }) {
    return (
        <Link href={href} {...props} className="text-xs font-semibold text-brand-600 hover:underline">
            {children} →
        </Link>
    );
}
