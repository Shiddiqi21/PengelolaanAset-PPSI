/**
 * Tampilan saat data kosong. Beri petunjuk apa yang bisa dilakukan berikutnya.
 * Contoh: <EmptyState judul="Belum ada aset" deskripsi="Aset muncul setelah penerimaan dicatat."><TombolLink href=...>Catat penerimaan</TombolLink></EmptyState>
 */
export default function EmptyState({ judul, deskripsi, children }) {
    return (
        <div className="px-6 py-12 text-center">
            <p className="text-base font-semibold text-ink-900">{judul}</p>
            {deskripsi && <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">{deskripsi}</p>}
            {children && <div className="mt-4 flex justify-center">{children}</div>}
        </div>
    );
}
