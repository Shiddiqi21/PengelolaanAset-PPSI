import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
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

export default function RiwayatIndex({ daftarRiwayat, filters }) {
    const [q, setQ] = useState(filters.q || '');
    const [modalBuka, setModalBuka] = useState(false);
    const [targetRiwayat, setTargetRiwayat] = useState(null);
    const isFirstRender = useRef(true);

    const terapkanFilter = (keyword) => {
        router.get(
            route('teknisi.riwayat'),
            { q: keyword || undefined },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            terapkanFilter(q);
        }, 350);

        return () => clearTimeout(timer);
    }, [q]);

    const bukaModal = (item) => {
        setTargetRiwayat(item);
        setModalBuka(true);
    };

    const kolom = [
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
                    onClick={() => bukaModal(b)}
                    className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-surface"
                >
                    Lihat detail
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Riwayat Pekerjaan Teknisi" />

            <PageHeader
                breadcrumb={['FTI', 'Riwayat pekerjaan']}
                judul="Riwayat pekerjaan perbaikan"
                deskripsi="Daftar seluruh pekerjaan perbaikan aset fakultas yang telah berhasil Anda selesaikan."
            >
                <TautanAksi href={route('teknisi.tugas')} varian="sekunder">
                    ← Tugas aktif
                </TautanAksi>
            </PageHeader>

            <div className="space-y-4">
                <div className="w-full sm:max-w-xs">
                    <SearchInput
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari tiket, aset, pemohon..."
                    />
                </div>

                <Card>
                    <DataTable
                        kolom={kolom}
                        baris={daftarRiwayat.data}
                        kunciBaris="id_item_perbaikan"
                        kosong={
                            <EmptyState
                                judul={q ? 'Riwayat tidak ditemukan' : 'Belum ada riwayat perbaikan'}
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
            </div>

            {/* Modal Detail Riwayat */}
            <Modal show={modalBuka} onClose={() => setModalBuka(false)} maxWidth="2xl">
                {targetRiwayat && (
                    <div className="p-6">
                        {/* Header Modal */}
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Arsip Hasil Pekerjaan Perbaikan
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">{targetRiwayat.nomor_pengajuan}</h3>
                                <p className="text-xs text-ink-600">
                                    Pengusul: {targetRiwayat.pemohon_nama} &mdash; {targetRiwayat.unit_nama}
                                </p>
                            </div>
                            <Badge nada="sukses">Selesai</Badge>
                        </div>

                        <div className="my-5 space-y-4">
                            {/* Rincian Aset */}
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge nada="info">{targetRiwayat.kode_aset}</Badge>
                                        <span className="font-semibold text-ink-900 text-sm">{targetRiwayat.nama_barang}</span>
                                    </div>
                                    {targetRiwayat.merek_tipe && (
                                        <span className="text-ink-500">Model: {targetRiwayat.merek_tipe}</span>
                                    )}
                                </div>

                                {/* Waktu pengerjaan */}
                                <div className="border-t border-line/60 pt-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-ink-500 block">Tanggal Mulai:</span>
                                        <p className="font-medium text-ink-900 mt-0.5">{targetRiwayat.tanggal_mulai}</p>
                                    </div>
                                    <div>
                                        <span className="text-ink-500 block">Tanggal Selesai:</span>
                                        <p className="font-medium text-ink-900 mt-0.5">{targetRiwayat.tanggal_selesai}</p>
                                    </div>
                                </div>

                                <div className="border-t border-line/60 pt-2">
                                    <span className="font-medium text-ink-500 block">Keluhan / Kerusakan Awal:</span>
                                    <p className="mt-1 text-ink-800 whitespace-pre-wrap leading-relaxed">{targetRiwayat.deskripsi_kerusakan}</p>
                                </div>

                                {targetRiwayat.foto_url && (
                                    <div className="border-t border-line/60 pt-2">
                                        <span className="font-medium text-ink-500 block mb-1">Bukti Foto Fisik:</span>
                                        <a href={targetRiwayat.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                            <img
                                                src={targetRiwayat.foto_url}
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
                                        {targetRiwayat.hasil_pemeriksaan || 'Tidak ada catatan analisis khusus.'}
                                    </p>
                                </div>

                                <div className="border-t border-line pt-2">
                                    <span className="font-semibold text-ink-900 block">Tindakan Hasil Perbaikan:</span>
                                    <p className="mt-1 text-ink-800 whitespace-pre-wrap leading-relaxed">
                                        {targetRiwayat.hasil_perbaikan || '-'}
                                    </p>
                                </div>

                                <div className="border-t border-line pt-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-ink-500 block">Estimasi Biaya Awal:</span>
                                        <p className="font-medium text-ink-900 mt-0.5">
                                            {targetRiwayat.estimasi_biaya > 0 ? formatRupiah(targetRiwayat.estimasi_biaya) : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-ink-500 block">Biaya Aktual Realisasi:</span>
                                        <p className={`font-bold text-sm mt-0.5 ${targetRiwayat.biaya_aktual > 0 ? 'text-brand-700' : 'text-ink-400 italic'}`}>
                                            {targetRiwayat.biaya_aktual > 0 ? formatRupiah(targetRiwayat.biaya_aktual) : '—'}
                                        </p>
                                    </div>
                                </div>

                                {targetRiwayat.perlu_vendor && (
                                    <div className="border-t border-line pt-2">
                                        <Badge nada="peringatan">Ditangani dengan Vendor Eksternal</Badge>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end border-t border-line pt-4">
                            <SecondaryButton onClick={() => setModalBuka(false)}>Tutup</SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
