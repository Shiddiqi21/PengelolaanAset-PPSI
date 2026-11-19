import Alert from '@/Components/ui/Alert';
import BarChart from '@/Components/ui/BarChart';
import Card, { IsiKartu } from '@/Components/ui/Card';
import CatatanDataContoh from '@/Components/ui/CatatanDataContoh';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import ProgressList from '@/Components/ui/ProgressList';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function Pimpinan({ judul, deskripsi, banner, kpi, grafik, kondisi, persetujuan = [] }) {
    const [kataKunci, setKataKunci] = useState('');
    const [filterJenis, setFilterJenis] = useState('Semua jenis');

    const persetujuanTersaring = useMemo(() => {
        return persetujuan.filter((item) => {
            const cocokQ =
                !kataKunci ||
                String(item.nomor || '').toLowerCase().includes(kataKunci.toLowerCase()) ||
                String(item.jenis || '').toLowerCase().includes(kataKunci.toLowerCase()) ||
                String(item.pemohon || '').toLowerCase().includes(kataKunci.toLowerCase());

            const cocokJenis =
                filterJenis === 'Semua jenis' ||
                String(item.jenis || '').toLowerCase().startsWith(filterJenis.toLowerCase());

            return cocokQ && cocokJenis;
        });
    }, [persetujuan, kataKunci, filterJenis]);

    const kolom = [
        { kunci: 'nomor', judul: 'Nomor pengajuan', className: 'font-semibold' },
        { kunci: 'jenis', judul: 'Jenis / perihal' },
        { kunci: 'pemohon', judul: 'Pemohon' },
        { kunci: 'tanggal', judul: 'Tanggal' },
        { judul: 'Status', render: (b) => <StatusText nada={b.nada}>{b.status}</StatusText> },
        { judul: 'Aksi', render: (b) => <TautanAksi href={b.href}>{b.aksi}</TautanAksi> },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard pimpinan" />

            <PageHeader breadcrumb={['FTI', 'Dashboard']} judul={judul} deskripsi={deskripsi}>
                <PrimaryButton type="button" onClick={() => window.print()}>
                    ↓ Unduh ringkasan
                </PrimaryButton>
            </PageHeader>

            {banner && <Alert nada={banner.nada} className="mb-6">{banner.teks}</Alert>}

            <StatGrid>
                {kpi.map((k) => (
                    <StatCard key={k.label} {...k} />
                ))}
            </StatGrid>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card judul="Perolehan dan penyusutan" deskripsi="Mei–Oktober 2026" className="lg:col-span-2">
                    <IsiKartu>
                        <BarChart data={grafik.data} namaA={grafik.seriA} namaB={grafik.seriB} satuan={grafik.satuan} />
                    </IsiKartu>
                </Card>

                <Card judul="Kondisi aset" className="self-start">
                    <IsiKartu>
                        <ProgressList item={kondisi} />
                    </IsiKartu>
                </Card>
            </div>

            <Card
                judul="Prioritas persetujuan"
                deskripsi="Pengajuan yang telah diperiksa dan siap diputuskan"
                tautan={{ label: 'Lihat semua', href: route('pimpinan.persetujuan') }}
                className="mt-6"
            >
                <div className="flex flex-wrap gap-3 px-6 pb-4 pt-4">
                    <SearchInput
                        value={kataKunci}
                        onChange={(e) => setKataKunci(e.target.value)}
                        className="min-w-[14rem] flex-1"
                        placeholder="Cari nomor pengajuan..."
                        aria-label="Cari nomor pengajuan"
                    />
                    <SelectInput
                        value={filterJenis}
                        onChange={(e) => setFilterJenis(e.target.value)}
                        aria-label="Jenis pengajuan"
                    >
                        <option value="Semua jenis">Semua jenis</option>
                        <option value="Pengadaan">Pengadaan</option>
                        <option value="Perbaikan">Perbaikan</option>
                        <option value="Mutasi">Mutasi</option>
                        <option value="Penghapusan">Penghapusan</option>
                    </SelectInput>
                </div>
                <DataTable kolom={kolom} baris={persetujuanTersaring} kunciBaris="nomor" />
                <Pagination
                    from={persetujuanTersaring.length > 0 ? 1 : 0}
                    to={persetujuanTersaring.length}
                    total={persetujuanTersaring.length}
                />
            </Card>

            <CatatanDataContoh />
        </AuthenticatedLayout>
    );
}
