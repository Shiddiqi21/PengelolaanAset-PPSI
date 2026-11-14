import Alert from '@/Components/ui/Alert';
import Card, { IsiKartu } from '@/Components/ui/Card';
import CatatanDataContoh from '@/Components/ui/CatatanDataContoh';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import QuickActions from '@/Components/ui/QuickActions';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import Timeline from '@/Components/ui/Timeline';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Pemohon({ judul, deskripsi, banner, kpi, pengajuan, perkembangan, aksiCepat }) {
    const kolom = [
        { kunci: 'nomor', judul: 'Nomor pengajuan', className: 'font-semibold' },
        { kunci: 'jenis', judul: 'Jenis / perihal' },
        { kunci: 'tanggal', judul: 'Tanggal' },
        { judul: 'Status', render: (b) => <StatusText nada={b.nada}>{b.status}</StatusText> },
        { judul: 'Aksi', render: (b) => <TautanAksi href={b.href}>{b.aksi}</TautanAksi> },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard pemohon" />

            <PageHeader breadcrumb={['FTI', 'Dashboard']} judul={judul} deskripsi={deskripsi}>
                <TombolLink href={route('pemohon.pengadaan')}>+ Buat pengajuan</TombolLink>
            </PageHeader>

            {banner && <Alert nada={banner.nada} className="mb-6">{banner.teks}</Alert>}

            <StatGrid>
                {kpi.map((k) => (
                    <StatCard key={k.label} {...k} />
                ))}
            </StatGrid>

            <Card
                judul="Pengajuan terbaru saya"
                tautan={{ label: 'Lihat semua', href: route('pemohon.pengajuan') }}
                className="mt-6"
            >
                <div className="pt-3">
                    <DataTable kolom={kolom} baris={pengajuan.baris} kunciBaris="nomor" />
                </div>
                <Pagination from={1} to={pengajuan.baris.length} total={pengajuan.total} />
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card judul="Perkembangan terbaru">
                    <IsiKartu>
                        <Timeline item={perkembangan} />
                    </IsiKartu>
                </Card>
                <Card judul="Ajukan kebutuhan unit" deskripsi="Pilih layanan sesuai kebutuhan dan kewenangan Anda" className="self-start">
                    <IsiKartu>
                        <QuickActions item={aksiCepat} />
                    </IsiKartu>
                </Card>
            </div>

            <CatatanDataContoh />
        </AuthenticatedLayout>
    );
}
