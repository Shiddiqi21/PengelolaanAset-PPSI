import Alert from '@/Components/ui/Alert';
import Card, { IsiKartu } from '@/Components/ui/Card';
import CatatanDataContoh from '@/Components/ui/CatatanDataContoh';
import DataTable from '@/Components/ui/DataTable';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import Timeline from '@/Components/ui/Timeline';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Pegawai({ judul, deskripsi, banner, kpi, aset, aktivitas, layanan }) {
    const kolom = [
        { kunci: 'kode', judul: 'Kode aset', className: 'font-semibold' },
        { kunci: 'nama', judul: 'Nama aset' },
        { kunci: 'lokasi', judul: 'Lokasi' },
        { judul: 'Kondisi', render: (b) => <StatusText nada={b.nada}>{b.kondisi}</StatusText> },
        { judul: 'Aksi', render: (b) => <TautanAksi href={b.href}>{b.aksi}</TautanAksi> },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard pegawai / dosen" />

            <PageHeader breadcrumb={['FTI', 'Dashboard']} judul={judul} deskripsi={deskripsi} />

            {banner && <Alert nada={banner.nada} className="mb-6">{banner.teks}</Alert>}

            <StatGrid>
                {kpi.map((k) => (
                    <StatCard key={k.label} {...k} />
                ))}
            </StatGrid>

            <Card
                judul="Aset pribadi saya"
                tautan={{ label: 'Lihat semua aset', href: route('pegawai.aset') }}
                className="mt-6"
            >
                <div className="pt-3">
                    <DataTable kolom={kolom} baris={aset.baris} kunciBaris="kode" />
                </div>
                <Pagination from={1} to={aset.baris.length} total={aset.total} />
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card judul="Aktivitas inventaris">
                    <IsiKartu>
                        <Timeline item={aktivitas} />
                    </IsiKartu>
                </Card>
                <Card judul="Informasi layanan aset" className="self-start">
                    <IsiKartu>
                        <InfoList item={layanan} />
                    </IsiKartu>
                </Card>
            </div>

            <CatatanDataContoh />
        </AuthenticatedLayout>
    );
}
