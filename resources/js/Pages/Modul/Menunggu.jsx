import Card from '@/Components/ui/Card';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

// Halaman sementara untuk route group per peran. Ganti dengan halaman modul asli.
export default function Menunggu({ judul }) {
    return (
        <AuthenticatedLayout>
            <Head title={judul} />

            <PageHeader breadcrumb={['FTI', judul]} judul={judul} />

            <Card>
                <EmptyState
                    judul="Modul belum tersedia"
                    deskripsi={`Halaman ${judul} sedang dikerjakan dan akan muncul di sini.`}
                />
            </Card>
        </AuthenticatedLayout>
    );
}
