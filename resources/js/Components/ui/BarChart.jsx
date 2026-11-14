/**
 * Diagram batang berpasangan sederhana (tanpa pustaka grafik).
 * data: [{ label, a, b }]. Batang terakhir pada seri A disorot sebagai periode terkini.
 * Contoh: <BarChart data={[{ label: 'Mei', a: 78, b: 20 }]} namaA="Perolehan aset" namaB="Penyusutan" satuan="Dalam juta rupiah" />
 */
export default function BarChart({ data = [], namaA, namaB, satuan }) {
    const maks = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
                    {namaA}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-ink-500" aria-hidden="true" />
                    {namaB}
                </span>
                {satuan && <span className="text-ink-500">{satuan}</span>}
            </div>

            <div className="flex h-56 items-end justify-between gap-3" role="img" aria-label={`Diagram ${namaA} dan ${namaB}`}>
                {data.map((d, index) => {
                    const terkini = index === data.length - 1;

                    return (
                        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                            <span className="text-xs text-ink-600">{d.a}</span>
                            <div className="flex h-full w-full items-end justify-center gap-1.5">
                                <div
                                    className={`w-5 rounded-sm sm:w-7 ${terkini ? 'bg-brand-600' : 'bg-brand-300'}`}
                                    style={{ height: `${(d.a / maks) * 100}%` }}
                                />
                                <div className="w-3 rounded-sm bg-line sm:w-5" style={{ height: `${(d.b / maks) * 100}%` }} />
                            </div>
                            <span className="text-xs text-ink-600">{d.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
