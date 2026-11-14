import Alert from '@/Components/ui/Alert';
import Card, { IsiKartu } from '@/Components/ui/Card';
import CatatanDataContoh from '@/Components/ui/CatatanDataContoh';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import Timeline from '@/Components/ui/Timeline';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function KepalaKantor({ judul, deskripsi, kpi, banner, pemeriksaan, aktivitas, agenda }) {
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
            <Head title="Dashboard kepala kantor" />

            <PageHeader breadcrumb={['FTI', 'Dashboard']} judul={judul} deskripsi={deskripsi} />

            <StatGrid>
                {kpi.map((k) => (
                    <StatCard key={k.label} {...k} />
                ))}
            </StatGrid>

            {banner && <Alert nada={banner.nada} className="mt-6">{banner.teks}</Alert>}

            <Card
                judul="Prioritas pemeriksaan"
                deskripsi="Pengajuan telah diverifikasi operator"
                tautan={{ label: 'Buka daftar pengajuan', href: route('kepala-kantor.pengajuan') }}
                className="mt-6"
            >
                <div className="pt-3">
                    <DataTable kolom={kolom} baris={pemeriksaan.baris} kunciBaris="nomor" />
                </div>
                <Pagination from={1} to={pemeriksaan.baris.length} total={pemeriksaan.total} />
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card judul="Aktivitas pemeriksaan">
                    <IsiKartu>
                        <Timeline item={aktivitas} />
                    </IsiKartu>
                </Card>
                <Card judul="Agenda kantor">
                    <IsiKartu>
                        <Timeline item={agenda} />
                    </IsiKartu>
                </Card>
            </div>

            <CatatanDataContoh />
        </AuthenticatedLayout>
    );
}
