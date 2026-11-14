import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

/**
 * Dialog konfirmasi sebelum aksi penting (nonaktifkan, hapus, setujui).
 * nada="bahaya" memakai tombol merah.
 * Contoh: <ConfirmDialog show={!!target} judul="Nonaktifkan akun?" pesan="..." labelKonfirmasi="Nonaktifkan"
 *            nada="bahaya" memproses={proses} onKonfirmasi={kirim} onTutup={() => setTarget(null)} />
 */
export default function ConfirmDialog({
    show,
    judul,
    pesan,
    labelKonfirmasi = 'Lanjutkan',
    nada = 'normal',
    memproses = false,
    onKonfirmasi,
    onTutup,
}) {
    const Tombol = nada === 'bahaya' ? DangerButton : PrimaryButton;

    return (
        <Modal show={show} onClose={memproses ? () => {} : onTutup} maxWidth="md">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-ink-900">{judul}</h2>
                {pesan && <p className="mt-2 text-sm text-ink-600">{pesan}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={onTutup} disabled={memproses}>
                        Batal
                    </SecondaryButton>
                    <Tombol onClick={onKonfirmasi} disabled={memproses}>
                        {labelKonfirmasi}
                    </Tombol>
                </div>
            </div>
        </Modal>
    );
}
