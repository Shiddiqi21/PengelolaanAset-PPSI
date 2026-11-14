import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Tabs from '../Pengguna/Tabs';

export default function Index({ peran }) {
    const kolom = [
        {
            judul: 'Peran',
            className: 'min-w-[14rem]',
            render: (b) => (
                <div>
                    <p className="font-medium">{b.nama_peran}</p>
                    {b.deskripsi && <p className="mt-0.5 text-ink-600">{b.deskripsi}</p>}
                </div>
            ),
        },
        {
            judul: 'Akun',
            className: 'whitespace-nowrap',
            render: (b) => (
                <span>
                    {b.akun_aktif} aktif <span className="text-ink-500">dari {b.akun_total}</span>
                </span>
            ),
        },
        {
            judul: 'Menu yang dapat dibuka',
            render: (b) => (
                <div className="flex flex-wrap gap-1.5">
                    {b.menu.map((m) => (
                        <Badge key={m} nada="info">
                            {m}
                        </Badge>
                    ))}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Hak akses" />

            <PageHeader
                breadcrumb={['FTI', 'Pengguna & hak akses']}
                judul="Pengguna & hak akses"
                deskripsi="Daftar peran, jumlah akun, dan menu yang dapat dibuka tiap peran. Perubahan hak akses dilakukan oleh tim pengembang."
            />

            <Tabs aktif="hak-akses" />

            <Card>
                <div className="pt-3">
                    <DataTable kolom={kolom} baris={peran} kunciBaris="id_peran" />
                </div>
            </Card>
        </AuthenticatedLayout>
    );
}
