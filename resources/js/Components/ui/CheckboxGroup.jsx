import Checkbox from '@/Components/Checkbox';

/**
 * Sekumpulan kotak centang untuk memilih banyak nilai.
 * pilihan: [{ nilai, label, deskripsi? }], terpilih: array nilai, onChange(arrayBaru).
 */
export default function CheckboxGroup({ pilihan = [], terpilih = [], onChange, className = '' }) {
    const ubah = (nilai, centang) => {
        onChange(centang ? [...terpilih, nilai] : terpilih.filter((n) => n !== nilai));
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {pilihan.map((p) => (
                <label key={p.nilai} className="flex items-start gap-3">
                    <Checkbox
                        className="mt-0.5"
                        checked={terpilih.includes(p.nilai)}
                        onChange={(e) => ubah(p.nilai, e.target.checked)}
                    />
                    <span className="text-sm">
                        <span className="font-medium text-ink-900">{p.label}</span>
                        {p.deskripsi && <span className="block text-ink-600">{p.deskripsi}</span>}
                    </span>
                </label>
            ))}
        </div>
    );
}
