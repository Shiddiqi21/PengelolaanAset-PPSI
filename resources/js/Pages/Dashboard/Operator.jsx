import Alert from '@/Components/ui/Alert';
import Card, { IsiKartu } from '@/Components/ui/Card';
import CatatanDataContoh from '@/Components/ui/CatatanDataContoh';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import ProgressList from '@/Components/ui/ProgressList';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import TautanAksi from '@/Components/ui/TautanAksi';
import Timeline from '@/Components/ui/Timeline';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Operator({ judul, deskripsi, kpi, banner, antrean, kondisi, aktivitas, jadwal }) {
    const kolom = [
        { kunci: 'referensi', judul: 'Referensi', className: 'font-semibold' },
        { kunci: 'pekerjaan', judul: 'Pekerjaan' },
        { kunci: 'batas', judul: 'Batas layanan' },
        { judul: 'Aksi', render: (b) => <TautanAksi href={b.href}>{b.aksi}</TautanAksi> },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard operator aset" />

            <PageHeader breadcrumb={['FTI', 'Dashboard']} judul={judul} deskripsi={deskripsi}>
                <TombolLink href={route('aset.index')}>+ Tambah aset</TombolLink>
            </PageHeader>

            <StatGrid>
                {kpi.map((k) => (
                    <StatCard key={k.label} {...k} />
                ))}
            </StatGrid>

            {banner && <Alert nada={banner.nada} className="mt-6">{banner.teks}</Alert>}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card
                    judul="Antrean pekerjaan"
                    tautan={{ label: 'Lihat pemeriksaan', href: route('pemeriksaan.index') }}
                    className="lg:col-span-2"
                >
                    <div className="pt-3">
                        <DataTable kolom={kolom} baris={antrean} kunciBaris="referensi" />
                    </div>
                    <Pagination from={1} to={antrean.length} total={antrean.length} />
                </Card>

                <Card judul="Kondisi inventaris">
                    <IsiKartu>
                        <ProgressList item={kondisi} />
                    </IsiKartu>
                </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card judul="Aktivitas pengelolaan">
                    <IsiKartu>
                        <Timeline item={aktivitas} />
                    </IsiKartu>
                </Card>
                <Card judul="Jadwal terdekat">
                    <IsiKartu>
                        <Timeline item={jadwal} />
                    </IsiKartu>
                </Card>
            </div>

            <CatatanDataContoh />
        </AuthenticatedLayout>
    );
}
