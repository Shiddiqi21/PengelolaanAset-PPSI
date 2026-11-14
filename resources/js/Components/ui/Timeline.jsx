/**
 * Daftar kegiatan atau jadwal. ikon: 'selesai' (centang) | 'jadwal' (jam).
 * item: [{ ikon, judul, detail, waktu }]
 */
export default function Timeline({ item = [] }) {
    return (
        <ul className="space-y-5">
            {item.map((i, index) => (
                <li key={index} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true">
                        {i.ikon === 'jadwal' ? (
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <circle cx="10" cy="10" r="7.5" />
                                <path d="M10 5.5V10l3 1.8" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </span>
                    <div className="min-w-0 text-sm">
                        <p className="font-medium text-ink-900">{i.judul}</p>
                        {i.detail && <p className="mt-0.5 text-ink-600">{i.detail}</p>}
                        {i.waktu && <p className="mt-0.5 text-ink-600">{i.waktu}</p>}
                    </div>
                </li>
            ))}
        </ul>
    );
}
