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
    daftarRuangan = [],
    daftarPengguna = [],
}) {
    const berkasInputRef = useRef(null);
    const bannerErrorRef = useRef(null);
    const [aksiAktif, setAksiAktif] = useState(null);
    const [modalErrorBuka, setModalErrorBuka] = useState(false);
    const [daftarError, setDaftarError] = useState([]);

    // Cari nilai awal ruangan tujuan dan PJ tujuan dari item pertama (bila ada)
    const initialItem = pengajuan.items[0];
    const initialRuanganTujuan = initialItem?.id_ruangan_tujuan ? String(initialItem.id_ruangan_tujuan) : '';
    const initialPjTujuan = initialItem?.id_pengguna_pj_tujuan ? String(initialItem.id_pengguna_pj_tujuan) : '';
    const initialSelectedAssets = pengajuan.items.map((it) => it.id_aset);

    const { data, setData, post, processing, errors, transform } = useForm({
        _method: 'put',
        aksi: 'diajukan',
        perihal: pengajuan.perihal || '',
        jenis_mutasi: pengajuan.jenis_mutasi || 'Antarruangan dalam fakultas',
        tanggal_mutasi: pengajuan.tanggal_mutasi || new Date().toISOString().split('T')[0],
        alasan_mutasi: pengajuan.alasan_mutasi || '',
        id_ruangan_tujuan: initialRuanganTujuan,
        id_pengguna_pj_tujuan: initialPjTujuan,
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

    const ruanganTujuanTerpilih = useMemo(() => {
        if (!data.id_ruangan_tujuan) return null;
        return daftarRuangan.find((r) => String(r.id_ruangan) === String(data.id_ruangan_tujuan));
    }, [data.id_ruangan_tujuan, daftarRuangan]);

    const pjTujuanTerpilih = useMemo(() => {
        if (!data.id_pengguna_pj_tujuan) return null;
        return daftarPengguna.find((p) => String(p.id_pengguna) === String(data.id_pengguna_pj_tujuan));
    }, [data.id_pengguna_pj_tujuan, daftarPengguna]);

    const asetTerpilihList = useMemo(() => {
        return data.selected_assets.map((id) => asetMap.get(id)).filter(Boolean);
    }, [data.selected_assets, asetMap]);

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
            listError.push('Perihal mutasi wajib diisi.');
        }
        if (!data.tanggal_mutasi) {
            listError.push('Tanggal usulan pemindahan wajib diisi.');
        }
        if (!data.alasan_mutasi || !data.alasan_mutasi.trim()) {
            listError.push('Alasan dan pertimbangan mutasi wajib diisi.');
        }
        if (!data.selected_assets || data.selected_assets.length === 0) {
            listError.push('Minimal harus memilih 1 aset unit yang akan dimutasi.');
        }
        if (!data.id_ruangan_tujuan) {
            listError.push('Lokasi ruangan tujuan wajib dipilih.');
        }

        if (data.id_ruangan_tujuan && data.selected_assets.length > 0) {
            data.selected_assets.forEach((idAset) => {
                const aset = asetMap.get(idAset);
                if (aset && String(aset.id_ruangan_asal) === String(data.id_ruangan_tujuan)) {
                    const pjBerubah = data.id_pengguna_pj_tujuan && String(data.id_pengguna_pj_tujuan) !== String(aset.id_pengguna_pj_asal);
                    if (!pjBerubah) {
                        listError.push(
                            `Aset "${aset.nama_barang}": Ruangan tujuan tidak boleh sama dengan ruangan asal (${aset.ruangan_asal_nama}) kecuali penanggung jawab tujuan diubah.`
                        );
                    }
                }
            });
        }

        const totalBerkas = dokumenAktif.length + data.lampiran.length;
        if (tipeAksi === 'diajukan' && totalBerkas < 1) {
            listError.push('Minimal 1 berkas dokumen persetujuan penerima / pendukung mutasi wajib dilampirkan sebelum mengirim usulan.');
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
            id_ruangan_tujuan: parseInt(data.id_ruangan_tujuan, 10),
            id_pengguna_pj_tujuan: data.id_pengguna_pj_tujuan ? parseInt(data.id_pengguna_pj_tujuan, 10) : null,
        }));

        transform((dataAwal) => ({
            ...dataAwal,
            _method: 'put',
            aksi: tipeAksi,
            items: items,
        }));

        post(route('pemohon.mutasi.update', pengajuan.id_pengajuan), {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setAksiAktif(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Pengajuan Mutasi ${pengajuan.nomor_pengajuan}`} />

            <PageHeader
                breadcrumb={['FTI', 'Daftar pengajuan', pengajuan.nomor_pengajuan, 'Edit']}
                judul={`Edit pengajuan mutasi (${pengajuan.nomor_pengajuan})`}
                deskripsi="Perbaiki data aset, lokasi tujuan, atau lampiran dokumen pendukung sebelum dikirim ulang."
            />

            {/* Kotak Catatan Revisi jika is_revisi */}
            {pengajuan.is_revisi && (
                <div className="mb-6 rounded-kartu border border-warn-700/20 bg-warn-50 p-4">
                    <p className="text-sm font-bold text-warn-800">
                        Catatan Pengembalian / Perbaikan dari Pemeriksa:
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink-800">
                        {pengajuan.catatan_revisi_terakhir || 'Silakan lengkapi berkas dan rincian aset yang diminta.'}
                    </p>
                </div>
            )}

            {/* Banner Error Validasi Klien */}
            {daftarError.length > 0 && (
                <div ref={bannerErrorRef} className="mb-6">
                    <Alert nada="bahaya">
                        <p className="font-semibold">Data pengajuan mutasi belum lengkap:</p>
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
                    {/* Kartu 1: Aset Asal */}
                    <Card
                        judul="1. Aset asal & identitas usulan"
                        deskripsi="Perbarui perihal, jenis mutasi, serta aset yang ingin dipindahkan."
                    >
                        <IsiKartu className="space-y-4">
                            <Field
                                label="Perihal pengajuan mutasi"
                                wajib
                                error={errors.perihal}
                            >
                                <TextInput
                                    value={data.perihal}
                                    onChange={(e) => setData('perihal', e.target.value)}
                                    placeholder="Tuliskan perihal mutasi..."
                                    className="w-full"
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Jenis mutasi"
                                    wajib
                                    error={errors.jenis_mutasi}
                                >
                                    <SelectInput
                                        value={data.jenis_mutasi}
                                        onChange={(e) => setData('jenis_mutasi', e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="Antarruangan dalam fakultas">
                                            Antarruangan dalam fakultas
                                        </option>
                                        <option value="Perubahan penanggung jawab">
                                            Perubahan penanggung jawab
                                        </option>
                                        <option value="Antarunit kerja internal FTI">
                                            Antarunit kerja internal FTI
                                        </option>
                                    </SelectInput>
                                </Field>

                                <Field
                                    label="Tanggal usulan pemindahan"
                                    wajib
                                    error={errors.tanggal_mutasi}
                                >
                                    <TextInput
                                        type="date"
                                        value={data.tanggal_mutasi}
                                        onChange={(e) => setData('tanggal_mutasi', e.target.value)}
                                        className="w-full"
                                    />
                                </Field>
                            </div>

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
                                                            Lokasi: <strong>{aset.ruangan_asal_nama}</strong> • PJ: {aset.pj_asal_nama}
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

                            {/* Rincian Aset Terpilih */}
                            {asetTerpilihList.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <p className="text-xs font-semibold text-ink-700">Rincian aset yang dipilih:</p>
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
                                                    <p>Lokasi saat ini: <strong>{aset.ruangan_asal_nama}</strong></p>
                                                    <p>Penanggung jawab: <strong>{aset.pj_asal_nama}</strong></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </IsiKartu>
                    </Card>

                    {/* Kartu 2: Tujuan & Alasan */}
                    <Card
                        judul="2. Tujuan dan alasan pemindahan"
                        deskripsi="Perbarui ruangan tujuan, penanggung jawab baru, serta alasan usulan."
                    >
                        <IsiKartu className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Lokasi ruangan tujuan"
                                    wajib
                                    error={errors.id_ruangan_tujuan}
                                >
                                    <SelectInput
                                        value={data.id_ruangan_tujuan}
                                        onChange={(e) => setData('id_ruangan_tujuan', e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">-- Pilih ruangan tujuan --</option>
                                        {daftarRuangan.map((r) => (
                                            <option key={r.id_ruangan} value={r.id_ruangan}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </Field>

                                <Field
                                    label="Penanggung jawab baru (opsional)"
                                    error={errors.id_pengguna_pj_tujuan}
                                >
                                    <SelectInput
                                        value={data.id_pengguna_pj_tujuan}
                                        onChange={(e) => setData('id_pengguna_pj_tujuan', e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">-- Tetap penanggung jawab lama / Ditentukan operator --</option>
                                        {daftarPengguna.map((p) => (
                                            <option key={p.id_pengguna} value={p.id_pengguna}>
                                                {p.nama_lengkap} {p.nip ? `(NIP: ${p.nip})` : ''}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </Field>
                            </div>

                            <Field
                                label="Alasan & pertimbangan mutasi"
                                wajib
                                error={errors.alasan_mutasi}
                            >
                                <textarea
                                    rows={4}
                                    value={data.alasan_mutasi}
                                    onChange={(e) => setData('alasan_mutasi', e.target.value)}
                                    placeholder="Tuliskan alasan mutasi..."
                                    className="w-full rounded-md border-line bg-surface text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                />
                            </Field>
                        </IsiKartu>
                    </Card>

                    {/* Kartu 3: Dokumen Lampiran */}
                    <Card
                        judul="3. Dokumen persetujuan penerima / pendukung"
                        deskripsi="Periksa dokumen yang sudah diunggah atau tambahkan berkas baru."
                    >
                        <IsiKartu className="space-y-4">
                            {/* Berkas Tersimpan */}
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
                                    htmlFor="file-upload-edit"
                                    className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700"
                                >
                                    <span>+ Unggah berkas dokumen baru</span>
                                    <input
                                        id="file-upload-edit"
                                        ref={berkasInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        onChange={handlePilihBerkas}
                                        className="sr-only"
                                    />
                                </label>
                                <p className="mt-1 text-[11px] text-ink-500">
                                    Format: PDF, Word, Excel, atau Gambar (Maks. 10 MB per berkas)
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
                                    ? 'Kirim ulang pengajuan mutasi'
                                    : 'Kirim pengajuan mutasi'}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Ringkasan & Info (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    <Card judul="Ringkasan perpindahan aset">
                        <IsiKartu className="space-y-3 text-xs">
                            <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3 text-ink-900">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-800">
                                    Alur Perpindahan
                                </p>
                                <div className="mt-2 space-y-2">
                                    <div>
                                        <span className="text-ink-500">Lokasi Asal:</span>
                                        <p className="font-semibold text-ink-900">
                                            {asetTerpilihList.length > 0
                                                ? Array.from(new Set(asetTerpilihList.map((a) => a.ruangan_asal_nama))).join(', ')
                                                : '-'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-brand-600">
                                        <span>↓ Menuju ke</span>
                                    </div>
                                    <div>
                                        <span className="text-ink-500">Lokasi Tujuan:</span>
                                        <p className="font-semibold text-brand-700">
                                            {ruanganTujuanTerpilih ? ruanganTujuanTerpilih.label : 'Belum dipilih'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <InfoList
                                item={[
                                    {
                                        label: 'Jumlah aset',
                                        nilai: `${data.selected_assets.length} aset`,
                                    },
                                    {
                                        label: 'Jenis mutasi',
                                        nilai: data.jenis_mutasi,
                                    },
                                    {
                                        label: 'Tgl rencana',
                                        nilai: data.tanggal_mutasi || '-',
                                    },
                                    {
                                        label: 'PJ baru',
                                        nilai: pjTujuanTerpilih ? pjTujuanTerpilih.nama_lengkap : 'Sesuai eksisting',
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
                                Data pengajuan mutasi belum lengkap
                            </h3>
                            <p className="text-xs text-ink-500">
                                Harap lengkapi isian berikut sebelum mengirimkan pengajuan:
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
