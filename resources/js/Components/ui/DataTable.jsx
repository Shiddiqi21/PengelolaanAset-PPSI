import EmptyState from '@/Components/ui/EmptyState';

/**
 * Tabel data bergaya desain (kepala tabel abu-abu, garis tipis antarbaris).
 * kolom: [{ kunci, judul, render?: (baris) => node, className? }]
 * kosong: node yang ditampilkan saat baris kosong (default: EmptyState umum).
 * Contoh:
 *   <DataTable kolom={[{ kunci: 'nomor', judul: 'Nomor' }, { judul: 'Status', render: (b) => <StatusText nada={b.nada}>{b.status}</StatusText> }]}
 *              baris={data} kunciBaris="nomor" />
 */
export default function DataTable({ kolom, baris, kunciBaris, kosong }) {
    if (!baris || baris.length === 0) {
        return kosong ?? <EmptyState judul="Belum ada data" />;
    }

    return (
        <div className="overflow-x-auto px-3 pb-2">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        {kolom.map((k, i) => (
                            <th
                                key={k.kunci ?? i}
                                scope="col"
                                className={`px-3 py-3 first:rounded-l-lg last:rounded-r-lg ${k.className ?? ''}`}
                            >
                                {k.judul}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {baris.map((b, index) => (
                        <tr key={b[kunciBaris] ?? index} className="border-b border-line align-top last:border-0">
                            {kolom.map((k, i) => (
                                <td key={k.kunci ?? i} className={`px-3 py-4 text-ink-900 ${k.className ?? ''}`}>
                                    {k.render ? k.render(b) : b[k.kunci]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
