const NADA = {
    netral: 'text-ink-600',
    sukses: 'text-brand-600',
    peringatan: 'text-warn-700',
    bahaya: 'text-bahaya-600',
    info: 'text-info-600',
};

/**
 * Status berupa teks berwarna (gaya kolom Status di tabel desain).
 * Contoh: <StatusText nada="peringatan">Menunggu persetujuan</StatusText>
 */
export default function StatusText({ nada = 'netral', children }) {
    return <span className={`text-sm ${NADA[nada] ?? NADA.netral}`}>{children}</span>;
}
