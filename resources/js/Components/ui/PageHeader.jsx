import Breadcrumb from '@/Components/ui/Breadcrumb';

/**
 * Judul halaman: breadcrumb kecil, judul besar, deskripsi, dan tombol aksi di kanan.
 * Letakkan di dalam isi halaman (bukan di prop header layout).
 * Contoh: <PageHeader breadcrumb={['FTI', 'Master aset']} judul="Master aset" deskripsi="..."><TombolLink href=...>Tambah aset</TombolLink></PageHeader>
 */
export default function PageHeader({ judul, deskripsi, breadcrumb, children }) {
    return (
        <div className="mb-6">
            {breadcrumb && <Breadcrumb butir={breadcrumb} className="mb-3" />}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-ink-900">{judul}</h1>
                    {deskripsi && <p className="mt-1 max-w-3xl text-[15px] text-ink-600">{deskripsi}</p>}
                </div>
                {children && <div className="flex items-center gap-2">{children}</div>}
            </div>
        </div>
    );
}
