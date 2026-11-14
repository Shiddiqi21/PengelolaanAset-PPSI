import { Link } from '@inertiajs/react';

/**
 * Navigasi tab antarhalaman yang berkaitan (mis. Akun pengguna | Hak akses | Log aktivitas).
 * tab: [{ label, href, aktif: boolean }]
 */
export default function TabNav({ tab = [] }) {
    return (
        <nav aria-label="Bagian halaman" className="mb-6 flex gap-1 border-b border-line">
            {tab.map((t) => (
                <Link
                    key={t.href}
                    href={t.href}
                    aria-current={t.aktif ? 'page' : undefined}
                    className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                        t.aktif
                            ? 'border-brand-600 text-brand-700'
                            : 'border-transparent text-ink-600 hover:border-line hover:text-ink-900'
                    }`}
                >
                    {t.label}
                </Link>
            ))}
        </nav>
    );
}
