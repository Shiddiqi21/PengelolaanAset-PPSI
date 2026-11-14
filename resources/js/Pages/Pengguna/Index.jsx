import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Tabs from './Tabs';

export default function Index({ pengguna, filter, opsiPeran }) {
    const { auth } = usePage().props;
    const [q, setQ] = useState(filter.q);
    const [peran, setPeran] = useState(filter.peran);
    const [status, setStatus] = useState(filter.status);
    const [target, setTarget] = useState(null);
    const [memproses, setMemproses] = useState(false);

    const adaFilter = q !== '' || peran !== '' || status !== '';

    const terapkan = (nilai) => {
        const params = Object.fromEntries(Object.entries(nilai).filter(([, v]) => v !== ''));

        router.get(route('pengguna.index'), params, { preserveState: true, replace: true });
    };

    const cari = (e) => {
        e.preventDefault();
        terapkan({ q, peran, status });
    };

    const aturUlang = () => {
        setQ('');
        setPeran('');
        setStatus('');
        terapkan({});
    };

    const ubahStatus = () => {
        setMemproses(true);

        router.patch(
            route('pengguna.status', target.id_pengguna),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setMemproses(false);
                    setTarget(null);
                },
            }
        );
    };

    const kolom = [
        {
            judul: 'Nama',
            render: (b) => (
                <div>
                    <p className="font-semibold">{b.nama_lengkap}</p>
                    <p className="text-ink-600">{b.username}</p>
                </div>
            ),
        },
        {
            judul: 'Peran',
            render: (b) => (
                <div className="flex flex-wrap gap-1.5">
                    {b.peran.map((nama, i) => (
                        <Badge key={nama} nada={i === 0 ? 'sukses' : 'netral'}>
                            {nama}
                        </Badge>
                    ))}
                </div>
            ),
        },
        {
            judul: 'Unit',
            render: (b) => (
                <div>
                    <p>{b.unit}</p>
                    <p className="text-ink-600">{b.sub_unit}</p>
                </div>
            ),
        },
        {
            judul: 'Status',
            render: (b) => <Badge nada={b.is_aktif ? 'sukses' : 'netral'}>{b.is_aktif ? 'Aktif' : 'Nonaktif'}</Badge>,
        },
        {
            judul: 'Aksi',
            className: 'text-right',
            render: (b) => (
                <div className="flex justify-end gap-4 text-xs font-semibold">
                    <Link href={route('pengguna.edit', b.id_pengguna)} className="text-brand-600 hover:underline">
                        Ubah →
                    </Link>
                    {b.id_pengguna !== auth.user.id_pengguna && (
                        <button
                            type="button"
                            onClick={() => setTarget(b)}
                            className={b.is_aktif ? 'text-bahaya-600 hover:underline' : 'text-brand-600 hover:underline'}
                        >
                            {b.is_aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Pengguna & hak akses" />

            <PageHeader
                breadcrumb={['FTI', 'Pengguna & hak akses']}
                judul="Pengguna & hak akses"
                deskripsi="Kelola akun, peran, dan status akses pengguna sistem."
            >
                <TombolLink href={route('pengguna.create')}>+ Tambah akun</TombolLink>
            </PageHeader>

            <Tabs aktif="akun" />

            <Card>
                <form onSubmit={cari} className="flex flex-wrap items-end gap-3 px-6 pb-4 pt-6">
                    <div className="min-w-[14rem] flex-1">
                        <label htmlFor="q" className="mb-1 block text-sm font-medium text-ink-900">
                            Cari
                        </label>
                        <SearchInput
                            id="q"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Nama, username, email, atau NIP"
                        />
                    </div>
                    <div>
                        <label htmlFor="peran" className="mb-1 block text-sm font-medium text-ink-900">
                            Peran
                        </label>
                        <SelectInput
                            id="peran"
                            value={peran}
                            onChange={(e) => {
                                setPeran(e.target.value);
                                terapkan({ q, peran: e.target.value, status });
                            }}
                            className="block"
                        >
                            <option value="">Semua peran</option>
                            {opsiPeran.map((p) => (
                                <option key={p.id_peran} value={p.id_peran}>
                                    {p.nama_peran}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <label htmlFor="status" className="mb-1 block text-sm font-medium text-ink-900">
                            Status
                        </label>
                        <SelectInput
                            id="status"
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                terapkan({ q, peran, status: e.target.value });
                            }}
                            className="block"
                        >
                            <option value="">Semua status</option>
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
                        </SelectInput>
                    </div>
                    <PrimaryButton>Cari</PrimaryButton>
                    {adaFilter && <SecondaryButton onClick={aturUlang}>Atur ulang</SecondaryButton>}
                </form>

                <DataTable
                    kolom={kolom}
                    baris={pengguna.data}
                    kunciBaris="id_pengguna"
                    kosong={
                        <EmptyState
                            judul="Tidak ada akun yang cocok"
                            deskripsi={
                                adaFilter
                                    ? 'Ubah kata kunci atau filter, lalu coba lagi.'
                                    : 'Tambahkan akun pertama dengan tombol Tambah akun.'
                            }
                        />
                    }
                />

                <Pagination links={pengguna.links} from={pengguna.from} to={pengguna.to} total={pengguna.total} />
            </Card>

            <ConfirmDialog
                show={target !== null}
                judul={target?.is_aktif ? 'Nonaktifkan akun ini?' : 'Aktifkan akun ini?'}
                pesan={
                    target?.is_aktif
                        ? `${target?.nama_lengkap} tidak akan bisa masuk ke sistem sampai akunnya diaktifkan kembali.`
                        : `${target?.nama_lengkap} akan bisa masuk ke sistem lagi.`
                }
                labelKonfirmasi={target?.is_aktif ? 'Nonaktifkan' : 'Aktifkan'}
                nada={target?.is_aktif ? 'bahaya' : 'normal'}
                memproses={memproses}
                onKonfirmasi={ubahStatus}
                onTutup={() => setTarget(null)}
            />
        </AuthenticatedLayout>
    );
}
