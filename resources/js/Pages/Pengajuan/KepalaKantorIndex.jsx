import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
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

export default function KepalaKantorIndex({ daftarPengajuan, statistik, filters }) {
    const [q, setQ] = useState(filters.q || '');
    const [jenis, setJenis] = useState(filters.jenis || '');
    const [status, setStatus] = useState(filters.status || '');
    const isFirstRender = useRef(true);

    const terapkanFilter = (pencarian, filterJenis, filterStatus) => {
        router.get(
            route('kepala-kantor.pengajuan'),
            {
                q: pencarian || undefined,
                jenis: filterJenis || undefined,
                status: filterStatus || undefined,
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
            terapkanFilter(q, jenis, status);
        }, 350);

        return () => clearTimeout(timer);
    }, [q, jenis, status]);

    const handleSearch = (e) => {
        e.preventDefault();
        terapkanFilter(q, jenis, status);
    };

    const handleGantiJenis = (e) => {
        const val = e.target.value;
        setJenis(val);
    };

    const handleGantiStatus = (e) => {
        const val = e.target.value;
        setStatus(val);
    };

    const kolom = [
        {
            kunci: 'nomor_pengajuan',
            judul: 'Nomor Pengajuan',
            className: 'font-semibold text-ink-900 whitespace-nowrap',
        },
        {
            kunci: 'pemohon_nama',
            judul: 'Pemohon & Unit',
            render: (b) => (
                <div>
                    <p className="font-medium text-ink-900">{b.pemohon_nama}</p>
                    <p className="text-xs text-ink-500">{b.unit_nama}</p>
                </div>
            ),
        },
        {
            judul: 'Jenis',
            render: (b) => <Badge nada="netral">{b.jenis_label}</Badge>,
        },
        {
            kunci: 'tanggal_pengajuan',
            judul: 'Tanggal',
            className: 'whitespace-nowrap text-ink-600',
        },
        {
            judul: 'Estimasi Nilai',
            render: (b) => (
                <span className="font-medium text-ink-900">{formatRupiah(b.total_estimasi)}</span>
            ),
        },
        {
            judul: 'Pemeriksaan Operator',
            render: (b) => (
                <Badge nada={b.sudah_diperiksa_operator ? 'sukses' : 'netral'}>
                    {b.sudah_diperiksa_operator ? 'Sudah Diperiksa' : 'Belum'}
                </Badge>
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
                <TautanAksi href={route('kepala-kantor.pengajuan.show', b.id_pengajuan)}>
                    {b.sudah_diperiksa_operator ? 'Tinjau' : 'Lihat'}
                </TautanAksi>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Daftar pengajuan — Kepala Kantor" />

            <PageHeader
                breadcrumb={['FTI', 'Daftar pengajuan']}
                judul="Daftar pengajuan"
                deskripsi="Tinjauan usulan kebutuhan aset unit kerja untuk verifikasi operasional dan rekomendasi ke pimpinan."
            />

            <div className="space-y-6">
                {/* Kartu Indikator KPI Kepala Kantor */}
                <StatGrid>
                    <StatCard
                        label="Menunggu verifikasi"
                        nilai={String(statistik.menunggu || 0)}
                        keterangan="Usulan masuk siap ditinjau"
                        nada="peringatan"
                    />
                    <StatCard
                        label="Telah direkomendasikan"
                        nilai={String(statistik.direkomendasikan || 0)}
                        keterangan="Diteruskan ke Pimpinan"
                        nada="sukses"
                    />
                    <StatCard
                        label="Telah diputuskan"
                        nilai={String(statistik.diputuskan ?? 0)}
                        keterangan="Disetujui / Selesai / Ditolak"
                        nada="info"
                    />
                    <StatCard
                        label="Total pengajuan masuk"
                        nilai={String(statistik.total || 0)}
                        keterangan="Seluruh usulan non-draf"
                        nada="netral"
                    />
                </StatGrid>

                {/* Filter dan Pencarian */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <form onSubmit={handleSearch} className="w-full sm:max-w-xs">
                        <SearchInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari nomor, pemohon, perihal..."
                        />
                    </form>

                    <div className="flex flex-wrap items-center gap-2">
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

                        <SelectInput
                            value={status}
                            onChange={handleGantiStatus}
                            className="text-xs"
                        >
                            <option value="">Semua status</option>
                            <option value="diajukan">Menunggu verifikasi (diajukan)</option>
                            <option value="disetujui_kadep">Direkomendasikan (disetujui kadep)</option>
                            <option value="disetujui_pimpinan">Disetujui Pimpinan</option>
                            <option value="ditolak">Ditolak</option>
                        </SelectInput>

                        {(q || jenis || status) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQ('');
                                    setJenis('');
                                    setStatus('');
                                    terapkanFilter('', '', '');
                                }}
                                className="text-xs font-semibold text-brand-600 hover:underline"
                            >
                                Reset filter
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabel Data Pengajuan */}
                <Card>
                    <DataTable
                        kolom={kolom}
                        baris={daftarPengajuan.data}
                        kunciBaris="id_pengajuan"
                        kosong={
                            <EmptyState
                                judul={(q || jenis || status) ? 'Data tidak ditemukan' : 'Belum ada pengajuan'}
                                deskripsi={
                                    (q || jenis || status)
                                        ? 'Tidak ada pengajuan yang cocok dengan kata kunci atau filter yang dipilih.'
                                        : 'Belum ada data usulan pengajuan yang masuk.'
                                }
                            />
                        }
                    />
                    <Pagination
                        links={daftarPengajuan.links}
                        from={daftarPengajuan.from}
                        to={daftarPengajuan.to}
                        total={daftarPengajuan.total}
                    />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
