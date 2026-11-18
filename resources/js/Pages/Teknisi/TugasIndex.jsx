import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import TabNav from '@/Components/ui/TabNav';
import TautanAksi from '@/Components/ui/TautanAksi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function formatRupiah(angka) {
    if (!angka || angka === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka);
}

// Badge kondisi aset
function KondisiBadge({ kondisi }) {
    const map = {
        baik: { label: 'Baik', nada: 'sukses' },
        rusak_ringan: { label: 'Rusak Ringan', nada: 'peringatan' },
        rusak_berat: { label: 'Rusak Berat', nada: 'bahaya' },
        dalam_perbaikan: { label: 'Dalam Perbaikan', nada: 'info' },
    };
    const meta = map[kondisi] ?? { label: kondisi ?? '-', nada: 'netral' };
    return <Badge nada={meta.nada}>{meta.label}</Badge>;
}

export default function TugasIndex({
    daftarTugas,
    daftarPemeliharaan,
    tabAktif = 'perbaikan',
    filters = {},
}) {
    const [q, setQ] = useState(filters.q || '');
    const isFirstRender = useRef(true);

    // State & Form Modal Perbaikan
    const [modalPerbaikanBuka, setModalPerbaikanBuka] = useState(false);
    const [targetPerbaikan, setTargetPerbaikan] = useState(null);

    const formPerbaikan = useForm({
        status_perbaikan: 'selesai',
        hasil_pemeriksaan: '',
        hasil_perbaikan: '',
        biaya_aktual: '',
    });

    // State & Form Modal Pemeliharaan
    const [modalPemeliharaanBuka, setModalPemeliharaanBuka] = useState(false);
    const [targetPemeliharaan, setTargetPemeliharaan] = useState(null);

    const formPemeliharaan = useForm({
        status: 'selesai',
        tanggal_pelaksanaan: '',
        uraian: '',
        biaya: '',
    });

    const terapkanFilter = (keyword, tab) => {
        router.get(
            route('teknisi.tugas'),
            {
                q: keyword || undefined,
                tab: tab !== 'perbaikan' ? tab : undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            terapkanFilter(q, tabAktif);
        }, 350);

        return () => clearTimeout(timer);
    }, [q]);

    // Handler Modal Perbaikan
    const bukaModalPerbaikan = (item) => {
        setTargetPerbaikan(item);
        formPerbaikan.reset();
        formPerbaikan.clearErrors();
        formPerbaikan.setData({
            status_perbaikan: item.status_perbaikan === 'dalam_perbaikan' ? 'selesai' : item.status_perbaikan,
            hasil_pemeriksaan: item.hasil_pemeriksaan || '',
            hasil_perbaikan: item.hasil_perbaikan || '',
            biaya_aktual: item.biaya_aktual ? String(item.biaya_aktual) : '',
        });
        setModalPerbaikanBuka(true);
    };

    const tutupModalPerbaikan = () => {
        if (!formPerbaikan.processing) {
            setModalPerbaikanBuka(false);
            setTargetPerbaikan(null);
        }
    };

    const kirimUpdatePerbaikan = (e) => {
        e.preventDefault();
        if (!targetPerbaikan) return;

        formPerbaikan.post(route('teknisi.tugas.update', targetPerbaikan.id_item_perbaikan), {
            preserveScroll: true,
            onSuccess: () => {
                tutupModalPerbaikan();
            },
        });
    };

    // Handler Modal Pemeliharaan
    const bukaModalPemeliharaan = (item) => {
        setTargetPemeliharaan(item);
        formPemeliharaan.reset();
        formPemeliharaan.clearErrors();
        formPemeliharaan.setData({
            status: item.status === 'terjadwal' ? 'dalam_proses' : item.status,
            tanggal_pelaksanaan: item.tanggal_pelaksanaan_raw || new Date().toISOString().split('T')[0],
            uraian: item.uraian || '',
            biaya: item.biaya ? String(item.biaya) : '',
        });
        setModalPemeliharaanBuka(true);
    };

    const tutupModalPemeliharaan = () => {
        if (!formPemeliharaan.processing) {
            setModalPemeliharaanBuka(false);
            setTargetPemeliharaan(null);
        }
    };

    const kirimUpdatePemeliharaan = (e) => {
        e.preventDefault();
        if (!targetPemeliharaan) return;

        formPemeliharaan.put(route('teknisi.pemeliharaan.update', targetPemeliharaan.id_pemeliharaan), {
            preserveScroll: true,
            onSuccess: () => {
                tutupModalPemeliharaan();
            },
        });
    };

    const isPerbaikanSelesai = formPerbaikan.data.status_perbaikan === 'selesai';
    const isPemeliharaanSelesai = formPemeliharaan.data.status === 'selesai';

    // Kolom Tabel 1: Tugas Perbaikan Kerusakan
    const kolomPerbaikan = [
        {
            judul: 'Tiket & Aset',
            render: (b) => (
                <div>
                    <p className="font-semibold text-brand-700 whitespace-nowrap font-mono text-sm">{b.nomor_pengajuan}</p>
                    <p className="mt-0.5 font-medium text-ink-900">{b.nama_barang}</p>
                    <p className="text-xs text-ink-500 font-mono">{b.kode_aset} · {b.merek_tipe}</p>
                </div>
            ),
        },
        {
            judul: 'Pemohon / Unit',
            render: (b) => (
                <div>
                    <div className="font-medium text-ink-900">{b.pemohon_nama}</div>
                    <div className="text-xs text-ink-500">{b.unit_nama}</div>
                </div>
            ),
        },
        {
            judul: 'Kondisi Aset',
            render: (b) => <KondisiBadge kondisi={b.kondisi_aset} />,
        },
        {
            judul: 'Deskripsi Kerusakan',
            render: (b) => (
                <div className="max-w-xs text-xs text-ink-700 leading-relaxed line-clamp-2" title={b.deskripsi_kerusakan}>
                    {b.deskripsi_kerusakan}
                </div>
            ),
        },
        {
            judul: 'Tanggal Mulai',
            render: (b) => (
                <span className="text-xs text-ink-600 whitespace-nowrap">{b.tanggal_mulai}</span>
            ),
        },
        {
            judul: 'Status',
            render: () => (
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-info-500 animate-pulse" />
                    <span className="text-sm font-medium text-info-700">Dikerjakan</span>
                </span>
            ),
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (b) => (
                <button
                    type="button"
                    onClick={() => bukaModalPerbaikan(b)}
                    className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                    Perbarui progres
                </button>
            ),
        },
    ];

    // Kolom Tabel 2: Jadwal Pemeliharaan Aset
    const kolomPemeliharaan = [
        {
            judul: 'Aset',
            render: (b) => (
                <div>
                    <p className="font-semibold text-ink-900">{b.nama_barang}</p>
                    <p className="text-xs text-ink-500 font-mono">{b.kode_aset} · {b.merek_tipe}</p>
                </div>
            ),
        },
        {
            judul: 'Kategori',
            render: (b) => <Badge nada="netral">{b.kategori}</Badge>,
        },
        {
            judul: 'Jenis Pemeliharaan',
            render: (b) => (
                <div className="max-w-xs text-xs font-medium text-ink-900">
                    {b.jenis_pemeliharaan}
                </div>
            ),
        },
        {
            judul: 'Tanggal Jadwal',
            render: (b) => (
                <span className="text-xs font-medium text-ink-700 whitespace-nowrap">
                    {b.tanggal_jadwal}
                </span>
            ),
        },
        {
            judul: 'Realisasi',
            render: (b) => (
                <span className={`text-xs whitespace-nowrap ${b.tanggal_pelaksanaan !== '-' ? 'text-ink-800' : 'text-ink-400 italic'}`}>
                    {b.tanggal_pelaksanaan !== '-' ? b.tanggal_pelaksanaan : 'Belum terlaksana'}
                </span>
            ),
        },
        {
            judul: 'Status',
            render: (b) => <Badge nada={b.status_nada}>{b.status_label}</Badge>,
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (b) => (
                <button
                    type="button"
                    onClick={() => bukaModalPemeliharaan(b)}
                    className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                    Perbarui realisasi
                </button>
            ),
        },
    ];

    const jumlahPerbaikan = daftarTugas?.total ?? 0;
    const jumlahPemeliharaan = daftarPemeliharaan?.total ?? 0;

    return (
        <AuthenticatedLayout>
            <Head title="Tugas Teknisi" />

            <PageHeader
                breadcrumb={['FTI', 'Tugas teknisi']}
                judul="Daftar tugas teknisi"
                deskripsi="Kelola pelaksanaan perbaikan kerusakan dan realisasi jadwal pemeliharaan aset fakultas yang ditugaskan kepada Anda."
            >
                <TautanAksi href={route('teknisi.riwayat')}>
                    Lihat riwayat perbaikan selesai →
                </TautanAksi>
            </PageHeader>

            {/* Tab Navigasi Dua Pekerjaan */}
            <TabNav
                tab={[
                    {
                        label: `Tugas Perbaikan Kerusakan (${jumlahPerbaikan})`,
                        href: route('teknisi.tugas', { tab: 'perbaikan', ...(q ? { q } : {}) }),
                        aktif: tabAktif === 'perbaikan',
                    },
                    {
                        label: `Jadwal Pemeliharaan Aset (${jumlahPemeliharaan})`,
                        href: route('teknisi.tugas', { tab: 'pemeliharaan', ...(q ? { q } : {}) }),
                        aktif: tabAktif === 'pemeliharaan',
                    },
                ]}
            />

            {/* Info Panel Berdasarkan Tab */}
            {tabAktif === 'perbaikan' ? (
                <div className="mb-4 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-xs text-info-800">
                    <strong>Panduan Perbaikan:</strong> Klik <strong>Perbarui progres</strong> untuk mencatat analisis pemeriksaan, tindakan perbaikan, biaya suku cadang, dan menetapkan status selesai. Jika kerusakan membutuhkan pihak ketiga, pilih opsi <em>Perlu Rekanan Vendor</em>.
                </div>
            ) : (
                <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-3 text-xs text-brand-900">
                    <strong>Panduan Pemeliharaan:</strong> Klik <strong>Perbarui realisasi</strong> pada jadwal yang telah Anda kerjakan untuk memperbarui status pengerjaan, mengisi tanggal pelaksanaan riil, uraian pekerjaan pemeliharaan, serta biaya bahan/pelumas jika ada.
                </div>
            )}

            <div className="space-y-4">
                <div className="w-full sm:max-w-xs">
                    <SearchInput
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={
                            tabAktif === 'perbaikan'
                                ? 'Cari tiket, aset, pemohon...'
                                : 'Cari aset, jenis pemeliharaan...'
                        }
                    />
                </div>

                {/* TAB 1: Tabel Tugas Perbaikan Kerusakan */}
                {tabAktif === 'perbaikan' && (
                    <Card>
                        <DataTable
                            kolom={kolomPerbaikan}
                            baris={daftarTugas.data}
                            kunciBaris="id_item_perbaikan"
                            kosong={
                                <EmptyState
                                    judul={q ? 'Tugas perbaikan tidak ditemukan' : 'Tidak ada tugas perbaikan aktif'}
                                    deskripsi={
                                        q
                                            ? 'Tidak ditemukan tugas perbaikan yang cocok dengan kata kunci pencarian.'
                                            : 'Saat ini belum ada tugas perbaikan baru yang ditugaskan kepada Anda. Tugas perbaikan akan muncul di sini setelah operator menugaskannya.'
                                    }
                                />
                            }
                        />
                        <Pagination
                            links={daftarTugas.links}
                            from={daftarTugas.from}
                            to={daftarTugas.to}
                            total={daftarTugas.total}
                        />
                    </Card>
                )}

                {/* TAB 2: Tabel Jadwal Pemeliharaan Aset */}
                {tabAktif === 'pemeliharaan' && (
                    <Card>
                        <DataTable
                            kolom={kolomPemeliharaan}
                            baris={daftarPemeliharaan.data}
                            kunciBaris="id_pemeliharaan"
                            kosong={
                                <EmptyState
                                    judul={q ? 'Jadwal pemeliharaan tidak ditemukan' : 'Tidak ada jadwal pemeliharaan'}
                                    deskripsi={
                                        q
                                            ? 'Tidak ditemukan jadwal pemeliharaan yang cocok dengan kata kunci pencarian.'
                                            : 'Saat ini belum ada agenda pemeliharaan preventif yang ditugaskan kepada Anda oleh Operator Aset.'
                                    }
                                />
                            }
                        />
                        <Pagination
                            links={daftarPemeliharaan.links}
                            from={daftarPemeliharaan.from}
                            to={daftarPemeliharaan.to}
                            total={daftarPemeliharaan.total}
                        />
                    </Card>
                )}
            </div>

            {/* Modal 1: Perbarui Progres Tugas Perbaikan */}
            <Modal show={modalPerbaikanBuka} onClose={tutupModalPerbaikan} maxWidth="2xl">
                {targetPerbaikan && (
                    <div className="p-6">
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Pembaruan Progres & Hasil Perbaikan
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">{targetPerbaikan.nomor_pengajuan}</h3>
                                <p className="text-xs text-ink-600">
                                    Pengusul: {targetPerbaikan.pemohon_nama} &mdash; {targetPerbaikan.unit_nama}
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-info-50 px-3 py-1 text-xs font-semibold text-info-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-info-500 animate-pulse" />
                                Sedang Dikerjakan
                            </span>
                        </div>

                        <div className="my-5 space-y-4">
                            {/* Rincian Aset */}
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge nada="info">{targetPerbaikan.kode_aset}</Badge>
                                        <span className="font-semibold text-ink-900 text-sm">{targetPerbaikan.nama_barang}</span>
                                        {targetPerbaikan.merek_tipe && (
                                            <span className="text-ink-500">({targetPerbaikan.merek_tipe})</span>
                                        )}
                                    </div>
                                    <KondisiBadge kondisi={targetPerbaikan.kondisi_aset} />
                                </div>

                                <div className="border-t border-line/60 pt-2">
                                    <span className="font-medium text-ink-500 block mb-1">Keluhan / Deskripsi Kerusakan dari Pemohon:</span>
                                    <p className="text-ink-800 whitespace-pre-wrap leading-relaxed">
                                        {targetPerbaikan.deskripsi_kerusakan}
                                    </p>
                                </div>

                                {targetPerbaikan.foto_url && (
                                    <div className="border-t border-line/60 pt-2">
                                        <span className="font-medium text-ink-500 block mb-1">Bukti Foto Kerusakan:</span>
                                        <a href={targetPerbaikan.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                            <img
                                                src={targetPerbaikan.foto_url}
                                                alt="Foto Kerusakan"
                                                className="h-28 w-28 rounded-lg object-cover border border-line group-hover:opacity-90 shadow-sm"
                                            />
                                            <span className="block text-[11px] text-brand-600 group-hover:underline mt-1 font-medium">
                                                Lihat foto ukuran penuh ↗
                                            </span>
                                        </a>
                                    </div>
                                )}

                                {targetPerbaikan.estimasi_biaya > 0 && (
                                    <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                                        <span className="text-ink-500">Estimasi biaya perbaikan:</span>
                                        <span className="font-semibold text-ink-900">{formatRupiah(targetPerbaikan.estimasi_biaya)}</span>
                                    </div>
                                )}

                                <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                                    <span className="text-ink-500">Mulai ditugaskan:</span>
                                    <span className="font-medium text-ink-900">{targetPerbaikan.tanggal_mulai}</span>
                                </div>
                            </div>

                            {/* Formulir Update Teknisi */}
                            <form id="form-update-perbaikan" onSubmit={kirimUpdatePerbaikan} className="space-y-4">
                                <Field label="Status Penanganan Perbaikan" htmlFor="status_perbaikan">
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {[
                                            {
                                                value: 'selesai',
                                                label: 'Selesai',
                                                sub: 'Aset kembali berfungsi normal',
                                                nada: 'sukses',
                                            },
                                            {
                                                value: 'dalam_perbaikan',
                                                label: 'Masih Dikerjakan',
                                                sub: 'Simpan progres sementara',
                                                nada: 'info',
                                            },
                                        ].map((opt) => (
                                            <label
                                                key={opt.value}
                                                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                                                    formPerbaikan.data.status_perbaikan === opt.value
                                                        ? opt.nada === 'sukses'
                                                            ? 'border-brand-500 bg-brand-50/60'
                                                            : 'border-info-500 bg-info-50/60'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="status_perbaikan"
                                                    value={opt.value}
                                                    checked={formPerbaikan.data.status_perbaikan === opt.value}
                                                    onChange={(e) => formPerbaikan.setData('status_perbaikan', e.target.value)}
                                                    className="mt-0.5 text-brand-600 focus:ring-brand-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">{opt.label}</p>
                                                    <p className="text-[11px] text-ink-500">{opt.sub}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </Field>

                                <Field
                                    label="Analisis / Hasil Pemeriksaan Fisik"
                                    htmlFor="hasil_pemeriksaan"
                                    error={formPerbaikan.errors.hasil_pemeriksaan}
                                    petunjuk="Tuliskan temuan penyebab kerusakan dari hasil pengecekan teknis Anda."
                                >
                                    <textarea
                                        id="hasil_pemeriksaan"
                                        rows={3}
                                        className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        value={formPerbaikan.data.hasil_pemeriksaan}
                                        onChange={(e) => formPerbaikan.setData('hasil_pemeriksaan', e.target.value)}
                                        placeholder="Contoh: Terjadi korsleting pada adaptor daya internal dan kabel fleksibel aus..."
                                    />
                                </Field>

                                <Field
                                    label={isPerbaikanSelesai ? 'Tindakan / Hasil Perbaikan (Wajib)' : 'Tindakan / Hasil Perbaikan (Opsional)'}
                                    htmlFor="hasil_perbaikan"
                                    error={formPerbaikan.errors.hasil_perbaikan}
                                    petunjuk={isPerbaikanSelesai ? 'Wajib diisi — jelaskan tindakan yang dilakukan hingga aset kembali berfungsi.' : undefined}
                                >
                                    <textarea
                                        id="hasil_perbaikan"
                                        rows={3}
                                        className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        value={formPerbaikan.data.hasil_perbaikan}
                                        onChange={(e) => formPerbaikan.setData('hasil_perbaikan', e.target.value)}
                                        placeholder="Contoh: Penggantian kapasitor power supply dan pembersihan kipas pendingin..."
                                    />
                                </Field>

                                <Field
                                    label="Biaya Aktual Komponen / Suku Cadang (Opsional)"
                                    htmlFor="biaya_aktual"
                                    error={formPerbaikan.errors.biaya_aktual}
                                    petunjuk="Isikan total biaya pembelian suku cadang jika ada."
                                >
                                    <TextInput
                                        id="biaya_aktual"
                                        type="number"
                                        min="0"
                                        className="block w-full"
                                        value={formPerbaikan.data.biaya_aktual}
                                        onChange={(e) => formPerbaikan.setData('biaya_aktual', e.target.value)}
                                        placeholder="Contoh: 150000"
                                    />
                                </Field>
                            </form>
                        </div>

                        <div className="flex items-center justify-between border-t border-line pt-4">
                            <p className="text-xs text-ink-500">
                                {isPerbaikanSelesai
                                    ? '✓ Status aset akan diperbarui menjadi "Aktif / Baik" setelah disimpan.'
                                    : 'Progres sementara akan disimpan tanpa mengubah status pengajuan.'}
                            </p>
                            <div className="flex items-center gap-3">
                                <SecondaryButton onClick={tutupModalPerbaikan} disabled={formPerbaikan.processing}>
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
                                    form="form-update-perbaikan"
                                    disabled={formPerbaikan.processing}
                                >
                                    {formPerbaikan.processing
                                        ? 'Menyimpan...'
                                        : isPerbaikanSelesai
                                          ? 'Tandai Selesai'
                                          : 'Simpan Progres'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal 2: Perbarui Realisasi Jadwal Pemeliharaan */}
            <Modal show={modalPemeliharaanBuka} onClose={tutupModalPemeliharaan} maxWidth="2xl">
                {targetPemeliharaan && (
                    <div className="p-6">
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Pembaruan Realisasi Pemeliharaan
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">{targetPemeliharaan.jenis_pemeliharaan}</h3>
                                <p className="text-xs text-ink-600 mt-0.5">
                                    Target Tanggal Jadwal: <span className="font-medium text-ink-900">{targetPemeliharaan.tanggal_jadwal}</span>
                                </p>
                            </div>
                            <Badge nada={targetPemeliharaan.status_nada}>{targetPemeliharaan.status_label}</Badge>
                        </div>

                        <div className="my-5 space-y-4">
                            {/* Rincian Aset Terkait Pemeliharaan */}
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge nada="info">{targetPemeliharaan.kode_aset}</Badge>
                                        <span className="font-semibold text-ink-900 text-sm">{targetPemeliharaan.nama_barang}</span>
                                        {targetPemeliharaan.merek_tipe && (
                                            <span className="text-ink-500">({targetPemeliharaan.merek_tipe})</span>
                                        )}
                                    </div>
                                    <Badge nada="netral">{targetPemeliharaan.kategori}</Badge>
                                </div>
                                <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                                    <span className="text-ink-500">Kondisi Fisik Saat Ini:</span>
                                    <KondisiBadge kondisi={targetPemeliharaan.kondisi} />
                                </div>
                            </div>

                            {/* Formulir Realisasi Pemeliharaan */}
                            <form id="form-update-pemeliharaan" onSubmit={kirimUpdatePemeliharaan} className="space-y-4">
                                <Field label="Status Pekerjaan Pemeliharaan" htmlFor="status_pemeliharaan">
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {[
                                            {
                                                value: 'dalam_proses',
                                                label: 'Sedang Dikerjakan',
                                                sub: 'Pekerjaan masih berlangsung / catat progres',
                                                nada: 'info',
                                            },
                                            {
                                                value: 'selesai',
                                                label: 'Selesai Dilaksanakan',
                                                sub: 'Seluruh kegiatan pemeliharaan telah rampung',
                                                nada: 'sukses',
                                            },
                                        ].map((opt) => (
                                            <label
                                                key={opt.value}
                                                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                                                    formPemeliharaan.data.status === opt.value
                                                        ? opt.nada === 'sukses'
                                                            ? 'border-brand-500 bg-brand-50/60'
                                                            : 'border-info-500 bg-info-50/60'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="status_pemeliharaan"
                                                    value={opt.value}
                                                    checked={formPemeliharaan.data.status === opt.value}
                                                    onChange={(e) => formPemeliharaan.setData('status', e.target.value)}
                                                    className="mt-0.5 text-brand-600 focus:ring-brand-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">{opt.label}</p>
                                                    <p className="text-[11px] text-ink-500">{opt.sub}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </Field>

                                <Field
                                    label={isPemeliharaanSelesai ? 'Tanggal Pelaksanaan (Wajib)' : 'Tanggal Pelaksanaan'}
                                    htmlFor="tanggal_pelaksanaan"
                                    error={formPemeliharaan.errors.tanggal_pelaksanaan}
                                    petunjuk="Tanggal riil kegiatan pemeliharaan aset dilaksanakan."
                                >
                                    <TextInput
                                        id="tanggal_pelaksanaan"
                                        type="date"
                                        className="block w-full"
                                        value={formPemeliharaan.data.tanggal_pelaksanaan}
                                        onChange={(e) => formPemeliharaan.setData('tanggal_pelaksanaan', e.target.value)}
                                        required={isPemeliharaanSelesai}
                                    />
                                </Field>

                                <Field
                                    label={isPemeliharaanSelesai ? 'Uraian Pekerjaan Pemeliharaan (Wajib)' : 'Uraian Pekerjaan / Progres'}
                                    htmlFor="uraian_pemeliharaan"
                                    error={formPemeliharaan.errors.uraian}
                                    petunjuk={
                                        isPemeliharaanSelesai
                                            ? 'Wajib diisi — jelaskan tindakan pemeliharaan berkala yang telah diselesaikan (mis. pembersihan filter, pelumasan mesin, update firmware).'
                                            : 'Tuliskan catatan progres atau temuan awal pemeriksaan berkala.'
                                    }
                                >
                                    <textarea
                                        id="uraian_pemeliharaan"
                                        rows={3}
                                        className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        value={formPemeliharaan.data.uraian}
                                        onChange={(e) => formPemeliharaan.setData('uraian', e.target.value)}
                                        placeholder="Contoh: Pembersihan debu kipas pendingin, pengecekan koneksi kabel power, dan pengujian stabilitas sistem normal..."
                                        required={isPemeliharaanSelesai}
                                    />
                                </Field>

                                <Field
                                    label="Biaya Pemeliharaan / Penggantian Bahan (Opsional)"
                                    htmlFor="biaya_pemeliharaan"
                                    error={formPemeliharaan.errors.biaya}
                                    petunjuk="Isikan total biaya suku cadang/bahan habis pakai (jika ada pembelian). Biaya tidak boleh bernilai negatif."
                                >
                                    <TextInput
                                        id="biaya_pemeliharaan"
                                        type="number"
                                        min="0"
                                        className="block w-full"
                                        value={formPemeliharaan.data.biaya}
                                        onChange={(e) => formPemeliharaan.setData('biaya', e.target.value)}
                                        placeholder="Contoh: 75000"
                                    />
                                </Field>
                            </form>
                        </div>

                        <div className="flex items-center justify-between border-t border-line pt-4">
                            <p className="text-xs text-ink-500">
                                {isPemeliharaanSelesai
                                    ? '✓ Data pemeliharaan akan ditandai selesai dan tercatat di riwayat aset.'
                                    : 'Progres pemeliharaan akan disimpan dalam status "Sedang Dikerjakan".'}
                            </p>
                            <div className="flex items-center gap-3">
                                <SecondaryButton onClick={tutupModalPemeliharaan} disabled={formPemeliharaan.processing}>
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
                                    form="form-update-pemeliharaan"
                                    disabled={formPemeliharaan.processing}
                                >
                                    {formPemeliharaan.processing
                                        ? 'Menyimpan...'
                                        : isPemeliharaanSelesai
                                          ? 'Selesaikan Pemeliharaan'
                                          : 'Simpan Progres'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
