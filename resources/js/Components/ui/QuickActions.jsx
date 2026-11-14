import { Link } from '@inertiajs/react';

/**
 * Deretan tombol pintasan (mis. jenis pengajuan). item: [{ label, href }]
 */
export default function QuickActions({ item = [] }) {
    return (
        <div className="flex flex-wrap gap-3">
            {item.map((i) => (
                <Link
                    key={i.label}
                    href={i.href}
                    className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-600 hover:text-brand-700"
                >
                    {i.label}
                </Link>
            ))}
        </div>
    );
}
