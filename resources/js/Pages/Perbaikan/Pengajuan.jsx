import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import SelectInput from '@/Components/ui/SelectInput';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';

/**
 * Format ukuran berkas menjadi teks yang mudah dibaca.
 */
function formatUkuranBerkas(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Pengajuan({ pemohon, daftarAset = [], riwayatPengajuan = [] }) {
    const fileInputRef = useRef(null);
    const [previewFoto, setPreviewFoto] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        id_aset: '',
        tingkat_kerusakan: 'kurang_baik',
        deskripsi_kerusakan: '',
        lokasi_fisik: '',
        keterangan: '',
        foto_kerusakan: null,
    });

    // Cari data aset yang sedang dipilih
    const asetTerpilih = useMemo(() => {
        if (!data.id_aset) return null;
        return daftarAset.find((a) => String(a.id_aset) === String(data.id_aset)) ?? null;
    }, [data.id_aset, daftarAset]);

    // Handle pemilihan berkas foto bukti kerusakan
    const tanganiPilihFoto = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validasi tipe berkas
        if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
            alert('Format berkas harus berupa gambar (JPG, PNG, atau WEBP).');
            return;
        }

        // Validasi ukuran berkas (maks 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran berkas melebihi batas maksimal 2 MB.');
            return;
        }

        setData('foto_kerusakan', file);
        setPreviewFoto(URL.createObjectURL(file));
    };

    const hapusFoto = () => {
        setData('foto_kerusakan', null);
        if (previewFoto) {
            URL.revokeObjectURL(previewFoto);
            setPreviewFoto(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Kirim formulir pengajuan perbaikan ke backend
    const kirimPengajuan = (e) => {
        e.preventDefault();

        post(route('pemohon.perbaikan.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                hapusFoto();
            },
        });
    };

    // Kolom tabel riwayat pengajuan
    const kolomRiwayat = [
        {
            kunci: 'nomor_pengajuan',
            judul: 'Nomor pengajuan',
            className: 'font-semibold text-brand-700',
        },
        { kunci: 'tanggal', judul: 'Tanggal' },
        {
            judul: 'Aset',
            render: (b) => (
                <div>
                    <div className="font-medium text-ink-900">{b.nama_barang}</div>
                    <div className="text-xs text-ink-500">{b.kode_aset}</div>
                </div>
            ),
        },
        {
            judul: 'Deskripsi kerusakan',
            render: (b) => (
                <div className="max-w-xs truncate text-sm text-ink-600" title={b.deskripsi_kerusakan}>
                    {b.deskripsi_kerusakan}
                </div>
            ),
        },
        {
            judul: 'Status',
            render: (b) => <StatusText nada={b.nada}>{b.status}</StatusText>,
        },
        {
            judul: 'Aksi',
            render: (b) => (
                <TautanAksi href={b.href ?? '#'}>
                    Lihat detail
                </TautanAksi>
            ),
        },
    ];

    const tanggalHariIni = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
    }).format(new Date());

    const adaError = Object.keys(errors).length > 0;

    return (
        <AuthenticatedLayout>
            <Head title="Pengajuan Perbaikan Aset" />

            <PageHeader
                breadcrumb={['FTI', 'Pengajuan', 'Perbaikan aset']}
                judul="Pengajuan perbaikan aset"
                deskripsi="Formulir pengajuan perbaikan untuk aset tetap unit yang mengalami kendala teknis atau kerusakan fisik."
            >
                <TombolLink href={route('pemohon.dashboard')} varian="sekunder">
                    Kembali ke dashboard
                </TombolLink>
            </PageHeader>

            <div className="space-y-6">
                {/* Banner Alur Pengajuan */}
                <Alert nada="info">
                    <span className="font-medium">Alur Pengajuan Perbaikan:</span> Pengajuan akan diverifikasi oleh
                    Operator Aset Fakultas dan Kepala Kantor. Setelah disetujui, perbaikan akan ditugaskan ke Teknisi
                    Fakultas atau dikirimkan ke Rekanan Vendor.
                </Alert>

                {adaError && (
                    <Alert nada="bahaya">
                        Terdapat kesalahan pada isian formulir. Mohon periksa kembali kolom isian yang bertanda merah.
                    </Alert>
                )}

                {/* Form Utama */}
                <Card>
                    <form onSubmit={kirimPengajuan} className="space-y-6 p-6">
                        {/* 1. Ringkasan Pengusul & Tanggal */}
                        <div>
                            <h3 className="text-base font-semibold text-ink-900">1. Data Pemohon & Pengajuan</h3>
                            <p className="mt-0.5 text-xs text-ink-500">
                                Informasi pengusul diambil otomatis dari identitas akun Anda.
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <div className="text-xs text-ink-500">Nama Pengusul</div>
                                    <div className="font-medium text-ink-900">{pemohon?.nama_lengkap ?? '-'}</div>
                                    <div className="text-xs text-ink-500">NIP: {pemohon?.nip ?? '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-ink-500">Unit / Departemen</div>
                                    <div className="font-medium text-ink-900">{pemohon?.unit ?? '-'}</div>
                                    <div className="text-xs text-ink-500">{pemohon?.sub_unit ?? '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-ink-500">Tanggal Pengajuan</div>
                                    <div className="font-medium text-ink-900">{tanggalHariIni}</div>
                                    <div className="text-xs text-ink-500">Waktu Indonesia Barat (WIB)</div>
                                </div>
                                <div>
                                    <div className="text-xs text-ink-500">Nomor Pengajuan</div>
                                    <div className="mt-1">
                                        <Badge nada="info">Otomatis (PRB-YYYY-XXXX)</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-line" />

                        {/* 2. Pemilihan Aset */}
                        <div>
                            <h3 className="text-base font-semibold text-ink-900">2. Identifikasi Aset yang Rusak</h3>
                            <p className="mt-0.5 text-xs text-ink-500">
                                Pilih barang inventaris dari daftar aset aktif yang berada dalam tanggung jawab unit Anda.
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-5">
                                <Field
                                    label="Pilih aset yang mengalami kerusakan"
                                    htmlFor="id_aset"
                                    error={errors.id_aset}
                                    petunjuk="Pilih salah satu aset tetap yang membutuhkan penanganan perbaikan."
                                >
                                    <SelectInput
                                        id="id_aset"
                                        className="block w-full"
                                        value={data.id_aset}
                                        onChange={(e) => setData('id_aset', e.target.value)}
                                        required
                                    >
                                        <option value="">-- Pilih aset tetap --</option>
                                        {daftarAset.map((aset) => (
                                            <option key={aset.id_aset} value={aset.id_aset}>
                                                [{aset.kode_aset}] {aset.nama_barang} ({aset.merek_tipe}) — {aset.lokasi}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </Field>

                                {/* Pratinjau Detail Aset Terpilih */}
                                {asetTerpilih && (
                                    <div className="rounded-lg border border-brand-500/30 bg-brand-50/40 p-4 transition-all">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                                            <div className="flex items-center gap-2">
                                                <Badge nada="sukses">{asetTerpilih.kode_aset}</Badge>
                                                <span className="font-semibold text-ink-900">
                                                    {asetTerpilih.nama_barang}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-ink-500">Kondisi saat ini:</span>
                                                <Badge
                                                    nada={
                                                        asetTerpilih.kondisi === 'baik'
                                                            ? 'sukses'
                                                            : asetTerpilih.kondisi === 'kurang_baik'
                                                              ? 'peringatan'
                                                              : 'bahaya'
                                                    }
                                                >
                                                    {asetTerpilih.kondisi?.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                                            <div>
                                                <span className="text-ink-500">Merek / Tipe Model:</span>
                                                <p className="font-medium text-ink-900">{asetTerpilih.merek_tipe}</p>
                                            </div>
                                            <div>
                                                <span className="text-ink-500">Kategori Aset:</span>
                                                <p className="font-medium text-ink-900">{asetTerpilih.kategori}</p>
                                            </div>
                                            <div>
                                                <span className="text-ink-500">Ruangan / Lokasi Tercatat:</span>
                                                <p className="font-medium text-ink-900">{asetTerpilih.lokasi}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-line" />

                        {/* 3. Deskripsi Kerusakan */}
                        <div>
                            <h3 className="text-base font-semibold text-ink-900">3. Rincian Kerusakan & Kendala</h3>
                            <p className="mt-0.5 text-xs text-ink-500">
                                Berikan penjelasan detail mengenai gangguan fungsi, komponen rusak, atau gejala yang terjadi.
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <Field
                                    label="Perkiraan Tingkat Kerusakan"
                                    htmlFor="tingkat_kerusakan"
                                    error={errors.tingkat_kerusakan}
                                    className="sm:col-span-2"
                                >
                                    <SelectInput
                                        id="tingkat_kerusakan"
                                        className="block w-full max-w-md"
                                        value={data.tingkat_kerusakan}
                                        onChange={(e) => setData('tingkat_kerusakan', e.target.value)}
                                    >
                                        <option value="kurang_baik">Rusak Ringan (Masih dapat berfungsi sebagian)</option>
                                        <option value="rusak_berat">Rusak Berat (Mati total / tidak dapat difungsikan sama sekali)</option>
                                    </SelectInput>
                                </Field>

                                <Field
                                    label="Deskripsi Gejala / Kerusakan"
                                    htmlFor="deskripsi_kerusakan"
                                    error={errors.deskripsi_kerusakan}
                                    petunjuk="Contoh: Lampu indikator proyektor berkedip merah dan mati setelah 5 menit dinyalakan."
                                    className="sm:col-span-2"
                                >
                                    <textarea
                                        id="deskripsi_kerusakan"
                                        rows={4}
                                        value={data.deskripsi_kerusakan}
                                        onChange={(e) => setData('deskripsi_kerusakan', e.target.value)}
                                        placeholder="Tuliskan secara lengkap apa yang rusak, kapan masalah mulai timbul, dan bagaimana gejala kerusakannya..."
                                        className="block w-full rounded-lg border-line text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        required
                                    />
                                </Field>

                                <Field
                                    label="Lokasi Fisik Aset Saat Ini"
                                    htmlFor="lokasi_fisik"
                                    error={errors.lokasi_fisik}
                                    petunjuk="Tuliskan jika aset dipindahkan sementara dari ruangan aslinya."
                                    className="sm:col-span-2"
                                >
                                    <TextInput
                                        id="lokasi_fisik"
                                        className="block w-full"
                                        value={data.lokasi_fisik}
                                        onChange={(e) => setData('lokasi_fisik', e.target.value)}
                                        placeholder="Contoh: Meja dosen Lab Jaringan Lantai 1, dekat jendela barat"
                                    />
                                </Field>
                            </div>
                        </div>

                        <hr className="border-line" />

                        {/* 4. Unggah Foto Bukti Kerusakan */}
                        <div>
                            <h3 className="text-base font-semibold text-ink-900">4. Bukti Foto Kerusakan</h3>
                            <p className="mt-0.5 text-xs text-ink-500">
                                Unggah foto fisik aset yang memperlihatkan titik kerusakan atau indikator malfungsi.
                            </p>

                            <div className="mt-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/webp"
                                    onChange={tanganiPilihFoto}
                                    className="hidden"
                                    id="input-foto"
                                />

                                {!previewFoto ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface p-6 text-center transition hover:border-brand-500 hover:bg-brand-50/20"
                                    >
                                        <svg
                                            className="h-10 w-10 text-ink-400"
                                            stroke="currentColor"
                                            fill="none"
                                            viewBox="0 0 48 48"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        <div className="mt-2 text-sm text-ink-600">
                                            <span className="font-semibold text-brand-700 hover:underline">
                                                Klik untuk memilih foto
                                            </span>{' '}
                                            atau seret foto ke area ini
                                        </div>
                                        <p className="mt-1 text-xs text-ink-400">
                                            Format file yang didukung: PNG, JPG, JPEG, WEBP (Maksimal 2 MB)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={previewFoto}
                                                alt="Pratinjau Bukti Kerusakan"
                                                className="h-20 w-20 rounded-md object-cover border border-line"
                                            />
                                            <div>
                                                <div className="font-medium text-ink-900">
                                                    {data.foto_kerusakan?.name}
                                                </div>
                                                <div className="text-xs text-ink-500">
                                                    {formatUkuranBerkas(data.foto_kerusakan?.size)}
                                                </div>
                                                <Badge nada="sukses" className="mt-1">
                                                    Siap diunggah
                                                </Badge>
                                            </div>
                                        </div>
                                        <SecondaryButton onClick={hapusFoto} type="button">
                                            Ganti / Hapus Foto
                                        </SecondaryButton>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-line" />

                        {/* 5. Catatan Tambahan (Opsional) */}
                        <div>
                            <Field
                                label="Catatan Tambahan / Kontak Narahubung (Opsional)"
                                htmlFor="keterangan"
                                error={errors.keterangan}
                                petunjuk="Cantumkan informasi tambahan seperti nomor telepon penanggung jawab ruangan atau kebutuhan mendesak."
                            >
                                <TextInput
                                    id="keterangan"
                                    className="block w-full"
                                    value={data.keterangan}
                                    onChange={(e) => setData('keterangan', e.target.value)}
                                    placeholder="Contoh: Mohon penanganan sebelum jadwal praktikum hari Kamis, hubungi PIC: 0812-3456-7890"
                                />
                            </Field>
                        </div>

                        {/* Tombol Simpan & Batal */}
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <TombolLink href={route('pemohon.dashboard')} varian="sekunder">
                                Batal
                            </TombolLink>
                            <PrimaryButton disabled={processing}>
                                {processing ? 'Mengirim pengajuan...' : 'Kirim Pengajuan Perbaikan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Card>

                {/* Tabel Riwayat Pengajuan Perbaikan Terakhir */}
                <Card
                    judul="Riwayat Pengajuan Perbaikan Terakhir"
                    deskripsi="Daftar pengajuan perbaikan aset yang pernah diajukan oleh unit kerja Anda."
                >
                    <div className="pt-3">
                        <DataTable
                            kolom={kolomRiwayat}
                            baris={riwayatPengajuan}
                            kunciBaris="id_pengajuan"
                            kosong={
                                <EmptyState
                                    judul="Belum ada riwayat perbaikan"
                                    deskripsi="Pengajuan perbaikan yang telah dikirimkan akan muncul pada daftar ini."
                                />
                            }
                        />
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
