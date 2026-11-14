import Alert from '@/Components/ui/Alert';
import { usePage } from '@inertiajs/react';

/**
 * Menampilkan pesan berhasil (flash 'status') dan pesan gagal dari aksi tombol
 * (error 'status'). Sudah dipasang otomatis di AuthenticatedLayout.
 * Dari controller: ->with('status', 'Tersimpan.') atau ->withErrors(['status' => 'Gagal.'])
 */
export default function FlashMessage() {
    const { flash, errors } = usePage().props;
    const sukses = flash?.status;
    const gagal = errors?.status;

    if (!sukses && !gagal) {
        return null;
    }

    return (
        <div className="mb-6 space-y-2">
            {sukses && <Alert nada="sukses">{sukses}</Alert>}
            {gagal && <Alert nada="bahaya">{gagal}</Alert>}
        </div>
    );
}
