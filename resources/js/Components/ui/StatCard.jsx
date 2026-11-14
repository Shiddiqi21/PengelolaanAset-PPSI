const NADA = {
    netral: 'text-ink-500',
    sukses: 'text-brand-600',
    peringatan: 'text-warn-700',
    bahaya: 'text-bahaya-600',
};

/**
 * Kartu indikator: label, angka besar, dan keterangan berwarna.
 * Contoh: <StatCard label="Master aset" nilai="1.248" keterangan="6 aset ditambahkan bulan ini" nada="sukses" />
 */
export default function StatCard({ label, nilai, keterangan, nada = 'netral' }) {
    return (
        <div className="rounded-kartu border border-line bg-white p-5">
            <p className="text-sm text-ink-600">{label}</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-ink-900">{nilai}</p>
            {keterangan && <p className={`mt-1 text-sm ${NADA[nada] ?? NADA.netral}`}>{keterangan}</p>}
        </div>
    );
}

/**
 * Baris empat kartu indikator. Contoh: <StatGrid>{kpi.map((k) => <StatCard key={k.label} {...k} />)}</StatGrid>
 */
export function StatGrid({ children }) {
    return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
