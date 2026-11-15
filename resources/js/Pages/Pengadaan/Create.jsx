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

export default function Create({ pemohon, kategoriAset = [], ruangan = [] }) {
    const berkasInputRef = useRef(null);
    const bannerErrorRef = useRef(null);
    const [aksiAktif, setAksiAktif] = useState(null);
    const [modalErrorBuka, setModalErrorBuka] = useState(false);
    const [daftarError, setDaftarError] = useState([]);

    const { data, setData, post, processing, errors, transform } = useForm({
        aksi: 'diajukan',
        perihal: '',
        sumber_dana: 'RKAT FTI 2026',
        id_ruangan: '',
        alasan: '',
        items: [
            {
                id_kategori: kategoriAset[0]?.id_kategori ? String(kategoriAset[0].id_kategori) : '',
                nama_barang: '',
                spesifikasi: '',
                jumlah: 1,
                harga_satuan: '',
            },
        ],
        lampiran: [],
    });

    // Validasi kelengkapan data di sisi klien
    const validasiFormulirKlien = (dataForm, tipeAksi) => {
        const listError = [];

        if (!dataForm.perihal || !dataForm.perihal.trim()) {
            listError.push('Perihal pengadaan wajib diisi.');
        }
        if (!dataForm.sumber_dana || !dataForm.sumber_dana.trim()) {
            listError.push('Sumber dana usulan wajib diisi.');
        }
        if (!dataForm.alasan || !dataForm.alasan.trim()) {
            listError.push('Alasan & manfaat pengadaan wajib diisi.');
        }

        if (!dataForm.items || dataForm.items.length === 0) {
            listError.push('Minimal harus mengusulkan 1 item barang/aset.');
        } else {
            dataForm.items.forEach((it, idx) => {
                const no = idx + 1;
                if (!it.id_kategori) {
                    listError.push(`Item #${no}: Kategori aset wajib dipilih.`);
                }
                if (!it.nama_barang || !it.nama_barang.trim()) {
                    listError.push(`Item #${no}: Nama barang wajib diisi.`);
                }
                if (!it.spesifikasi || !it.spesifikasi.trim()) {
                    listError.push(`Item #${no}: Spesifikasi teknis wajib diisi.`);
                }
                const jumlah = parseInt(it.jumlah, 10);
                if (isNaN(jumlah) || jumlah < 1) {
                    listError.push(`Item #${no}: Jumlah barang minimal 1 unit.`);
                }
                const harga = parseFloat(it.harga_satuan);
                if (isNaN(harga) || harga <= 0 || it.harga_satuan === '') {
                    listError.push(`Item #${no}: Estimasi harga satuan wajib diisi berupa angka positif.`);
                }
            });
        }

        if (tipeAksi === 'diajukan') {
            const jumlahLampiran = dataForm.lampiran && Array.isArray(dataForm.lampiran) ? dataForm.lampiran.length : 0;
            if (jumlahLampiran < 1) {
                listError.push('Minimal satu berkas lampiran permohonan/RAB wajib diunggah sebelum mengirim pengajuan.');
            }
        }

        return listError;
    };

    const tutupModalError = () => {
        setModalErrorBuka(false);
        setTimeout(() => {
            bannerErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

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

    // Tambah berkas lampiran
    const handlePilihBerkas = (e) => {
        const berkasBaru = Array.from(e.target.files || []);
        if (berkasBaru.length > 0) {
            setData('lampiran', [...data.lampiran, ...berkasBaru]);
        }
        if (berkasInputRef.current) {
            berkasInputRef.current.value = '';
        }
    };

    // Hapus berkas lampiran tertentu
    const hapusBerkas = (indeks) => {
        setData(
            'lampiran',
            data.lampiran.filter((_, i) => i !== indeks)
        );
    };

    // Kirim formulir dengan aksi yang ditentukan (draft atau diajukan)
    const kirimFormulir = (tipeAksi) => {
        // Pengecekan kelengkapan di sisi klien
        const errorKlien = validasiFormulirKlien(data, tipeAksi);
        if (errorKlien.length > 0) {
            setDaftarError(errorKlien);
            setModalErrorBuka(true);
            setTimeout(() => {
                bannerErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return;
        }

        setAksiAktif(tipeAksi);
        transform((dataForm) => ({
            ...dataForm,
            aksi: tipeAksi,
        }));

        post(route('pemohon.pengadaan.store'), {
            forceFormData: true,
            preserveScroll: true,
            onError: (errs) => {
                const listError = Object.values(errs);
                if (listError.length > 0) {
                    setDaftarError(listError);
                    setModalErrorBuka(true);
                    setTimeout(() => {
                        bannerErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            },
            onSuccess: () => {
                setDaftarError([]);
            },
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

    const langkah2Lengkap = Boolean(data.lampiran && data.lampiran.length > 0);
    const langkah3Siap = langkah1Lengkap;

    return (
        <AuthenticatedLayout>
            <Head title="Pengajuan pengadaan" />

            <PageHeader
                breadcrumb={['FTI', 'Pengajuan pengadaan']}
                judul="Pengajuan pengadaan"
                deskripsi="Pengusulan kebutuhan aset baru untuk menunjang kegiatan operasional, akademik, dan laboratorium unit kerja."
            />

            {/* Banner Peringatan Kesalahan Validasi */}
            {daftarError.length > 0 && (
                <div ref={bannerErrorRef} className="mb-6 scroll-mt-6">
                    <Alert nada="bahaya">
                        <div className="space-y-1.5">
                            <p className="font-bold text-bahaya-900">
                                Data pengajuan belum lengkap. Mohon periksa kembali isian berikut:
                            </p>
                            <ul className="list-disc space-y-1 pl-4 text-xs font-medium text-bahaya-800">
                                {daftarError.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
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
                            Isi kebutuhan
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
                                      ? 'text-ink-700'
                                      : 'text-ink-400'
                            }`}
                        >
                            Lampirkan dokumen
                        </span>
                    </div>

                    <span className={langkah3Siap ? 'text-brand-600' : 'text-ink-300'}>→</span>

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
                                langkah3Siap
                                    ? 'font-semibold text-ink-900'
                                    : 'text-ink-400'
                            }`}
                        >
                            Kirim pengajuan
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Formulir Utama (8 Kolom) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* 1. Kartu Informasi Kebutuhan */}
                    <Card
                        judul="Informasi kebutuhan"
                        deskripsi="Identitas pemohon, unit kerja, sumber pendanaan usulan, dan alasan pengadaan aset."
                    >
                        <IsiKartu className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Nama pemohon" htmlFor="nama_pemohon">
                                    <TextInput
                                        id="nama_pemohon"
                                        value={pemohon?.nama_lengkap + (pemohon?.nip ? ` (NIP: ${pemohon.nip})` : '')}
                                        disabled
                                        className="w-full cursor-not-allowed bg-surface text-ink-600"
                                    />
                                </Field>

                                <Field label="Unit kerja pengusul" htmlFor="unit_pengusul">
                                    <TextInput
                                        id="unit_pengusul"
                                        value={
                                            pemohon?.unit_nama +
                                            (pemohon?.sub_unit_nama ? ` • ${pemohon.sub_unit_nama}` : '')
                                        }
                                        disabled
                                        className="w-full cursor-not-allowed bg-surface text-ink-600"
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field
                                    label="Perihal pengadaan"
                                    htmlFor="perihal"
                                    error={errors.perihal}
                                    petunjuk="Ringkasan singkat usulan pengadaan"
                                >
                                    <TextInput
                                        id="perihal"
                                        value={data.perihal}
                                        onChange={(e) => setData('perihal', e.target.value)}
                                        placeholder="Contoh: Pengadaan Komputer PC Laboratorium Jaringan"
                                        className="w-full"
                                    />
                                </Field>

                                <Field
                                    label="Sumber dana usulan"
                                    htmlFor="sumber_dana"
                                    error={errors.sumber_dana}
                                    petunjuk="Pagu anggaran yang direncanakan"
                                >
                                    <TextInput
                                        id="sumber_dana"
                                        value={data.sumber_dana}
                                        onChange={(e) => setData('sumber_dana', e.target.value)}
                                        placeholder="Contoh: RKAT FTI 2026 / BOPTN"
                                        className="w-full"
                                    />
                                </Field>
                            </div>

                            <Field
                                label="Lokasi tujuan penempatan (opsional)"
                                htmlFor="id_ruangan"
                                error={errors.id_ruangan}
                                petunjuk="Pilih ruangan tempat aset akan ditempatkan setelah diadakan"
                            >
                                <SelectInput
                                    id="id_ruangan"
                                    value={data.id_ruangan}
                                    onChange={(e) => setData('id_ruangan', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">-- Pilih ruangan tujuan (opsional) --</option>
                                    {ruangan.map((r) => (
                                        <option key={r.id_ruangan} value={r.id_ruangan}>
                                            {r.nomor_ruangan} - {r.nama_ruangan}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field
                                label="Alasan dan manfaat pengadaan"
                                htmlFor="alasan"
                                error={errors.alasan}
                                petunjuk="Jelaskan urgensi kebutuhan, kondisi aset saat ini, dan manfaat langsung pengadaan"
                            >
                                <textarea
                                    id="alasan"
                                    value={data.alasan}
                                    onChange={(e) => setData('alasan', e.target.value)}
                                    rows={3}
                                    placeholder="Jelaskan latar belakang, urgensi pengadaan barang, serta dampak operasional bagi unit kerja..."
                                    className="w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                />
                            </Field>
                        </IsiKartu>
                    </Card>

                    {/* 2. Kartu Rincian Barang yang Diusulkan */}
                    <Card
                        judul="Rincian barang yang diusulkan"
                        deskripsi="Daftar spesifikasi teknis barang, jumlah unit, dan estimasi harga satuan."
                    >
                        <IsiKartu className="space-y-5">
                            {errors.items && (
                                <Alert nada="bahaya" className="mb-2">
                                    {errors.items}
                                </Alert>
                            )}

                            {data.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="rounded-lg border border-line bg-surface/30 p-4 transition hover:border-brand-200"
                                >
                                    <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm font-semibold text-ink-900">
                                                Barang #{index + 1}
                                            </span>
                                        </div>

                                        {data.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => hapusBarang(index)}
                                                className="text-xs font-medium text-bahaya-600 transition hover:underline"
                                            >
                                                Hapus barang
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <Field
                                                label="Kategori aset"
                                                error={errors[`items.${index}.id_kategori`]}
                                            >
                                                <SelectInput
                                                    value={item.id_kategori}
                                                    onChange={(e) =>
                                                        perbaruiBarang(index, 'id_kategori', e.target.value)
                                                    }
                                                    className="w-full"
                                                >
                                                    <option value="">-- Pilih kategori aset --</option>
                                                    {kategoriAset.map((k) => (
                                                        <option key={k.id_kategori} value={k.id_kategori}>
                                                            {k.kode_kategori} - {k.nama_kategori}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </Field>

                                            <Field
                                                label="Nama barang"
                                                error={errors[`items.${index}.nama_barang`]}
                                            >
                                                <TextInput
                                                    value={item.nama_barang}
                                                    onChange={(e) =>
                                                        perbaruiBarang(index, 'nama_barang', e.target.value)
                                                    }
                                                    placeholder="Contoh: PC Desktop Core i7 16GB"
                                                    className="w-full"
                                                />
                                            </Field>
                                        </div>

                                        <Field
                                            label="Spesifikasi teknis"
                                            error={errors[`items.${index}.spesifikasi`]}
                                            petunjuk="Merek, tipe, prosesor, kapasitas, garansi resmi, dan kelengkapan teknis"
                                        >
                                            <textarea
                                                value={item.spesifikasi}
                                                onChange={(e) =>
                                                    perbaruiBarang(index, 'spesifikasi', e.target.value)
                                                }
                                                rows={2}
                                                placeholder="Contoh: Intel Core i7 Gen 13, RAM 16GB DDR5, SSD 512GB NVMe, Monitor 24 inci, Garansi 3 Tahun..."
                                                className="w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                            />
                                        </Field>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <Field
                                                label="Jumlah unit"
                                                error={errors[`items.${index}.jumlah`]}
                                            >
                                                <TextInput
                                                    type="number"
                                                    min="1"
                                                    value={item.jumlah}
                                                    onChange={(e) =>
                                                        perbaruiBarang(index, 'jumlah', e.target.value)
                                                    }
                                                    className="w-full"
                                                />
                                            </Field>

                                            <Field
                                                label="Harga satuan estimasi"
                                                error={errors[`items.${index}.harga_satuan`]}
                                            >
                                                <TextInput
                                                    type="number"
                                                    min="0"
                                                    step="1000"
                                                    value={item.harga_satuan}
                                                    onChange={(e) =>
                                                        perbaruiBarang(index, 'harga_satuan', e.target.value)
                                                    }
                                                    placeholder="0"
                                                    className="w-full"
                                                />
                                            </Field>

                                            <Field label="Subtotal estimasi">
                                                <div className="flex h-[42px] items-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-brand-700">
                                                    {formatRupiah(
                                                        (parseInt(item.jumlah, 10) || 0) *
                                                            (parseFloat(item.harga_satuan) || 0)
                                                    )}
                                                </div>
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                                <SecondaryButton
                                    type="button"
                                    onClick={tambahBarang}
                                    className="text-xs"
                                >
                                    + Tambah barang lainnya
                                </SecondaryButton>

                                <div className="text-right">
                                    <p className="text-xs text-ink-500">
                                        Total {totalUnit} unit • {data.items.length} jenis
                                    </p>
                                    <p className="text-lg font-bold text-ink-900">
                                        {formatRupiah(totalEstimasi)}
                                    </p>
                                </div>
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* 3. Kartu Lampiran RAB dan Dokumen */}
                    <Card
                        judul="Lampiran RAB dan spesifikasi"
                        deskripsi="Unggah dokumen pendukung seperti Rencana Anggaran Biaya (RAB), brosur spesifikasi teknis, atau surat penawaran."
                    >
                        <IsiKartu className="space-y-4">
                            <input
                                type="file"
                                ref={berkasInputRef}
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handlePilihBerkas}
                                className="hidden"
                                id="unggah-lampiran"
                            />

                            <label
                                htmlFor="unggah-lampiran"
                                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface/50 p-6 text-center transition hover:border-brand-400 hover:bg-surface"
                            >
                                <svg
                                    className="mb-2 h-8 w-8 text-ink-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                                <p className="text-sm font-medium text-ink-900">
                                    <span className="font-semibold text-brand-600 underline">Pilih berkas</span>{' '}
                                    atau seret berkas ke area ini
                                </p>
                                <p className="mt-1 text-xs text-ink-500">
                                    Format didukung: PDF, JPG, JPEG, PNG • Maksimal 10 MB per berkas
                                </p>
                            </label>

                            {errors.lampiran && <Alert nada="bahaya">{errors.lampiran}</Alert>}

                            {Object.keys(errors)
                                .filter((k) => k.startsWith('lampiran.'))
                                .map((k) => (
                                    <Alert key={k} nada="bahaya">
                                        {errors[k]}
                                    </Alert>
                                ))}

                            {data.lampiran.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                                        Berkas yang dipilih ({data.lampiran.length}):
                                    </p>
                                    <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                                        {data.lampiran.map((file, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Badge nada="info" className="uppercase">
                                                        {file.name.split('.').pop()}
                                                    </Badge>
                                                    <span className="truncate font-medium text-ink-900">
                                                        {file.name}
                                                    </span>
                                                    <span className="shrink-0 text-xs text-ink-500">
                                                        ({formatUkuranBerkas(file.size)})
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => hapusBerkas(idx)}
                                                    className="shrink-0 text-xs font-medium text-bahaya-600 hover:underline"
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
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-kartu border border-line bg-white p-4">
                        <p className="text-xs text-ink-500">
                            Periksa kembali data barang dan dokumen usulan sebelum mengirimkan pengajuan.
                        </p>
                        <div className="flex items-center gap-3">
                            <SecondaryButton
                                type="button"
                                disabled={processing}
                                onClick={() => kirimFormulir('draft')}
                            >
                                {processing && aksiAktif === 'draft' ? 'Memproses...' : 'Simpan draf'}
                            </SecondaryButton>
                            <PrimaryButton
                                type="button"
                                disabled={processing}
                                onClick={() => kirimFormulir('diajukan')}
                            >
                                {processing && aksiAktif === 'diajukan' ? 'Memproses...' : 'Kirim pengajuan'}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Panel Ringkasan & Alur (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Ringkasan Pengadaan */}
                    <Card
                        judul="Ringkasan pengadaan"
                        deskripsi="Rekapitulasi kuantitas dan estimasi anggaran"
                    >
                        <IsiKartu className="space-y-4">
                            <InfoList
                                item={[
                                    { label: 'Pemohon', nilai: pemohon?.nama_lengkap ?? '-' },
                                    { label: 'Unit', nilai: pemohon?.unit_nama ?? '-' },
                                    { label: 'Jenis barang', nilai: `${data.items.length} jenis` },
                                    { label: 'Total kuantitas', nilai: `${totalUnit} unit` },
                                    {
                                        label: 'Lokasi tujuan',
                                        nilai: ruanganTerpilih
                                            ? `${ruanganTerpilih.nomor_ruangan} - ${ruanganTerpilih.nama_ruangan}`
                                            : 'Belum ditentukan',
                                    },
                                ]}
                            />

                            <div className="rounded-lg border border-line bg-surface p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Total Estimasi Anggaran
                                </p>
                                <p className="mt-1 text-2xl font-bold tracking-tight text-brand-700">
                                    {formatRupiah(totalEstimasi)}
                                </p>
                            </div>

                            <Alert nada="info" className="text-xs leading-relaxed">
                                Nilai yang tertera merupakan estimasi usulan anggaran, bukan persetujuan anggaran final.
                            </Alert>
                        </IsiKartu>
                    </Card>

                    {/* Dokumen Terlampir */}
                    <Card
                        judul="Dokumen terlampir"
                        deskripsi="Kelengkapan berkas usulan"
                    >
                        <IsiKartu>
                            {data.lampiran.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-line p-4 text-center">
                                    <p className="text-xs text-ink-500">
                                        Belum ada berkas lampiran yang dipilih.
                                    </p>
                                    <p className="mt-1 text-[11px] text-ink-400">
                                        Lampirkan RAB atau spesifikasi teknis untuk mempercepat verifikasi.
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-2 text-xs">
                                    {data.lampiran.map((file, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-ink-900"
                                        >
                                            <span className="truncate font-medium">{file.name}</span>
                                            <Badge nada="sukses" className="ml-2 shrink-0">
                                                Siap kirim
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </IsiKartu>
                    </Card>

                    {/* Alur Verifikasi */}
                    <Card judul="Alur verifikasi pengadaan">
                        <IsiKartu>
                            <ol className="relative space-y-4 border-l border-line pl-4 text-xs">
                                <li className="relative">
                                    <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-brand-600" />
                                    <p className="font-semibold text-ink-900">1. Pengusulan (Pemohon)</p>
                                    <p className="mt-0.5 text-ink-500">
                                        Pemohon mengisi spesifikasi kebutuhan dan mengunggah berkas usulan.
                                    </p>
                                </li>
                                <li className="relative">
                                    <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-line" />
                                    <p className="font-semibold text-ink-600">2. Pemeriksaan Administrasi</p>
                                    <p className="mt-0.5 text-ink-500">
                                        Operator Aset Fakultas memeriksa kelayakan spesifikasi dan format usulan.
                                    </p>
                                </li>
                                <li className="relative">
                                    <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-line" />
                                    <p className="font-semibold text-ink-600">3. Verifikasi Operasional</p>
                                    <p className="mt-0.5 text-ink-500">
                                        Kepala Kantor memverifikasi urgensi dan ketersediaan alokasi anggaran.
                                    </p>
                                </li>
                                <li className="relative">
                                    <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-line" />
                                    <p className="font-semibold text-ink-600">4. Persetujuan Final</p>
                                    <p className="mt-0.5 text-ink-500">
                                        Pimpinan memutuskan persetujuan pengadaan untuk proses pemesanan.
                                    </p>
                                </li>
                            </ol>
                        </IsiKartu>
                    </Card>
                </div>
            </div>

            {/* Modal Pop-up Validasi Belum Lengkap */}
            <Modal show={modalErrorBuka} onClose={tutupModalError} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-bahaya-100 text-bahaya-600">
                            <svg
                                className="h-6 w-6 stroke-[2]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 7.5h.008v.008H12v-.008z"
                                />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-ink-900">
                                Data pengajuan belum lengkap
                            </h3>
                            <p className="mt-1 text-xs text-ink-600">
                                Mohon lengkapi seluruh isian wajib berikut sebelum mengirimkan pengajuan:
                            </p>
                            <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto pl-4 text-xs font-medium text-bahaya-700">
                                {daftarError.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <PrimaryButton type="button" onClick={tutupModalError}>
                            Perbaiki isian
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
