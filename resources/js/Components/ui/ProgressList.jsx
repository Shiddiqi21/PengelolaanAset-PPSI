const WARNA = {
    sukses: 'bg-brand-600',
    peringatan: 'bg-warn-600',
    bahaya: 'bg-bahaya-600',
    netral: 'bg-ink-500',
};

/**
 * Daftar batang proporsi (mis. kondisi inventaris).
 * item: [{ label, nilai: 'teks di kanan', persen: 0-100, nada: sukses|peringatan|bahaya|netral }]
 */
export default function ProgressList({ item = [] }) {
    return (
        <ul className="space-y-5">
            {item.map((i) => (
                <li key={i.label}>
                    <div className="flex items-baseline justify-between text-sm">
                        <span className="text-ink-900">{i.label}</span>
                        <span className="text-ink-500">{i.nilai}</span>
                    </div>
                    <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
                        role="progressbar"
                        aria-label={i.label}
                        aria-valuenow={Math.round(i.persen)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className={`h-full rounded-full ${WARNA[i.nada] ?? WARNA.netral}`}
                            style={{ width: `${Math.max(2, Math.min(100, i.persen))}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}
