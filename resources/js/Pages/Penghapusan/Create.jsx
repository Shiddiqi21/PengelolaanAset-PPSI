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

export default function Create({ pemohon, daftarAset = [] }) {
    const berkasInputRef = useRef(null);
    const bannerErrorRef = useRef(null);
    const [aksiAktif, setAksiAktif] = useState(null);
    const [modalErrorBuka, setModalErrorBuka] = useState(false);
    const [daftarError, setDaftarError] = useState([]);

    const { data, setData, post, processing, errors, transform } = useForm({
        aksi: 'diajukan',
        perihal: '',
        dasar_usulan: 'Rusak berat / tidak ekonomis',
        alasan_penghapusan: '',
        selected_assets: [], // array of id_aset
        items: [],
        lampiran: [],
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

    // Stepper dinamis
    const tahapProgres = useMemo(() => {
        const step1 = data.selected_assets.length > 0 && data.perihal && data.alasan_penghapusan;
        const step2 = data.lampiran.length > 0;
        return {
            step1,
            step2,
            step3: step1 && step2,
        };
    }, [data]);

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

    const handleHapusBerkas = (idx) => {
        setData('lampiran', data.lampiran.filter((_, i) => i !== idx));
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
        if (tipeAksi === 'diajukan' && (!data.lampiran || data.lampiran.length === 0)) {
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
            aksi: tipeAksi,
            items: items,
        }));

        post(route('pemohon.pengajuan.penghapusan.store'), {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setAksiAktif(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pengajuan Penghapusan Aset" />

            <PageHeader
                breadcrumb={['FTI', 'Pengajuan penghapusan', 'Baru']}
                judul="Pengajuan penghapusan aset"
                deskripsi="Ajukan usulan pelepasan atau penghapusan aset unit yang rusak berat, usang, atau tidak ekonomis diperbaiki."
            />

            {/* Stepper Progres Dinamis */}
            <div className="mb-6 rounded-kartu border border-line bg-surface p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                tahapProgres.step1
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-brand-100 text-brand-700'
                            }`}
                        >
                            1
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-ink-900">1. Pilih Aset & Alasan</p>
                            <p className="text-xs text-ink-500">Aset unit, dasar usulan, dan kondisi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                tahapProgres.step2
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-brand-100 text-brand-700'
                            }`}
                        >
                            2
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-ink-900">2. Lampirkan Foto & Surat</p>
                            <p className="text-xs text-ink-500">Bukti fisik rusak / surat pengantar</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                tahapProgres.step3
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-ink-100 text-ink-500'
                            }`}
                        >
                            3
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-ink-900">3. Kirim Usulan</p>
                            <p className="text-xs text-ink-500">Pemeriksaan berjenjang & SK Rektor</p>
                        </div>
                    </div>
                </div>
            </div>

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
                    {/* Kartu 1: Aset yang Diusulkan */}
                    <Card
                        judul="1. Aset yang diusulkan"
                        deskripsi="Pilih aset unit yang memenuhi kriteria penghapusan beserta dasar usulannya."
                    >
                        <IsiKartu className="space-y-4">
                            <Field
                                label="Perihal usulan penghapusan"
                                wajib
                                error={errors.perihal}
                                petunjuk="Contoh: Usulan Penghapusan PC Rusak Berat Lab Komputer"
                            >
                                <TextInput
                                    value={data.perihal}
                                    onChange={(e) => setData('perihal', e.target.value)}
                                    placeholder="Tuliskan perihal ringkas usulan..."
                                    className="w-full"
                                />
                            </Field>

                            <Field
                                label="Dasar usulan penghapusan"
                                wajib
                                error={errors.dasar_usulan}
                                petunjuk="Kategori pertimbangan utama pelepasan aset"
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

                            {/* Pilihan Aset Unit */}
                            <div className="border-t border-line pt-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                                        Pilih aset unit ({daftarAset.length} aset aktif tersedia) <span className="text-bahaya-600">*</span>
                                    </label>
                                    <span className="text-xs text-ink-500">
                                        Terpilih: <strong>{data.selected_assets.length}</strong> aset
                                    </span>
                                </div>

                                {daftarAset.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-line p-6 text-center text-xs text-ink-500">
                                        Tidak ada aset aktif berpenempatan yang ditemukan pada unit kerja Anda yang dapat diajukan penghapusan saat ini.
                                    </div>
                                ) : (
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
                                                                <Badge nada={aset.kondisi === 'rusak_berat' ? 'bahaya' : 'peringatan'}>
                                                                    {aset.kondisi}
                                                                </Badge>
                                                            </div>
                                                            <p className="mt-0.5 text-ink-500">
                                                                Lokasi: <strong>{aset.ruangan_nama}</strong> • Tahun: {aset.tahun_perolehan} • Nilai: {formatRupiah(aset.harga_perolehan)}
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
                                )}
                            </div>

                            {/* Kartu Rincian Aset Terpilih */}
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
                                                <p className="text-ink-500">{aset.kode_aset} • {aset.kategori}</p>
                                                <div className="mt-2 space-y-0.5 border-t border-line pt-2 text-[11px] text-ink-600">
                                                    <p>Lokasi penyimpanan: <strong>{aset.ruangan_nama}</strong></p>
                                                    <p>Tahun perolehan: <strong>{aset.tahun_perolehan}</strong></p>
                                                    <p>Kondisi saat ini: <span className="capitalize font-semibold text-bahaya-700">{aset.kondisi}</span></p>
                                                    <p>Nilai perolehan: <strong>{formatRupiah(aset.harga_perolehan)}</strong></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </IsiKartu>
                    </Card>

                    {/* Kartu 2: Alasan dan Bukti Kondisi */}
                    <Card
                        judul="2. Alasan dan bukti kondisi aset"
                        deskripsi="Jelaskan kondisi fisik kerusakan aset dan unggah foto fisik pendukung."
                    >
                        <IsiKartu className="space-y-4">
                            <Field
                                label="Alasan penghapusan & penjelasan kondisi fisik"
                                wajib
                                error={errors.alasan_penghapusan}
                                petunjuk="Uraikan kronologi kerusakan, upaya perbaikan yang pernah dilakukan, atau kajian kelayakan teknis"
                            >
                                <textarea
                                    rows={4}
                                    value={data.alasan_penghapusan}
                                    onChange={(e) => setData('alasan_penghapusan', e.target.value)}
                                    placeholder="Contoh: Perangkat mengalami kerusakan motherboard dan monitor tidak menyala. Berdasarkan pemeriksaan teknisi, biaya penggantian suku cadang melebihi nilai ekonomis aset..."
                                    className="w-full rounded-md border-line bg-surface text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                />
                            </Field>

                            {/* Unggah Foto Fisik & Surat */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                                    Foto fisik aset dan surat usulan <span className="text-bahaya-600">*</span>
                                </label>
                                <p className="text-xs text-ink-500 mb-2">
                                    Lampirkan minimal satu foto fisik yang memperlihatkan kondisi terkini atau nota dinas permohonan penghapusan (Wajib saat mengirim usulan).
                                </p>

                                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-line p-6 text-center hover:border-brand-400">
                                    <svg
                                        className="mx-auto h-10 w-10 text-ink-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <div className="mt-2 text-xs text-ink-600">
                                        <label
                                            htmlFor="file-upload-penghapusan"
                                            className="cursor-pointer font-semibold text-brand-600 hover:text-brand-700"
                                        >
                                            <span>Pilih foto fisik atau dokumen PDF</span>
                                            <input
                                                id="file-upload-penghapusan"
                                                ref={berkasInputRef}
                                                type="file"
                                                multiple
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                onChange={handlePilihBerkas}
                                                className="sr-only"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-ink-500">
                                        Format: PDF, JPG, PNG, atau DOCX (Maks. 10 MB per berkas)
                                    </p>
                                </div>
                            </div>

                            {data.lampiran.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-ink-700">Berkas yang akan dilampirkan:</p>
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
                                                    onClick={() => handleHapusBerkas(idx)}
                                                    className="font-semibold text-bahaya-600 hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Blok Rekomendasi Teknisi */}
                            <div className="rounded-lg border border-line bg-surface/70 p-3.5 text-xs text-ink-700">
                                <p className="font-semibold text-ink-900">
                                    ℹ Rekomendasi Tim Teknisi / Peneliti:
                                </p>
                                <p className="mt-1 text-ink-600 leading-relaxed">
                                    Penilaian teknis resmi dan kajian penghapusan aset akan dilakukan oleh Tim Peneliti Fakultas pada tahap pemeriksaan berkas oleh Operator Aset.
                                </p>
                            </div>
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
                                {processing && aksiAktif === 'draft' ? 'Menyimpan...' : 'Simpan draf usulan'}
                            </SecondaryButton>

                            <PrimaryButton
                                type="button"
                                disabled={processing}
                                onClick={() => kirimFormulir('diajukan')}
                            >
                                {processing && aksiAktif === 'diajukan' ? 'Memproses...' : 'Kirim usulan pemeriksaan'}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Ringkasan & Alur (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Kotak Peringatan Status Aset */}
                    <div className="rounded-kartu border border-warn-300 bg-warn-50 p-4 text-xs text-warn-900 leading-relaxed shadow-sm">
                        <p className="font-bold text-warn-800 flex items-center gap-1.5 mb-1.5">
                            <span>⚠</span> Perhatian Prosedur Penghapusan
                        </p>
                        Usulan ini tidak berarti aset telah otomatis dihapus dari master data. Aset fisik tetap harus disimpan, dirawat, dan diamankan di ruangan sampai keputusan resmi Rektorat serta berita acara pelaksanaan fisik tersedia.
                    </div>

                    {/* Ringkasan Usulan */}
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
                                    {
                                        label: 'Berkas foto/surat',
                                        nilai: `${data.lampiran.length} berkas`,
                                    },
                                ]}
                            />
                        </IsiKartu>
                    </Card>

                    {/* Alur Persetujuan Penghapusan */}
                    <Card judul="Alur penghapusan aset">
                        <IsiKartu className="space-y-3 text-xs">
                            <div className="space-y-2.5">
                                <div className="flex items-start gap-2.5">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                                        1
                                    </span>
                                    <div>
                                        <p className="font-semibold text-ink-900">Pemeriksaan & Kajian</p>
                                        <p className="text-[11px] text-ink-500">Operator Aset & Kepala Kantor memeriksa fisik dan berkas usulan.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                                        2
                                    </span>
                                    <div>
                                        <p className="font-semibold text-ink-900">Persetujuan Pimpinan</p>
                                        <p className="text-[11px] text-ink-500">Dekan / Wakil Dekan menyetujui usulan untuk diteruskan ke Rektorat.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                                        3
                                    </span>
                                    <div>
                                        <p className="font-semibold text-ink-900">Pelaksanaan 3 Jalur</p>
                                        <p className="text-[11px] text-ink-500">Eksekusi via Sharing Internal, Hibah Luar, atau Penjualan/Lelang oleh Operator.</p>
                                    </div>
                                </div>
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* Info Pemohon */}
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

            {/* Modal Pop-up Error Validasi */}
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
                                Data usulan penghapusan belum lengkap
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
