const NADA = {
    info: 'bg-brand-50 text-ink-900',
    sukses: 'bg-brand-50 text-brand-800',
    peringatan: 'bg-warn-50 text-warn-700',
    bahaya: 'bg-bahaya-50 text-bahaya-600',
};

/**
 * Banner informasi satu baris di atas konten. nada: info | sukses | peringatan | bahaya.
 * Contoh: <Alert nada="peringatan">2 dokumen penerimaan belum lengkap.</Alert>
 */
export default function Alert({ nada = 'info', className = '', children }) {
    const peran = nada === 'bahaya' ? 'alert' : 'status';

    return (
        <div role={peran} className={`rounded-lg px-4 py-3 text-sm ${NADA[nada] ?? NADA.info} ${className}`}>
            {children}
        </div>
    );
}
