import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const TAB_STATUS = [
    { nilai: '', label: 'Semua riwayat' },
    { nilai: 'aktif', label: 'Aktif' },
    { nilai: 'selesai', label: 'Selesai' },
];

export default function Index({ unitInfo, kpi = [], riwayat, filter }) {
    const [q, setQ] = useState(filter.q ?? '');
    const [status, setStatus] = useState(filter.status ?? '');
    const timerCari = useRef(null);

    const adaFilter = q !== '' || status !== '';

    const terapkan = (nilaiBaru) => {
        const params = Object.fromEntries(
            Object.entries(nilaiBaru).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );

        router.get(route('pemohon.riwayat-perpindahan'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        return () => {
            if (timerCari.current) {
                clearTimeout(timerCari.current);
            }
        };
    }, []);

    const ubahKataKunci = (nilai) => {
        setQ(nilai);
        if (timerCari.current) {
            clearTimeout(timerCari.current);
        }
        timerCari.current = setTimeout(() => {
            terapkan({ q: nilai, status });
        }, 300);
    };

    const cari = (e) => {
        e.preventDefault();
        if (timerCari.current) {
            clearTimeout(timerCari.current);
        }
        terapkan({ q, status });
    };

    const pilihTabStatus = (nilaiStatus) => {
        setStatus(nilaiStatus);
        terapkan({ q, status: nilaiStatus });
    };

    const aturUlang = () => {
        setQ('');
        setStatus('');
        terapkan({});
    };

    const kolom = [
        {
            judul: 'Aset',
            render: (b) => (
                <div>
                    <div className="font-semibold text-ink-900">{b.nama_barang}</div>
                    <div className="text-xs font-mono text-ink-500">
                        {b.kode_aset} · {b.kategori}
                    </div>
                </div>
            ),
        },
        {
            judul: 'Ruangan & PJ',
            render: (b) => (
                <div>
                    <div className="font-medium text-ink-900">{b.ruangan}</div>
                    <div className="text-xs text-ink-500">PJ: {b.penanggung_jawab}</div>
                </div>
            ),
        },
        {
            judul: 'Periode',
            className: 'whitespace-nowrap',
            render: (b) => (
                <div className="text-xs text-ink-700">
                    <div>{b.tanggal_mulai_label}</div>
                    <div className="text-ink-500">s/d {b.tanggal_selesai_label}</div>
                </div>
            ),
        },
        {
            judul: 'Sumber',
            render: (b) =>
                b.nomor_mutasi && b.id_pengajuan_mutasi ? (
                    <Link
                        href={route('pemohon.pengajuan.show', b.id_pengajuan_mutasi)}
                        className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                    >
                        {b.nomor_mutasi}
                    </Link>
                ) : (
                    <Badge nada="netral">Penempatan awal</Badge>
                ),
        },
        {
            judul: 'Status',
            render: (b) => (
                <StatusText nada={b.aktif ? 'sukses' : 'netral'}>{b.aktif ? 'Aktif' : 'Selesai'}</StatusText>
            ),
        },
        {
            judul: 'Aksi',
            render: (b) =>
                b.id_aset ? (
                    <TautanAksi href={route('pemohon.aset-unit.show', b.id_aset)}>Lihat</TautanAksi>
                ) : (
                    <span className="text-xs text-ink-400">-</span>
                ),
        },
    ];

    const namaUnitRingkas = unitInfo?.nama_ringkas ?? 'Unit Kerja';
    const namaUnitLengkap = unitInfo?.nama_unit ?? 'Fakultas Teknologi Informasi';

    return (
        <AuthenticatedLayout>
            <Head title="Riwayat perpindahan" />

            <PageHeader
                breadcrumb={['FTI', 'Riwayat perpindahan']}
                judul="Riwayat perpindahan"
                deskripsi={`Jejak penempatan ruangan dan mutasi aset pada ${namaUnitLengkap}.`}
            />

            <StatGrid>
                {kpi.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
            </StatGrid>

            <section className="mt-6 rounded-kartu border border-line bg-white">
                <header className="px-6 pt-6">
                    <h2 className="text-lg font-semibold text-ink-900">Riwayat penempatan &amp; mutasi {namaUnitRingkas}</h2>

                    <nav aria-label="Filter status penempatan aset" className="mt-4 flex flex-wrap gap-6 border-b border-line">
                        {TAB_STATUS.map((t) => {
                            const aktif = status === t.nilai;

                            return (
                                <button
                                    key={t.label}
                                    type="button"
                                    onClick={() => pilihTabStatus(t.nilai)}
                                    aria-current={aktif ? 'page' : undefined}
                                    className={`-mb-px border-b-2 pb-2.5 text-sm transition ${
                                        aktif
                                            ? 'border-brand-600 font-semibold text-brand-700'
                                            : 'border-transparent text-ink-600 hover:border-line hover:text-ink-900'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </nav>
                </header>

                <form onSubmit={cari} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
                    <div className="flex-1">
                        <SearchInput
                            id="cari-riwayat-perpindahan"
                            value={q}
                            onChange={(e) => ubahKataKunci(e.target.value)}
                            placeholder="Cari kode/nama aset, ruangan, PJ, atau nomor mutasi..."
                            aria-label="Cari riwayat perpindahan aset"
                        />
                    </div>

                    {adaFilter && (
                        <SecondaryButton type="button" onClick={aturUlang}>
                            Atur ulang
                        </SecondaryButton>
                    )}
                </form>

                <DataTable
                    kolom={kolom}
                    baris={riwayat.data}
                    kunciBaris="id_penempatan"
                    kosong={
                        <EmptyState
                            judul="Tidak ada riwayat perpindahan"
                            deskripsi={
                                adaFilter
                                    ? 'Ubah kata kunci pencarian atau pilih tab status lainnya.'
                                    : 'Riwayat penempatan dan mutasi aset unit Anda akan tercatat di sini.'
                            }
                        />
                    }
                />

                <Pagination links={riwayat.links} from={riwayat.from} to={riwayat.to} total={riwayat.total} />
            </section>

            <Alert nada="info" className="mt-6">
                Setiap perpindahan resmi akan menutup masa penempatan sebelumnya tanpa menghapus jejak historis aset.
            </Alert>
        </AuthenticatedLayout>
    );
}
