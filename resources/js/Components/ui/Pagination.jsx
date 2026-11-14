import { Link } from '@inertiajs/react';

const bersihkan = (label) =>
    label
        .replace(/&laquo;|&raquo;/g, '')
        .replace('pagination.previous', 'Sebelumnya')
        .replace('pagination.next', 'Berikutnya')
        .replace('Previous', 'Sebelumnya')
        .replace('Next', 'Berikutnya')
        .trim();

/**
 * Navigasi halaman untuk hasil paginate() Laravel.
 * Contoh: <Pagination links={data.links} from={data.from} to={data.to} total={data.total} />
 * Tanpa links, hanya teks "Menampilkan ..." yang tampil (untuk data contoh).
 */
export default function Pagination({ links = [], from, to, total }) {
    if (!total) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 px-6 pb-5 pt-3 text-xs text-ink-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
                Menampilkan {from}–{to} dari {total} data
            </p>

            {links.length > 3 && (
                <nav aria-label="Halaman" className="flex flex-wrap items-center gap-1">
                    {links.map((link, index) => {
                        const label = bersihkan(link.label);
                        const kelas = `rounded-md px-2.5 py-1 text-xs ${
                            link.active ? 'bg-brand-600 font-semibold text-white' : 'text-brand-600 hover:bg-brand-50'
                        }`;

                        return link.url ? (
                            <Link
                                key={index}
                                href={link.url}
                                preserveScroll
                                preserveState
                                className={kelas}
                                aria-current={link.active ? 'page' : undefined}
                            >
                                {label}
                            </Link>
                        ) : (
                            <span key={index} className="rounded-md px-2.5 py-1 text-xs text-ink-400">
                                {label}
                            </span>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
