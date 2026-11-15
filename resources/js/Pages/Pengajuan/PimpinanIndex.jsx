import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import TabNav from '@/Components/ui/TabNav';
import TautanAksi from '@/Components/ui/TautanAksi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function formatRupiah(angka) {
    if (!angka || angka === 0) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka);
}

export default function PimpinanIndex({ daftarPersetujuan, tabAktif = 'menunggu', filters = {} }) {
    const [q, setQ] = useState(filters.q || '');
    const [jenis, setJenis] = useState(filters.jenis || '');
    const isFirstRender = useRef(true);

    const terapkanFilter = (pencarian, filterJenis, tab) => {
        router.get(
            route('pimpinan.persetujuan'),
            {
                q: pencarian || undefined,
                jenis: filterJenis || undefined,
                tab: tab,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    // Live search dengan debounce ~350ms
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            terapkanFilter(q, jenis, tabAktif);
        }, 350);

        return () => clearTimeout(timer);
    }, [q, jenis]);

    const handleSearch = (e) => {
        e.preventDefault();
        terapkanFilter(q, jenis, tabAktif);
    };

    const handleGantiJenis = (e) => {
        const val = e.target.value;
        setJenis(val);
    };

    const handleGantiTab = (tabBaru) => {
        terapkanFilter(q, jenis, tabBaru);
    };

    const kolom = [
        {
            kunci: 'nomor_pengajuan',
            judul: 'Nomor Pengajuan',
            className: 'font-semibold text-ink-900 whitespace-nowrap',
        },
        {
            kunci: 'pemohon_nama',
            judul: 'Unit & Pengusul',
            render: (b) => (
                <div>
                    <p className="font-semibold text-ink-900">{b.unit_nama}</p>
                    <p className="text-xs text-ink-500">Oleh: {b.pemohon_nama}</p>
                </div>
            ),
        },
        {
            judul: 'Jenis',
            render: (b) => <Badge nada="netral">{b.jenis_label}</Badge>,
        },
        {
            judul: 'Estimasi Anggaran',
            render: (b) => (
                <span className="font-semibold text-brand-700">
                    {formatRupiah(b.total_estimasi)}
                </span>
            ),
        },
        {
            kunci: 'tanggal_rekomendasi',
            judul: 'Tgl Rekomendasi',
            className: 'whitespace-nowrap text-ink-600',
        },
        {
            judul: 'Status',
            render: (b) => <Badge nada={b.status_nada}>{b.status_label}</Badge>,
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (b) => (
                <TautanAksi href={route('pimpinan.persetujuan.show', b.id_pengajuan)}>
                    Buka pengajuan
                </TautanAksi>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Persetujuan pengajuan — Pimpinan" />

            <PageHeader
                breadcrumb={['FTI', 'Persetujuan pengajuan']}
                judul="Persetujuan pengajuan"
                deskripsi="Daftar usulan pengadaan, perbaikan, dan mutasi aset yang memerlukan persetujuan pimpinan fakultas."
            />

            <div className="space-y-4">
                {/* Tab Kategori Persetujuan */}
                <TabNav
                    tab={[
                        {
                            label: 'Menunggu persetujuan',
                            href: route('pimpinan.persetujuan', {
                                tab: 'menunggu',
                                ...(q ? { q } : {}),
                                ...(jenis ? { jenis } : {}),
                            }),
                            aktif: tabAktif === 'menunggu',
                        },
                        {
                            label: 'Riwayat keputusan',
                            href: route('pimpinan.persetujuan', {
                                tab: 'riwayat',
                                ...(q ? { q } : {}),
                                ...(jenis ? { jenis } : {}),
                            }),
                            aktif: tabAktif === 'riwayat',
                        },
                        {
                            label: 'Semua usulan',
                            href: route('pimpinan.persetujuan', {
                                tab: 'semua',
                                ...(q ? { q } : {}),
                                ...(jenis ? { jenis } : {}),
                            }),
                            aktif: tabAktif === 'semua',
                        },
                    ]}
                />

                {/* Filter dan Pencarian */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <form onSubmit={handleSearch} className="w-full sm:max-w-xs">
                        <SearchInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari nomor, unit, perihal..."
                        />
                    </form>

                    <div className="flex items-center gap-2">
                        <SelectInput
                            value={jenis}
                            onChange={handleGantiJenis}
                            className="text-xs"
                        >
                            <option value="">Semua jenis pengajuan</option>
                            <option value="pengadaan">Pengadaan</option>
                            <option value="perbaikan">Perbaikan</option>
                            <option value="mutasi">Mutasi</option>
                            <option value="penghapusan">Penghapusan</option>
                        </SelectInput>

                        {(q || jenis) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQ('');
                                    setJenis('');
                                    terapkanFilter('', '', tabAktif);
                                }}
                                className="text-xs font-semibold text-brand-600 hover:underline"
                            >
                                Reset filter
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabel Persetujuan */}
                <Card>
                    <DataTable
                        kolom={kolom}
                        baris={daftarPersetujuan.data}
                        kunciBaris="id_pengajuan"
                        kosong={
                            <EmptyState
                                judul={
                                    (q || jenis)
                                        ? 'Data tidak ditemukan'
                                        : tabAktif === 'menunggu'
                                          ? 'Tidak ada pengajuan yang menunggu persetujuan'
                                          : tabAktif === 'riwayat'
                                            ? 'Belum ada riwayat keputusan pengajuan'
                                            : 'Tidak ada usulan pengajuan yang ditemukan'
                                }
                                deskripsi={
                                    (q || jenis)
                                        ? 'Tidak ada pengajuan yang cocok dengan kata kunci atau filter yang dipilih.'
                                        : tabAktif === 'menunggu'
                                          ? 'Semua usulan telah Anda putuskan atau belum ada rekomendasi baru dari Kepala Kantor.'
                                          : 'Belum ada data pengajuan yang selesai diproses atau diputuskan.'
                                }
                            />
                        }
                    />
                    <Pagination
                        links={daftarPersetujuan.links}
                        from={daftarPersetujuan.from}
                        to={daftarPersetujuan.to}
                        total={daftarPersetujuan.total}
                    />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
