import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import TabNav from '@/Components/ui/TabNav';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
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

export default function RiwayatIndex({
    daftarRiwayat,
    daftarRiwayatPemeliharaan,
    tabAktif = 'perbaikan',
    filters = {},
}) {
    const [q, setQ] = useState(filters.q || '');
    const isFirstRender = useRef(true);

    // Modal Riwayat Perbaikan
    const [modalPerbaikanBuka, setModalPerbaikanBuka] = useState(false);
    const [targetRiwayatPerbaikan, setTargetRiwayatPerbaikan] = useState(null);

    // Modal Riwayat Pemeliharaan
    const [modalPemeliharaanBuka, setModalPemeliharaanBuka] = useState(false);
    const [targetRiwayatPemeliharaan, setTargetRiwayatPemeliharaan] = useState(null);

    const terapkanFilter = (keyword, tab) => {
        router.get(
            route('teknisi.riwayat'),
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

    const bukaModalPerbaikan = (item) => {
        setTargetRiwayatPerbaikan(item);
        setModalPerbaikanBuka(true);
    };

    const bukaModalPemeliharaan = (item) => {
        setTargetRiwayatPemeliharaan(item);
        setModalPemeliharaanBuka(true);
    };

    // Kolom Tabel 1: Riwayat Perbaikan
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
            judul: 'Mulai',
            render: (b) => (
                <span className="text-xs text-ink-600 whitespace-nowrap">{b.tanggal_mulai}</span>
            ),
        },
        {
            judul: 'Selesai',
            render: (b) => (
                <span className="text-xs text-ink-600 whitespace-nowrap">{b.tanggal_selesai}</span>
            ),
        },
        {
            judul: 'Biaya Aktual',
            render: (b) => (
                <span className={`font-semibold text-sm ${b.biaya_aktual > 0 ? 'text-ink-900' : 'italic text-ink-400'}`}>
                    {b.biaya_aktual > 0 ? formatRupiah(b.biaya_aktual) : '—'}
                </span>
            ),
        },
        {
            judul: 'Status',
            render: () => (
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    <span className="text-sm font-medium text-brand-700">Selesai</span>
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
                    className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-surface"
                >
                    Lihat detail
                </button>
            ),
        },
    ];

    // Kolom Tabel 2: Riwayat Pemeliharaan
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
            judul: 'Target Jadwal',
            render: (b) => (
                <span className="text-xs text-ink-600 whitespace-nowrap">{b.tanggal_jadwal}</span>
            ),
        },
        {
            judul: 'Tanggal Realisasi',
            render: (b) => (
                <span className="text-xs font-semibold text-ink-900 whitespace-nowrap">
                    {b.tanggal_pelaksanaan}
                </span>
            ),
        },
        {
            judul: 'Biaya',
            render: (b) => (
                <span className={`font-semibold text-sm ${b.biaya > 0 ? 'text-ink-900' : 'italic text-ink-400'}`}>
                    {b.biaya > 0 ? formatRupiah(b.biaya) : '—'}
                </span>
            ),
        },
        {
            judul: 'Status',
            render: () => (
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    <span className="text-sm font-medium text-brand-700">Selesai</span>
                </span>
            ),
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (b) => (
                <button
                    type="button"
                    onClick={() => bukaModalPemeliharaan(b)}
                    className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-surface"
                >
                    Lihat detail
                </button>
            ),
        },
    ];

    const jumlahPerbaikan = daftarRiwayat?.total ?? 0;
    const jumlahPemeliharaan = daftarRiwayatPemeliharaan?.total ?? 0;

    return (
        <AuthenticatedLayout>
            <Head title="Riwayat Pekerjaan Teknisi" />

            <PageHeader
                breadcrumb={['FTI', 'Riwayat pekerjaan']}
                judul="Riwayat pekerjaan teknisi"
                deskripsi="Daftar seluruh pekerjaan perbaikan aset dan kegiatan pemeliharaan berkala yang telah berhasil Anda selesaikan."
            >
                <TombolLink href={route('teknisi.tugas')} varian="sekunder">
                    ← Kembali ke tugas aktif
                </TombolLink>
            </PageHeader>

            {/* Tab Navigasi Riwayat */}
            <TabNav
                tab={[
                    {
                        label: `Riwayat Perbaikan (${jumlahPerbaikan})`,
                        href: route('teknisi.riwayat', { tab: 'perbaikan', ...(q ? { q } : {}) }),
                        aktif: tabAktif === 'perbaikan',
                    },
                    {
                        label: `Riwayat Pemeliharaan (${jumlahPemeliharaan})`,
                        href: route('teknisi.riwayat', { tab: 'pemeliharaan', ...(q ? { q } : {}) }),
                        aktif: tabAktif === 'pemeliharaan',
                    },
                ]}
            />

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

                {/* TAB 1: Tabel Riwayat Perbaikan Kerusakan */}
                {tabAktif === 'perbaikan' && (
                    <Card>
                        <DataTable
                            kolom={kolomPerbaikan}
                            baris={daftarRiwayat.data}
                            kunciBaris="id_item_perbaikan"
                            kosong={
                                <EmptyState
                                    judul={q ? 'Riwayat perbaikan tidak ditemukan' : 'Belum ada riwayat perbaikan'}
                                    deskripsi={
                                        q
                                            ? 'Tidak ditemukan arsip perbaikan yang cocok dengan kata kunci pencarian.'
                                            : 'Pekerjaan perbaikan yang Anda selesaikan akan diarsipkan pada halaman ini.'
                                    }
                                />
                            }
                        />
                        <Pagination
                            links={daftarRiwayat.links}
                            from={daftarRiwayat.from}
                            to={daftarRiwayat.to}
                            total={daftarRiwayat.total}
                        />
                    </Card>
                )}

                {/* TAB 2: Tabel Riwayat Pemeliharaan Aset */}
                {tabAktif === 'pemeliharaan' && (
                    <Card>
                        <DataTable
                            kolom={kolomPemeliharaan}
                            baris={daftarRiwayatPemeliharaan.data}
                            kunciBaris="id_pemeliharaan"
                            kosong={
                                <EmptyState
                                    judul={q ? 'Riwayat pemeliharaan tidak ditemukan' : 'Belum ada riwayat pemeliharaan'}
                                    deskripsi={
                                        q
                                            ? 'Tidak ditemukan arsip pemeliharaan yang cocok dengan kata kunci pencarian.'
                                            : 'Agenda pemeliharaan berkala yang telah Anda selesaikan akan diarsipkan pada halaman ini.'
                                    }
                                />
                            }
                        />
                        <Pagination
                            links={daftarRiwayatPemeliharaan.links}
                            from={daftarRiwayatPemeliharaan.from}
                            to={daftarRiwayatPemeliharaan.to}
                            total={daftarRiwayatPemeliharaan.total}
                        />
                    </Card>
                )}
            </div>

            {/* Modal Detail Riwayat Perbaikan */}
            <Modal show={modalPerbaikanBuka} onClose={() => setModalPerbaikanBuka(false)} maxWidth="2xl">
                {targetRiwayatPerbaikan && (
                    <div className="p-6">
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Arsip Hasil Pekerjaan Perbaikan
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">{targetRiwayatPerbaikan.nomor_pengajuan}</h3>
                                <p className="text-xs text-ink-600">
                                    Pengusul: {targetRiwayatPerbaikan.pemohon_nama} &mdash; {targetRiwayatPerbaikan.unit_nama}
                                </p>
                            </div>
                            <Badge nada="sukses">Selesai</Badge>
                        </div>

                        <div className="my-5 space-y-4">
                            {/* Rincian Aset */}
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge nada="info">{targetRiwayatPerbaikan.kode_aset}</Badge>
                                        <span className="font-semibold text-ink-900 text-sm">{targetRiwayatPerbaikan.nama_barang}</span>
                                    </div>
                                    {targetRiwayatPerbaikan.merek_tipe && (
                                        <span className="text-ink-500">Model: {targetRiwayatPerbaikan.merek_tipe}</span>
                                    )}
                                </div>

                                {/* Waktu pengerjaan */}
                                <div className="border-t border-line/60 pt-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-ink-500 block">Tanggal Mulai:</span>
                                        <p className="font-medium text-ink-900 mt-0.5">{targetRiwayatPerbaikan.tanggal_mulai}</p>
                                    </div>
                                    <div>
                                        <span className="text-ink-500 block">Tanggal Selesai:</span>
                                        <p className="font-medium text-ink-900 mt-0.5">{targetRiwayatPerbaikan.tanggal_selesai}</p>
                                    </div>
                                </div>

                                <div className="border-t border-line/60 pt-2">
                                    <span className="font-medium text-ink-500 block">Keluhan / Kerusakan Awal:</span>
                                    <p className="mt-1 text-ink-800 whitespace-pre-wrap leading-relaxed">{targetRiwayatPerbaikan.deskripsi_kerusakan}</p>
                                </div>

                                {targetRiwayatPerbaikan.foto_url && (
                                    <div className="border-t border-line/60 pt-2">
                                        <span className="font-medium text-ink-500 block mb-1">Bukti Foto Fisik:</span>
                                        <a href={targetRiwayatPerbaikan.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                            <img
                                                src={targetRiwayatPerbaikan.foto_url}
                                                alt="Foto Kerusakan"
                                                className="h-28 w-28 rounded-lg object-cover border border-line group-hover:opacity-90 shadow-sm"
                                            />
                                            <span className="block text-[11px] text-brand-600 group-hover:underline mt-1 font-medium">
                                                Lihat foto ukuran penuh ↗
                                            </span>
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Hasil Pengerjaan */}
                            <div className="rounded-lg border border-brand-100 bg-brand-50/30 p-4 text-xs space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Laporan Hasil Pekerjaan</p>

                                <div>
                                    <span className="font-semibold text-ink-900 block">Analisis / Hasil Pemeriksaan:</span>
                                    <p className="mt-1 text-ink-800 whitespace-pre-wrap leading-relaxed">
                                        {targetRiwayatPerbaikan.hasil_pemeriksaan || 'Tidak ada catatan analisis khusus.'}
                                    </p>
                                </div>

                                <div className="border-t border-line pt-2">
                                    <span className="font-semibold text-ink-900 block">Tindakan Hasil Perbaikan:</span>
                                    <p className="mt-1 text-ink-800 whitespace-pre-wrap leading-relaxed">
                                        {targetRiwayatPerbaikan.hasil_perbaikan || '-'}
                                    </p>
                                </div>

                                <div className="border-t border-line pt-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-ink-500 block">Estimasi Biaya Awal:</span>
                                        <p className="font-medium text-ink-900 mt-0.5">
                                            {targetRiwayatPerbaikan.estimasi_biaya > 0 ? formatRupiah(targetRiwayatPerbaikan.estimasi_biaya) : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-ink-500 block">Biaya Aktual Realisasi:</span>
                                        <p className={`font-bold text-sm mt-0.5 ${targetRiwayatPerbaikan.biaya_aktual > 0 ? 'text-brand-700' : 'text-ink-400 italic'}`}>
                                            {targetRiwayatPerbaikan.biaya_aktual > 0 ? formatRupiah(targetRiwayatPerbaikan.biaya_aktual) : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end border-t border-line pt-4">
                            <SecondaryButton onClick={() => setModalPerbaikanBuka(false)}>Tutup</SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Detail Riwayat Pemeliharaan */}
            <Modal show={modalPemeliharaanBuka} onClose={() => setModalPemeliharaanBuka(false)} maxWidth="2xl">
                {targetRiwayatPemeliharaan && (
                    <div className="p-6">
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Arsip Realisasi Pemeliharaan Aset
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">{targetRiwayatPemeliharaan.jenis_pemeliharaan}</h3>
                                <p className="text-xs text-ink-600 mt-0.5">
                                    Target Jadwal: <span className="font-medium text-ink-800">{targetRiwayatPemeliharaan.tanggal_jadwal}</span>
                                    {' '}· Tanggal Selesai: <span className="font-semibold text-brand-700">{targetRiwayatPemeliharaan.tanggal_pelaksanaan}</span>
                                </p>
                            </div>
                            <Badge nada="sukses">Selesai</Badge>
                        </div>

                        <div className="my-5 space-y-4">
                            {/* Rincian Aset */}
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge nada="info">{targetRiwayatPemeliharaan.kode_aset}</Badge>
                                        <span className="font-semibold text-ink-900 text-sm">{targetRiwayatPemeliharaan.nama_barang}</span>
                                    </div>
                                    <Badge nada="netral">{targetRiwayatPemeliharaan.kategori}</Badge>
                                </div>
                                {targetRiwayatPemeliharaan.merek_tipe && (
                                    <p className="text-ink-500">Merek / Tipe: {targetRiwayatPemeliharaan.merek_tipe}</p>
                                )}
                                <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                                    <span className="text-ink-500">Kondisi Fisik:</span>
                                    <KondisiBadge kondisi={targetRiwayatPemeliharaan.kondisi} />
                                </div>
                            </div>

                            {/* Hasil & Realisasi Pekerjaan */}
                            <div className="rounded-lg border border-brand-100 bg-brand-50/30 p-4 text-xs space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                                    Laporan Hasil Pemeliharaan
                                </p>

                                <div>
                                    <span className="font-semibold text-ink-900 block mb-1">Uraian Tindakan Pemeliharaan yang Dilakukan:</span>
                                    <p className="text-ink-800 whitespace-pre-wrap leading-relaxed rounded-md border border-line/60 bg-white p-3">
                                        {targetRiwayatPemeliharaan.uraian || 'Tidak ada catatan uraian khusus.'}
                                    </p>
                                </div>

                                <div className="border-t border-line pt-2 flex items-center justify-between">
                                    <span className="text-ink-500 font-medium">Realisasi Biaya Bahan / Komponen:</span>
                                    <span className={`font-bold text-sm ${targetRiwayatPemeliharaan.biaya > 0 ? 'text-brand-700' : 'text-ink-400 italic'}`}>
                                        {targetRiwayatPemeliharaan.biaya > 0 ? formatRupiah(targetRiwayatPemeliharaan.biaya) : 'Rp 0'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end border-t border-line pt-4">
                            <SecondaryButton onClick={() => setModalPemeliharaanBuka(false)}>Tutup</SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
