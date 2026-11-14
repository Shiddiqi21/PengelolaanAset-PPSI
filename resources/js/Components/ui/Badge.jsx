const NADA = {
    netral: 'bg-surface text-ink-600',
    sukses: 'bg-brand-50 text-brand-700',
    peringatan: 'bg-warn-50 text-warn-700',
    bahaya: 'bg-bahaya-50 text-bahaya-600',
    info: 'bg-info-50 text-info-600',
};

/**
 * Label status berbentuk pil. nada: netral | sukses | peringatan | bahaya | info.
 * Contoh: <Badge nada="sukses">Aktif</Badge>
 */
export default function Badge({ nada = 'netral', className = '', children }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${NADA[nada] ?? NADA.netral} ${className}`}
        >
            {children}
        </span>
    );
}
