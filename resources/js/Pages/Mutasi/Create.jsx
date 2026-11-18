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

export default function Create({ pemohon, daftarAset = [], daftarRuangan = [], daftarPengguna = [] }) {
    const berkasInputRef = useRef(null);
    const bannerErrorRef = useRef(null);
    const [aksiAktif, setAksiAktif] = useState(null);
    const [modalErrorBuka, setModalErrorBuka] = useState(false);
    const [daftarError, setDaftarError] = useState([]);

    const { data, setData, post, processing, errors, transform } = useForm({
        aksi: 'diajukan',
        perihal: '',
        jenis_mutasi: 'Antarruangan dalam fakultas',
        tanggal_mutasi: new Date().toISOString().split('T')[0],
        alasan_mutasi: '',
        id_ruangan_tujuan: '',
        id_pengguna_pj_tujuan: '',
        selected_assets: [], // array of id_aset
        items: [],
        lampiran: [],
    });

    // Lookup cepat aset berdasarkan ID
    const asetMap = useMemo(() => {
        const map = new Map();
        daftarAset.forEach((a) => map.set(a.id_aset, a));
        return map;
    }, [daftarAset]);

    // Lookup cepat ruangan tujuan
    const ruanganTujuanTerpilih = useMemo(() => {
        if (!data.id_ruangan_tujuan) return null;
        return daftarRuangan.find((r) => String(r.id_ruangan) === String(data.id_ruangan_tujuan));
    }, [data.id_ruangan_tujuan, daftarRuangan]);

    // Lookup cepat penanggung jawab tujuan
    const pjTujuanTerpilih = useMemo(() => {
        if (!data.id_pengguna_pj_tujuan) return null;
        return daftarPengguna.find((p) => String(p.id_pengguna) === String(data.id_pengguna_pj_tujuan));
    }, [data.id_pengguna_pj_tujuan, daftarPengguna]);

    // Daftar objek aset terpilih
    const asetTerpilihList = useMemo(() => {
        return data.selected_assets.map((id) => asetMap.get(id)).filter(Boolean);
    }, [data.selected_assets, asetMap]);

    // Stepper dinamis (1: Pilih aset & tujuan -> 2: Lampirkan dokumen -> 3: Siap kirim)
    const tahapProgres = useMemo(() => {
        const step1 = data.selected_assets.length > 0 && data.id_ruangan_tujuan && data.perihal && data.alasan_mutasi;
        const step2 = data.lampiran.length > 0;
        return {
            step1,
            step2,
            step3: step1 && step2,
        };
    }, [data]);

    // Toggle pilihan aset
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

    // Unggah dokumen
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

    // Validasi klien
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

        // Cek apakah ruangan tujuan sama dengan ruangan asal untuk setiap aset
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

        if (tipeAksi === 'diajukan' && (!data.lampiran || data.lampiran.length === 0)) {
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

        // Siapkan struktur items
        const items = data.selected_assets.map((idAset) => ({
            id_aset: idAset,
            id_ruangan_tujuan: parseInt(data.id_ruangan_tujuan, 10),
            id_pengguna_pj_tujuan: data.id_pengguna_pj_tujuan ? parseInt(data.id_pengguna_pj_tujuan, 10) : null,
        }));

        transform((dataAwal) => ({
            ...dataAwal,
            aksi: tipeAksi,
            items: items,
        }));

        post(route('pemohon.pengajuan.mutasi.store'), {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setAksiAktif(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pengajuan Mutasi Aset" />

            <PageHeader
                breadcrumb={['FTI', 'Pengajuan mutasi', 'Baru']}
                judul="Pengajuan mutasi aset"
                deskripsi="Ajukan permohonan pemindahan ruangan atau pergantian penanggung jawab aset unit dalam Fakultas Teknologi Informasi."
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
                            <p className="text-sm font-semibold text-ink-900">1. Pilih Aset & Tujuan</p>
                            <p className="text-xs text-ink-500">Aset asal, lokasi tujuan, dan alasan</p>
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
                            <p className="text-sm font-semibold text-ink-900">2. Lampirkan Dokumen</p>
                            <p className="text-xs text-ink-500">Persetujuan penerima / berkas pendukung</p>
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
                            <p className="text-sm font-semibold text-ink-900">3. Kirim Pengajuan</p>
                            <p className="text-xs text-ink-500">Verifikasi operator & pimpinan</p>
                        </div>
                    </div>
                </div>
            </div>

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
                    {/* Kartu 1: Aset Asal & Pilihan Barang */}
                    <Card
                        judul="1. Aset asal & identitas usulan"
                        deskripsi="Pilih aset unit yang akan dipindahkan dan tentukan jenis mutasinya."
                    >
                        <IsiKartu className="space-y-4">
                            <Field
                                label="Perihal pengajuan mutasi"
                                wajib
                                error={errors.perihal}
                                petunjuk="Contoh: Pemindahan Komputer Lab ke Ruang Riset Dosen"
                            >
                                <TextInput
                                    value={data.perihal}
                                    onChange={(e) => setData('perihal', e.target.value)}
                                    placeholder="Tuliskan perihal ringkas pengajuan mutasi..."
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

                            {/* Pemilihan Aset Unit */}
                            <div className="border-t border-line pt-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                                        Pilih aset unit ({daftarAset.length} aset tersedia) <span className="text-bahaya-600">*</span>
                                    </label>
                                    <span className="text-xs text-ink-500">
                                        Terpilih: <strong>{data.selected_assets.length}</strong> aset
                                    </span>
                                </div>

                                {daftarAset.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-line p-6 text-center text-xs text-ink-500">
                                        Tidak ada aset aktif berpenempatan yang ditemukan pada unit kerja Anda yang dapat diajukan mutasi saat ini.
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
                                                                <Badge nada="info">{aset.kategori}</Badge>
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
                                )}
                            </div>

                            {/* Daftar Kartu Info Aset Terpilih */}
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
                                                <p className="text-ink-500">{aset.kode_aset} • {aset.kategori}</p>
                                                <div className="mt-2 space-y-0.5 border-t border-line pt-2 text-[11px] text-ink-600">
                                                    <p>Lokasi saat ini: <strong>{aset.ruangan_asal_nama}</strong></p>
                                                    <p>Penanggung jawab: <strong>{aset.pj_asal_nama}</strong></p>
                                                    <p>Kondisi: <span className="capitalize">{aset.kondisi}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </IsiKartu>
                    </Card>

                    {/* Kartu 2: Tujuan & Alasan Pemindahan */}
                    <Card
                        judul="2. Tujuan dan alasan pemindahan"
                        deskripsi="Tentukan ruangan baru, penanggung jawab baru, serta pertimbangan mutasi aset."
                    >
                        <IsiKartu className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Lokasi ruangan tujuan"
                                    wajib
                                    error={errors.id_ruangan_tujuan}
                                    petunjuk="Pilih ruangan penempatan baru"
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
                                    petunjuk="Kosongkan jika tetap atau ditentukan saat eksekusi"
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
                                petunjuk="Jelaskan kebutuhan operasional dan urgensi pemindahan aset tersebut"
                            >
                                <textarea
                                    rows={4}
                                    value={data.alasan_mutasi}
                                    onChange={(e) => setData('alasan_mutasi', e.target.value)}
                                    placeholder="Contoh: Kebutuhan penambahan sarana komputer di ruang riset untuk mendukung praktikum mahasiswa..."
                                    className="w-full rounded-md border-line bg-surface text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                />
                            </Field>
                        </IsiKartu>
                    </Card>

                    {/* Kartu 3: Dokumen Pendukung */}
                    <Card
                        judul="3. Dokumen persetujuan penerima / pendukung"
                        deskripsi="Unggah berkas berita acara kesediaan, surat permohonan, atau memo disposisi (Wajib saat mengirim pengajuan)."
                    >
                        <IsiKartu className="space-y-4">
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
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                                <div className="mt-2 text-xs text-ink-600">
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer font-semibold text-brand-600 hover:text-brand-700"
                                    >
                                        <span>Pilih berkas dari komputer</span>
                                        <input
                                            id="file-upload"
                                            ref={berkasInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                            onChange={handlePilihBerkas}
                                            className="sr-only"
                                        />
                                    </label>
                                </div>
                                <p className="text-[11px] text-ink-500">
                                    Format: PDF, Word, Excel, atau Gambar (Maks. 10 MB per berkas)
                                </p>
                            </div>

                            {data.lampiran.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-ink-700">Berkas yang akan diunggah:</p>
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
                                {processing && aksiAktif === 'draft' ? 'Menyimpan...' : 'Simpan draf'}
                            </SecondaryButton>

                            <PrimaryButton
                                type="button"
                                disabled={processing}
                                onClick={() => kirimFormulir('diajukan')}
                            >
                                {processing && aksiAktif === 'diajukan' ? 'Memproses...' : 'Kirim pengajuan mutasi'}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Ringkasan & Info Unit (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Ringkasan Perpindahan Dinamis */}
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

                            {/* Kotak Peringatan */}
                            <div className="rounded-lg border border-info-200 bg-info-50 p-3 text-[11px] text-info-800 leading-relaxed">
                                <strong>Catatan Prosedur:</strong> Pengajuan mutasi ini tidak langsung mengubah lokasi fisik atau penempatan aset dalam database. Perpindahan penempatan aset baru akan otomatis efektif setelah disetujui Kepala Kantor & Pimpinan, lalu dieksekusi oleh Operator Aset.
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* Informasi Pengusul */}
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

            {/* Modal Pop-up Error Validasi Klien */}
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
