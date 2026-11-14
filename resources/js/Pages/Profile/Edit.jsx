import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ akun }) {
    const rincian = [
        ['Username', akun.username],
        ['NIP', akun.nip],
        ['Peran', akun.peran],
        ['Unit', akun.unit],
        ['Sub unit', akun.sub_unit],
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Profil saya" />

            <PageHeader breadcrumb={['FTI', 'Profil saya']} judul="Profil saya" />

            <div className="space-y-6">
                <Card judul="Data akun" deskripsi="Username, peran, dan unit diatur oleh operator aset fakultas.">
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2">
                        {rincian.map(([label, nilai]) => (
                            <div key={label}>
                                <dt className="text-sm text-ink-600">{label}</dt>
                                <dd className="mt-0.5 text-sm font-medium text-ink-900">{nilai || '-'}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>

                <Card>
                    <UpdateProfileInformationForm className="max-w-xl p-5" />
                </Card>

                <Card>
                    <UpdatePasswordForm className="max-w-xl p-5" />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
