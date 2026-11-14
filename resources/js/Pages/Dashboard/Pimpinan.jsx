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

export default function Pimpinan({ judul, deskripsi, banner, kpi, grafik, kondisi, persetujuan }) {
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
                <PrimaryButton type="button">↓ Unduh ringkasan</PrimaryButton>
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
                    <SearchInput className="min-w-[14rem] flex-1" placeholder="Cari nomor pengajuan..." aria-label="Cari nomor pengajuan" />
                    <SelectInput aria-label="Jenis pengajuan">
                        <option>Semua jenis</option>
                        <option>Pengadaan</option>
                        <option>Perbaikan</option>
                    </SelectInput>
                </div>
                <DataTable kolom={kolom} baris={persetujuan} kunciBaris="nomor" />
                <Pagination from={1} to={persetujuan.length} total={persetujuan.length} />
            </Card>

            <CatatanDataContoh />
        </AuthenticatedLayout>
    );
}
