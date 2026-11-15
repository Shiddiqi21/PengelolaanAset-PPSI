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
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

/**
 * Format angka ke mata uang Rupiah (IDR).
 */
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka || 0);
}

/**
 * Format ukuran berkas ke satuan yang mudah dibaca.
 */
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
    kategoriAset = [],
    ruangan = [],
}) {
    const berkasInputRef = useRef(null);
    const [aksiAktif, setAksiAktif] = useState(null);
    const [dokumenTersimpan, setDokumenTersimpan] = useState(pengajuan.dokumen || []);

    const { data, setData, post, processing, errors, transform } = useForm({
        _method: 'PUT',
        aksi: 'diajukan',
        perihal: pengajuan.perihal || '',
        sumber_dana: pengajuan.sumber_dana || 'RKAT FTI 2026',
        id_ruangan: pengajuan.id_ruangan ? String(pengajuan.id_ruangan) : '',
        alasan: pengajuan.alasan || '',
        items: pengajuan.items && pengajuan.items.length > 0
            ? pengajuan.items.map((it) => ({
                  id_kategori: String(it.id_kategori || (kategoriAset[0]?.id_kategori ?? '')),
                  nama_barang: it.nama_barang || '',
                  spesifikasi: it.spesifikasi || '',
                  jumlah: it.jumlah || 1,
                  harga_satuan: it.harga_satuan ? String(Math.round(it.harga_satuan)) : '',
              }))
            : [
                  {
                      id_kategori: kategoriAset[0]?.id_kategori ? String(kategoriAset[0].id_kategori) : '',
                      nama_barang: '',
                      spesifikasi: '',
                      jumlah: 1,
                      harga_satuan: '',
                  },
              ],
        lampiran: [],
        hapus_dokumen: [],
    });

    // Tambah baris barang baru
    const tambahBarang = () => {
        setData('items', [
            ...data.items,
            {
                id_kategori: kategoriAset[0]?.id_kategori ? String(kategoriAset[0].id_kategori) : '',
                nama_barang: '',
                spesifikasi: '',
                jumlah: 1,
                harga_satuan: '',
            },
        ]);
    };

    // Hapus baris barang
    const hapusBarang = (indeks) => {
        if (data.items.length <= 1) return;
        setData(
            'items',
            data.items.filter((_, i) => i !== indeks)
        );
    };

    // Perbarui nilai kolom pada baris barang
    const perbaruiBarang = (indeks, kolom, nilai) => {
        const itemBaru = [...data.items];
        itemBaru[indeks] = {
            ...itemBaru[indeks],
            [kolom]: nilai,
        };
        setData('items', itemBaru);
    };

    // Tambah berkas lampiran baru
    const handlePilihBerkas = (e) => {
        const berkasBaru = Array.from(e.target.files || []);
        if (berkasBaru.length > 0) {
            setData('lampiran', [...data.lampiran, ...berkasBaru]);
        }
        if (berkasInputRef.current) {
            berkasInputRef.current.value = '';
        }
    };

    // Hapus berkas lampiran baru
    const hapusBerkasBaru = (indeks) => {
        setData(
            'lampiran',
            data.lampiran.filter((_, i) => i !== indeks)
        );
    };

    // Tandai dokumen tersimpan untuk dihapus
    const hapusDokumenLama = (idDokumen) => {
        setDokumenTersimpan((prev) => prev.filter((d) => d.id_dokumen !== idDokumen));
        setData('hapus_dokumen', [...data.hapus_dokumen, idDokumen]);
    };

    // Kirim formulir dengan aksi yang ditentukan (draft atau diajukan)
    const kirimFormulir = (tipeAksi) => {
        setAksiAktif(tipeAksi);
        transform((dataForm) => ({
            ...dataForm,
            _method: 'PUT',
            aksi: tipeAksi,
        }));

        post(route('pemohon.pengajuan.update', pengajuan.id_pengajuan), {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setAksiAktif(null),
        });
    };

    // Perhitungan ringkasan real-time
    const totalUnit = data.items.reduce((total, item) => total + (parseInt(item.jumlah, 10) || 0), 0);
    const totalEstimasi = data.items.reduce((total, item) => {
        const jumlah = parseInt(item.jumlah, 10) || 0;
        const harga = parseFloat(item.harga_satuan) || 0;
        return total + jumlah * harga;
    }, 0);

    const ruanganTerpilih = ruangan.find((r) => String(r.id_ruangan) === String(data.id_ruangan));

    // Validasi reaktif indikator langkah (stepper)
    const langkah1Lengkap = Boolean(
        data.perihal?.trim() &&
        data.sumber_dana?.trim() &&
        data.alasan?.trim() &&
        data.items &&
        data.items.length > 0 &&
        data.items.some(
            (item) =>
                item.id_kategori &&
                item.nama_barang?.trim() &&
                item.spesifikasi?.trim() &&
                parseInt(item.jumlah, 10) >= 1 &&
                parseFloat(item.harga_satuan) > 0
        )
    );

    const totalDokumen = dokumenTersimpan.length + data.lampiran.length;
    const langkah2Lengkap = totalDokumen > 0;
    const langkah3Siap = langkah1Lengkap;

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Pengajuan ${pengajuan.nomor_pengajuan}`} />

            <PageHeader
                breadcrumb={['FTI', 'Daftar pengajuan', pengajuan.nomor_pengajuan, 'Edit']}
                judul={`Edit Pengajuan ${pengajuan.nomor_pengajuan}`}
                deskripsi={
                    pengajuan.is_revisi
                        ? 'Perbaiki dan sesuaikan usulan pengadaan sesuai catatan kekurangan dari pemeriksa.'
                        : 'Perbarui draf usulan pengadaan sebelum diajukan ke antrean verifikasi.'
                }
            >
                <div className="flex items-center gap-2">
                    <Badge nada={pengajuan.is_revisi ? 'peringatan' : 'netral'}>
                        {pengajuan.is_revisi ? 'Perlu Revisi' : 'Draf'}
                    </Badge>
                    <TombolLink
                        href={route('pemohon.pengajuan.show', pengajuan.id_pengajuan)}
                        varian="sekunder"
                    >
                        Batal
                    </TombolLink>
                </div>
            </PageHeader>

            {/* Kotak Peringatan Catatan Revisi */}
            {pengajuan.is_revisi && (
                <div className="mb-6">
                    <Alert
                        nada="peringatan"
                        judul="Catatan Perbaikan dari Pemeriksa"
                    >
                        <p className="mt-1 text-sm text-ink-800">
                            Pengajuan ini dikembalikan untuk dilengkapi atau diperbaiki. Mohon periksa catatan di bawah ini sebelum mengirim ulang usulan:
                        </p>
                        {pengajuan.catatan_revisi_terakhir ? (
                            <div className="mt-2 rounded-lg border border-warn-300 bg-white p-3 text-xs text-ink-900 shadow-sm">
                                <span className="font-semibold text-warn-800">Catatan Pemeriksa:</span>
                                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-ink-800">
                                    {pengajuan.catatan_revisi_terakhir}
                                </p>
                            </div>
                        ) : (
                            <p className="mt-2 text-xs italic text-ink-600">
                                Tidak ada rincian catatan teks yang terlampir.
                            </p>
                        )}
                    </Alert>
                </div>
            )}

            {/* Indikator Sub-Langkah Pengajuan */}
            <div className="mb-6 rounded-kartu border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        {langkah1Lengkap ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                                <svg
                                    className="h-3.5 w-3.5 stroke-[2.5]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4.5 12.75l6 6 9-13.5"
                                    />
                                </svg>
                            </span>
                        ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                                1
                            </span>
                        )}
                        <span
                            className={`font-semibold ${
                                langkah1Lengkap ? 'text-ink-900' : 'text-brand-700'
                            }`}
                        >
                            Perbarui kebutuhan
                        </span>
                    </div>

                    <span className={langkah1Lengkap ? 'text-brand-600' : 'text-ink-300'}>→</span>

                    <div className="flex items-center gap-2">
                        {langkah2Lengkap ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                                <svg
                                    className="h-3.5 w-3.5 stroke-[2.5]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4.5 12.75l6 6 9-13.5"
                                    />
                                </svg>
                            </span>
                        ) : (
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    langkah1Lengkap
                                        ? 'bg-brand-100 text-brand-800'
                                        : 'bg-surface text-ink-400'
                                }`}
                            >
                                2
                            </span>
                        )}
                        <span
                            className={`font-medium ${
                                langkah2Lengkap
                                    ? 'font-semibold text-ink-900'
                                    : langkah1Lengkap
                                    ? 'text-brand-700'
                                    : 'text-ink-400'
                            }`}
                        >
                            Dokumen lampiran ({totalDokumen})
                        </span>
                    </div>

                    <span className={langkah2Lengkap ? 'text-brand-600' : 'text-ink-300'}>→</span>

                    <div className="flex items-center gap-2">
                        <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                langkah3Siap
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-surface text-ink-400'
                            }`}
                        >
                            3
                        </span>
                        <span
                            className={`font-medium ${
                                langkah3Siap ? 'font-semibold text-brand-700' : 'text-ink-400'
                            }`}
                        >
                            {pengajuan.is_revisi ? 'Kirim ulang pengajuan' : 'Simpan / Kirim'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Formulir Pengadaan (8 Kolom) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* 1. Informasi Pemohon */}
                    <Card
                        judul="Informasi pemohon & unit pengusul"
                        deskripsi="Data otomatis akun pemohon yang mengajukan usulan pengadaan."
                    >
                        <IsiKartu>
                            <InfoList
                                item={[
                                    { label: 'Nama pemohon', nilai: pemohon.nama_lengkap },
                                    { label: 'NIP / Identitas', nilai: pemohon.nip || '-' },
                                    {
                                        label: 'Unit kerja',
                                        nilai:
                                            pemohon.unit_nama +
                                            (pemohon.sub_unit_nama
                                                ? ` • ${pemohon.sub_unit_nama}`
                                                : ''),
                                    },
                                    { label: 'Nomor usulan', nilai: pengajuan.nomor_pengajuan },
                                ]}
                            />
                        </IsiKartu>
                    </Card>

                    {/* 2. Ringkasan Kebutuhan */}
                    <Card
                        judul="Ringkasan kebutuhan pengadaan"
                        deskripsi="Perihal pokok, sumber anggaran, serta alasan pengadaan."
                    >
                        <IsiKartu className="space-y-4">
                            <Field
                                label="Perihal pengadaan"
                                required
                                error={errors.perihal}
                                petunjuk="Tuliskan secara singkat dan jelas tujuan pengadaan aset ini."
                            >
                                <TextInput
                                    type="text"
                                    value={data.perihal}
                                    onChange={(e) => setData('perihal', e.target.value)}
                                    placeholder="Contoh: Pengadaan Alat Praktikum Jaringan Lab Komputer"
                                    className="w-full"
                                    maxLength={200}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field
                                    label="Sumber dana usulan"
                                    required
                                    error={errors.sumber_dana}
                                    petunjuk="Pos anggaran atau skema pendanaan yang diusulkan."
                                >
                                    <TextInput
                                        type="text"
                                        value={data.sumber_dana}
                                        onChange={(e) => setData('sumber_dana', e.target.value)}
                                        placeholder="Contoh: RKAT FTI 2026 / Hibah Riset"
                                        className="w-full"
                                        maxLength={100}
                                    />
                                </Field>

                                <Field
                                    label="Ruangan tujuan penempatan (opsional)"
                                    error={errors.id_ruangan}
                                    petunjuk="Pilih ruangan jika aset sudah memiliki rencana lokasi."
                                >
                                    <SelectInput
                                        value={data.id_ruangan}
                                        onChange={(e) => setData('id_ruangan', e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">Pilih ruangan tujuan...</option>
                                        {ruangan.map((r) => (
                                            <option key={r.id_ruangan} value={r.id_ruangan}>
                                                {r.nomor_ruangan} — {r.nama_ruangan}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </Field>
                            </div>

                            <Field
                                label="Alasan & manfaat pengadaan"
                                required
                                error={errors.alasan}
                                petunjuk="Jelaskan latar belakang urgensi pengadaan dan dampaknya pada kegiatan unit kerja."
                            >
                                <textarea
                                    rows={4}
                                    value={data.alasan}
                                    onChange={(e) => setData('alasan', e.target.value)}
                                    placeholder="Jelaskan urgensi kebutuhan barang, kondisi peralatan eksisting jika ada penggantian, serta jumlah pengguna atau mahasiswa yang terdampak..."
                                    className="w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                />
                            </Field>
                        </IsiKartu>
                    </Card>

                    {/* 3. Rincian Barang / Aset */}
                    <Card
                        judul="Rincian barang / aset yang diusulkan"
                        deskripsi="Daftar barang beserta estimasi harga satuan dan spesifikasi teknis lengkap."
                    >
                        <IsiKartu className="space-y-4">
                            {errors.items && typeof errors.items === 'string' && (
                                <Alert nada="bahaya" judul="Kesalahan Daftar Barang">
                                    {errors.items}
                                </Alert>
                            )}

                            <div className="space-y-4">
                                {data.items.map((item, idx) => {
                                    const subtotalItem =
                                        (parseInt(item.jumlah, 10) || 0) *
                                        (parseFloat(item.harga_satuan) || 0);

                                    return (
                                        <div
                                            key={idx}
                                            className="rounded-lg border border-line bg-surface/40 p-4 transition hover:border-line-dark"
                                        >
                                            <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-ink-700">
                                                    Item #{idx + 1}
                                                </span>
                                                {data.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => hapusBarang(idx)}
                                                        className="text-xs font-semibold text-bahaya-600 hover:text-bahaya-700"
                                                    >
                                                        Hapus item
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                                                <div className="sm:col-span-5">
                                                    <Field
                                                        label="Kategori aset"
                                                        required
                                                        error={errors[`items.${idx}.id_kategori`]}
                                                    >
                                                        <SelectInput
                                                            value={item.id_kategori}
                                                            onChange={(e) =>
                                                                perbaruiBarang(idx, 'id_kategori', e.target.value)
                                                            }
                                                            className="w-full text-xs"
                                                        >
                                                            {kategoriAset.map((k) => (
                                                                <option key={k.id_kategori} value={k.id_kategori}>
                                                                    {k.nama_kategori} ({k.kode_kategori})
                                                                </option>
                                                            ))}
                                                        </SelectInput>
                                                    </Field>
                                                </div>

                                                <div className="sm:col-span-7">
                                                    <Field
                                                        label="Nama barang / aset"
                                                        required
                                                        error={errors[`items.${idx}.nama_barang`]}
                                                    >
                                                        <TextInput
                                                            type="text"
                                                            value={item.nama_barang}
                                                            onChange={(e) =>
                                                                perbaruiBarang(idx, 'nama_barang', e.target.value)
                                                            }
                                                            placeholder="Contoh: Switch Hub 24 Port Gigabit"
                                                            className="w-full text-sm"
                                                            maxLength={150}
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="sm:col-span-12">
                                                    <Field
                                                        label="Spesifikasi teknis detail"
                                                        required
                                                        error={errors[`items.${idx}.spesifikasi`]}
                                                        petunjuk="Sebutkan merek, tipe, kapasitas, port, standar, atau kelengkapan lain yang dipersyaratkan."
                                                    >
                                                        <textarea
                                                            rows={2}
                                                            value={item.spesifikasi}
                                                            onChange={(e) =>
                                                                perbaruiBarang(idx, 'spesifikasi', e.target.value)
                                                            }
                                                            placeholder="Merek, tipe, standar, daya tahan, garansi..."
                                                            className="w-full rounded-lg border-line text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <Field
                                                        label="Jumlah"
                                                        required
                                                        error={errors[`items.${idx}.jumlah`]}
                                                    >
                                                        <TextInput
                                                            type="number"
                                                            min="1"
                                                            value={item.jumlah}
                                                            onChange={(e) =>
                                                                perbaruiBarang(idx, 'jumlah', e.target.value)
                                                            }
                                                            className="w-full text-sm"
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="sm:col-span-5">
                                                    <Field
                                                        label="Estimasi harga satuan (Rp)"
                                                        required
                                                        error={errors[`items.${idx}.harga_satuan`]}
                                                    >
                                                        <TextInput
                                                            type="number"
                                                            min="0"
                                                            step="1000"
                                                            value={item.harga_satuan}
                                                            onChange={(e) =>
                                                                perbaruiBarang(idx, 'harga_satuan', e.target.value)
                                                            }
                                                            placeholder="0"
                                                            className="w-full text-sm font-mono"
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="flex flex-col justify-end sm:col-span-4">
                                                    <div className="rounded-lg bg-surface p-2.5 text-right">
                                                        <span className="block text-[11px] font-medium text-ink-500">
                                                            Subtotal Estimasi:
                                                        </span>
                                                        <span className="text-sm font-bold text-ink-900">
                                                            {formatRupiah(subtotalItem)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-start pt-2">
                                <SecondaryButton type="button" onClick={tambahBarang}>
                                    + Tambah baris barang
                                </SecondaryButton>
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* 4. Berkas Pendukung / Lampiran */}
                    <Card
                        judul="Berkas pendukung / lampiran"
                        deskripsi="Proposal, penawaran harga vendor (RAB), kajian teknis, atau dokumen justifikasi."
                    >
                        <IsiKartu className="space-y-4">
                            {/* Dokumen Lama Tersimpan */}
                            {dokumenTersimpan.length > 0 && (
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600">
                                        Dokumen Tersimpan Saat Ini ({dokumenTersimpan.length})
                                    </p>
                                    <ul className="divide-y divide-line rounded-lg border border-line bg-white text-xs">
                                        {dokumenTersimpan.map((doc) => (
                                            <li
                                                key={doc.id_dokumen}
                                                className="flex flex-wrap items-center justify-between gap-2 p-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Badge nada="info" className="uppercase">
                                                        {doc.nama_file.split('.').pop()}
                                                    </Badge>
                                                    <span className="font-medium text-ink-900">
                                                        {doc.nama_file}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold text-brand-600 hover:underline"
                                                    >
                                                        Lihat berkas ↗
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => hapusDokumenLama(doc.id_dokumen)}
                                                        className="font-semibold text-bahaya-600 hover:text-bahaya-700 hover:underline"
                                                    >
                                                        Hapus berkas
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Dokumen Baru Dipilih */}
                            {data.lampiran.length > 0 && (
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-700">
                                        Berkas Baru Siap Diunggah ({data.lampiran.length})
                                    </p>
                                    <ul className="divide-y divide-line rounded-lg border border-brand-200 bg-brand-50/30 text-xs">
                                        {data.lampiran.map((berkas, idx) => (
                                            <li
                                                key={idx}
                                                className="flex flex-wrap items-center justify-between gap-2 p-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-ink-900">
                                                        {berkas.name}
                                                    </span>
                                                    <span className="text-ink-400">
                                                        ({formatUkuranBerkas(berkas.size)})
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => hapusBerkasBaru(idx)}
                                                    className="font-semibold text-bahaya-600 hover:underline"
                                                >
                                                    Batal
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="rounded-lg border-2 border-dashed border-line p-6 text-center transition hover:border-brand-500">
                                <input
                                    ref={berkasInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handlePilihBerkas}
                                    className="hidden"
                                    id="input-lampiran-berkas"
                                />
                                <label
                                    htmlFor="input-lampiran-berkas"
                                    className="cursor-pointer text-sm font-semibold text-brand-600 hover:underline"
                                >
                                    + Pilih berkas dokumen baru
                                </label>
                                <p className="mt-1 text-xs text-ink-500">
                                    Format berkas: PDF, JPG, JPEG, PNG • Ukuran maks: 10 MB per berkas
                                </p>
                            </div>
                        </IsiKartu>
                    </Card>
                </div>

                {/* Kolom Kanan: Ringkasan & Tombol Aksi (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    <Card
                        judul="Ringkasan estimasi usulan"
                        deskripsi="Total kalkulasi kebutuhan anggaran belanja barang."
                    >
                        <IsiKartu className="space-y-4">
                            <div className="space-y-2 border-b border-line pb-3 text-sm">
                                <div className="flex justify-between text-ink-600">
                                    <span>Total ragam item</span>
                                    <span className="font-semibold text-ink-900">
                                        {data.items.length} macam
                                    </span>
                                </div>
                                <div className="flex justify-between text-ink-600">
                                    <span>Total volume barang</span>
                                    <span className="font-semibold text-ink-900">
                                        {totalUnit} unit
                                    </span>
                                </div>
                                <div className="flex justify-between text-ink-600">
                                    <span>Ruangan penempatan</span>
                                    <span className="font-medium text-ink-900">
                                        {ruanganTerpilih ? ruanganTerpilih.nomor_ruangan : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-ink-600">
                                    <span>Total lampiran berkas</span>
                                    <span className="font-semibold text-ink-900">
                                        {totalDokumen} berkas
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Total Estimasi Anggaran
                                </span>
                                <span className="mt-1 block text-2xl font-black text-brand-700">
                                    {formatRupiah(totalEstimasi)}
                                </span>
                                <span className="mt-1 block text-xs text-ink-500">
                                    Sumber usulan: {data.sumber_dana || '-'}
                                </span>
                            </div>

                            <div className="space-y-2.5 pt-2">
                                <PrimaryButton
                                    type="button"
                                    onClick={() => kirimFormulir('diajukan')}
                                    disabled={processing}
                                    className="w-full justify-center text-center"
                                >
                                    {processing && aksiAktif === 'diajukan'
                                        ? 'Memproses...'
                                        : pengajuan.is_revisi
                                        ? 'Kirim ulang pengajuan'
                                        : 'Kirim pengajuan'}
                                </PrimaryButton>

                                <SecondaryButton
                                    type="button"
                                    onClick={() => kirimFormulir('draft')}
                                    disabled={processing}
                                    className="w-full justify-center text-center"
                                >
                                    {processing && aksiAktif === 'draft'
                                        ? 'Memproses...'
                                        : 'Simpan perubahan draf'}
                                </SecondaryButton>
                            </div>

                            <p className="text-center text-xs text-ink-500">
                                {pengajuan.is_revisi
                                    ? 'Mengirim ulang akan mengembalikan status ke diajukan agar diperiksa kembali oleh Operator.'
                                    : 'Pengajuan draf dapat diperbarui sewaktu-waktu sebelum dikirim.'}
                            </p>
                        </IsiKartu>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
