import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import Field from '@/Components/ui/Field';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import SelectInput from '@/Components/ui/SelectInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';

function formatRupiah(angka) {
    if (!angka || angka === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka);
}

function formatUkuranBerkas(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Edit({
    pemohon,
    pengajuan,
    daftarAset = [],
}) {
    const berkasInputRef = useRef(null);
    const bannerErrorRef = useRef(null);
    const [aksiAktif, setAksiAktif] = useState(null);
    const [modalErrorBuka, setModalErrorBuka] = useState(false);
    const [daftarError, setDaftarError] = useState([]);

    const initialSelectedAssets = (pengajuan.items || []).map((it) => it.id_aset);

    const { data, setData, post, processing, errors, transform } = useForm({
        _method: 'put',
        aksi: 'diajukan',
        perihal: pengajuan.perihal || '',
        dasar_usulan: pengajuan.dasar_usulan || 'Rusak berat / tidak ekonomis',
        alasan_penghapusan: pengajuan.alasan_penghapusan || '',
        selected_assets: initialSelectedAssets,
        items: [],
        lampiran: [],
        hapus_dokumen: [],
    });

    const asetMap = useMemo(() => {
        const map = new Map();
        daftarAset.forEach((a) => map.set(a.id_aset, a));
        return map;
    }, [daftarAset]);

    const asetTerpilihList = useMemo(() => {
        return data.selected_assets.map((id) => asetMap.get(id)).filter(Boolean);
    }, [data.selected_assets, asetMap]);

    const totalNilaiPerolehan = useMemo(() => {
        return asetTerpilihList.reduce((acc, a) => acc + (a.harga_perolehan || 0), 0);
    }, [asetTerpilihList]);

    const dokumenAktif = useMemo(() => {
        return (pengajuan.dokumen || []).filter(
            (doc) => !data.hapus_dokumen.includes(doc.id_dokumen)
        );
    }, [pengajuan.dokumen, data.hapus_dokumen]);

    const handleToggleAset = (idAset) => {
        const exists = data.selected_assets.includes(idAset);
        let baru;
        if (exists) {
            baru = data.selected_assets.filter((id) => id !== idAset);
        } else {
            baru = [...data.selected_assets, idAset];
        }
        setData('selected_assets', baru);
    };

    const handleHapusAsetTerpilih = (idAset) => {
        setData('selected_assets', data.selected_assets.filter((id) => id !== idAset));
    };

    const handlePilihBerkas = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setData('lampiran', [...data.lampiran, ...files]);
        if (berkasInputRef.current) {
            berkasInputRef.current.value = '';
        }
    };

    const handleHapusBerkasBaru = (idx) => {
        setData('lampiran', data.lampiran.filter((_, i) => i !== idx));
    };

    const handleTandaiHapusDokumenLama = (idDokumen) => {
        if (!data.hapus_dokumen.includes(idDokumen)) {
            setData('hapus_dokumen', [...data.hapus_dokumen, idDokumen]);
        }
    };

    const handleBatalkanHapusDokumenLama = (idDokumen) => {
        setData('hapus_dokumen', data.hapus_dokumen.filter((id) => id !== idDokumen));
    };

    const validasiKlien = (tipeAksi) => {
        const listError = [];

        if (!data.perihal || !data.perihal.trim()) {
            listError.push('Perihal usulan penghapusan wajib diisi.');
        }
        if (!data.dasar_usulan) {
            listError.push('Dasar usulan penghapusan wajib dipilih.');
        }
        if (!data.alasan_penghapusan || !data.alasan_penghapusan.trim()) {
            listError.push('Alasan dan penjelasan kondisi aset wajib diisi.');
        }
        if (!data.selected_assets || data.selected_assets.length === 0) {
            listError.push('Minimal harus memilih 1 aset unit yang akan diusulkan untuk dihapuskan.');
        }

        const totalBerkas = dokumenAktif.length + data.lampiran.length;
        if (tipeAksi === 'diajukan' && totalBerkas < 1) {
            listError.push('Minimal 1 berkas foto fisik atau surat usulan penghapusan wajib dilampirkan sebelum mengirim usulan.');
        }

        return listError;
    };

    const kirimFormulir = (tipeAksi) => {
        const errorKlien = validasiKlien(tipeAksi);

        if (errorKlien.length > 0) {
            setDaftarError(errorKlien);
            setModalErrorBuka(true);
            if (bannerErrorRef.current) {
                bannerErrorRef.current.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        setDaftarError([]);
        setModalErrorBuka(false);
        setAksiAktif(tipeAksi);

        const items = data.selected_assets.map((idAset) => ({
            id_aset: idAset,
        }));

        transform((dataAwal) => ({
            ...dataAwal,
            _method: 'put',
            aksi: tipeAksi,
            items: items,
        }));

        post(route('pemohon.penghapusan.update', pengajuan.id_pengajuan), {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setAksiAktif(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Usulan Penghapusan ${pengajuan.nomor_pengajuan}`} />

            <PageHeader
                breadcrumb={['FTI', 'Daftar pengajuan', pengajuan.nomor_pengajuan, 'Edit']}
                judul={`Edit usulan penghapusan (${pengajuan.nomor_pengajuan})`}
                deskripsi="Perbaiki daftar aset, penjelasan kondisi fisik, atau berkas pendukung usulan."
            />

            {/* Kotak Catatan Revisi jika is_revisi */}
            {pengajuan.is_revisi && (
                <div className="mb-6 rounded-kartu border border-warn-700/20 bg-warn-50 p-4">
                    <p className="text-sm font-bold text-warn-800">
                        Catatan Pengembalian / Perbaikan dari Pemeriksa:
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink-800">
                        {pengajuan.catatan_revisi_terakhir || 'Silakan lengkapi berkas foto fisik dan alasan kerusakan aset.'}
                    </p>
                </div>
            )}

            {/* Banner Error Validasi Klien */}
            {daftarError.length > 0 && (
                <div ref={bannerErrorRef} className="mb-6">
                    <Alert nada="bahaya">
                        <p className="font-semibold">Data usulan penghapusan belum lengkap:</p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                            {daftarError.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                </div>
            )}

            {/* Error Server */}
            {Object.keys(errors).length > 0 && (
                <div className="mb-6">
                    <Alert nada="bahaya">
                        <p className="font-semibold">Terdapat kesalahan pengisian formulir:</p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                            {Object.entries(errors).map(([key, err]) => (
                                <li key={key}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                </div>
            )}

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Formulir Utama (8 Kolom) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* Kartu 1: Aset */}
                    <Card
                        judul="1. Aset yang diusulkan"
                        deskripsi="Perbarui perihal, dasar usulan, dan aset unit yang diajukan."
                    >
                        <IsiKartu className="space-y-4">
                            <Field
                                label="Perihal usulan penghapusan"
                                wajib
                                error={errors.perihal}
                            >
                                <TextInput
                                    value={data.perihal}
                                    onChange={(e) => setData('perihal', e.target.value)}
                                    placeholder="Tuliskan perihal usulan..."
                                    className="w-full"
                                />
                            </Field>

                            <Field
                                label="Dasar usulan penghapusan"
                                wajib
                                error={errors.dasar_usulan}
                            >
                                <SelectInput
                                    value={data.dasar_usulan}
                                    onChange={(e) => setData('dasar_usulan', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="Rusak berat / tidak ekonomis">
                                        Rusak berat / biaya perbaikan tidak ekonomis
                                    </option>
                                    <option value="Usia ekonomis habis / usang">
                                        Usia ekonomis habis / teknologi usang
                                    </option>
                                    <option value="Tidak lagi digunakan unit">
                                        Tidak lagi digunakan oleh unit kerja (berlebih)
                                    </option>
                                    <option value="Hilang / force majeure">
                                        Hilang / terkena dampak bencana alam
                                    </option>
                                </SelectInput>
                            </Field>

                            {/* Pilihan Aset */}
                            <div className="border-t border-line pt-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                                        Pilih aset ({daftarAset.length} tersedia) <span className="text-bahaya-600">*</span>
                                    </label>
                                    <span className="text-xs text-ink-500">
                                        Terpilih: <strong>{data.selected_assets.length}</strong> aset
                                    </span>
                                </div>

                                <div className="max-h-60 overflow-y-auto rounded-lg border border-line divide-y divide-line bg-surface/50">
                                    {daftarAset.map((aset) => {
                                        const terpilih = data.selected_assets.includes(aset.id_aset);
                                        return (
                                            <div
                                                key={aset.id_aset}
                                                onClick={() => handleToggleAset(aset.id_aset)}
                                                className={`flex cursor-pointer items-center justify-between p-3 text-xs transition-colors hover:bg-brand-50/50 ${
                                                    terpilih ? 'bg-brand-50 font-medium' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={terpilih}
                                                        onChange={() => {}}
                                                        className="rounded border-line text-brand-600 focus:ring-brand-500"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-ink-900">{aset.nama_barang}</span>
                                                            <Badge nada="netral">{aset.kode_aset}</Badge>
                                                        </div>
                                                        <p className="mt-0.5 text-ink-500">
                                                            Lokasi: <strong>{aset.ruangan_nama}</strong> • Nilai: {formatRupiah(aset.harga_perolehan)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-brand-700">
                                                    {terpilih ? '✓ Dipilih' : '+ Pilih'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Rincian Terpilih */}
                            {asetTerpilihList.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <p className="text-xs font-semibold text-ink-700">Aset terpilih untuk diusulkan:</p>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        {asetTerpilihList.map((aset) => (
                                            <div
                                                key={aset.id_aset}
                                                className="relative rounded-lg border border-brand-200 bg-white p-3 text-xs shadow-sm"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleHapusAsetTerpilih(aset.id_aset)}
                                                    className="absolute top-2 right-2 text-ink-400 hover:text-bahaya-600"
                                                    title="Hapus dari daftar"
                                                >
                                                    ✕
                                                </button>
                                                <p className="font-bold text-ink-900">{aset.nama_barang}</p>
                                                <p className="text-ink-500">{aset.kode_aset}</p>
                                                <div className="mt-2 space-y-0.5 border-t border-line pt-2 text-[11px] text-ink-600">
                                                    <p>Lokasi penyimpanan: <strong>{aset.ruangan_nama}</strong></p>
                                                    <p>Nilai perolehan: <strong>{formatRupiah(aset.harga_perolehan)}</strong></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </IsiKartu>
                    </Card>

                    {/* Kartu 2: Alasan dan Bukti */}
                    <Card
                        judul="2. Alasan dan bukti kondisi aset"
                        deskripsi="Perbarui penjelasan kondisi aset dan kelengkapan dokumen pendukung."
                    >
                        <IsiKartu className="space-y-4">
                            <Field
                                label="Alasan penghapusan & penjelasan kondisi fisik"
                                wajib
                                error={errors.alasan_penghapusan}
                            >
                                <textarea
                                    rows={4}
                                    value={data.alasan_penghapusan}
                                    onChange={(e) => setData('alasan_penghapusan', e.target.value)}
                                    placeholder="Tuliskan alasan dan kondisi aset..."
                                    className="w-full rounded-md border-line bg-surface text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                />
                            </Field>

                            {/* Dokumen Eksisting */}
                            {pengajuan.dokumen && pengajuan.dokumen.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-ink-700">Berkas tersimpan sebelumnya:</p>
                                    <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                                        {pengajuan.dokumen.map((doc) => {
                                            const ditandaiHapus = data.hapus_dokumen.includes(doc.id_dokumen);
                                            return (
                                                <li
                                                    key={doc.id_dokumen}
                                                    className={`flex items-center justify-between p-3 text-xs ${
                                                        ditandaiHapus ? 'bg-bahaya-50/50 opacity-60' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Badge nada={ditandaiHapus ? 'bahaya' : 'info'}>
                                                            {doc.nama_file.split('.').pop()?.toUpperCase()}
                                                        </Badge>
                                                        <span
                                                            className={`font-medium ${
                                                                ditandaiHapus
                                                                    ? 'line-through text-ink-500'
                                                                    : 'text-ink-900'
                                                            }`}
                                                        >
                                                            {doc.nama_file}
                                                        </span>
                                                        {ditandaiHapus && (
                                                            <span className="text-[11px] text-bahaya-600">
                                                                (Akan dihapus)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {ditandaiHapus ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleBatalkanHapusDokumenLama(doc.id_dokumen)}
                                                                className="font-semibold text-brand-600 hover:underline"
                                                            >
                                                                Batalkan
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTandaiHapusDokumenLama(doc.id_dokumen)}
                                                                className="font-semibold text-bahaya-600 hover:underline"
                                                            >
                                                                Hapus
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {/* Unggah Berkas Baru */}
                            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-line p-5 text-center hover:border-brand-400">
                                <label
                                    htmlFor="file-upload-edit-penghapusan"
                                    className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700"
                                >
                                    <span>+ Unggah foto fisik atau surat usulan baru</span>
                                    <input
                                        id="file-upload-edit-penghapusan"
                                        ref={berkasInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={handlePilihBerkas}
                                        className="sr-only"
                                    />
                                </label>
                                <p className="mt-1 text-[11px] text-ink-500">
                                    Format: PDF, Word, atau Gambar (Maks. 10 MB per berkas)
                                </p>
                            </div>

                            {data.lampiran.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-ink-700">Berkas baru yang akan diunggah:</p>
                                    <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                                        {data.lampiran.map((file, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center justify-between p-3 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Badge nada="info">
                                                        {file.name.split('.').pop()?.toUpperCase()}
                                                    </Badge>
                                                    <span className="font-medium text-ink-900">{file.name}</span>
                                                    <span className="text-ink-500">({formatUkuranBerkas(file.size)})</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleHapusBerkasBaru(idx)}
                                                    className="font-semibold text-bahaya-600 hover:underline"
                                                >
                                                    Batal
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </IsiKartu>
                    </Card>

                    {/* Tombol Aksi Bawah */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-kartu border border-line bg-white p-4">
                        <SecondaryButton
                            type="button"
                            disabled={processing}
                            onClick={() => window.history.back()}
                        >
                            Batal
                        </SecondaryButton>

                        <div className="flex items-center gap-3">
                            <SecondaryButton
                                type="button"
                                disabled={processing}
                                onClick={() => kirimFormulir('draft')}
                            >
                                {processing && aksiAktif === 'draft' ? 'Menyimpan...' : 'Simpan perubahan draf'}
                            </SecondaryButton>

                            <PrimaryButton
                                type="button"
                                disabled={processing}
                                onClick={() => kirimFormulir('diajukan')}
                            >
                                {processing && aksiAktif === 'diajukan'
                                    ? 'Memproses...'
                                    : pengajuan.is_revisi
                                    ? 'Kirim ulang usulan penghapusan'
                                    : 'Kirim usulan penghapusan'}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Ringkasan & Info (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    <Card judul="Ringkasan usulan">
                        <IsiKartu className="space-y-3 text-xs">
                            <InfoList
                                item={[
                                    {
                                        label: 'Jumlah aset',
                                        nilai: `${data.selected_assets.length} aset`,
                                    },
                                    {
                                        label: 'Dasar usulan',
                                        nilai: data.dasar_usulan,
                                    },
                                    {
                                        label: 'Estimasi nilai perolehan',
                                        nilai: formatRupiah(totalNilaiPerolehan),
                                    },
                                ]}
                            />
                        </IsiKartu>
                    </Card>

                    <Card judul="Informasi pemohon">
                        <IsiKartu className="space-y-3">
                            <InfoList
                                item={[
                                    { label: 'Nama', nilai: pemohon.nama_lengkap },
                                    { label: 'NIP', nilai: pemohon.nip || '-' },
                                    { label: 'Unit', nilai: pemohon.unit_nama },
                                    { label: 'Sub-unit', nilai: pemohon.sub_unit_nama || '-' },
                                ]}
                            />
                        </IsiKartu>
                    </Card>
                </div>
            </div>

            {/* Modal Error */}
            <Modal
                show={modalErrorBuka}
                onClose={() => setModalErrorBuka(false)}
                maxWidth="md"
            >
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bahaya-100 text-bahaya-600 font-bold">
                            !
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-ink-900">
                                Data usulan belum lengkap
                            </h3>
                            <p className="text-xs text-ink-500">
                                Harap lengkapi isian berikut sebelum mengirimkan usulan:
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-bahaya-200 bg-bahaya-50/50 p-3 text-xs text-bahaya-800">
                        <ul className="list-inside list-disc space-y-1">
                            {daftarError.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <PrimaryButton
                            type="button"
                            onClick={() => setModalErrorBuka(false)}
                        >
                            Mengerti & Periksa Kembali
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
