import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SelectInput from '@/Components/ui/SelectInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import Tabs from '../Pengguna/Tabs';
import { useState } from 'react';

const AKSI = {
    login: ['Masuk', 'netral'],
    logout: ['Keluar', 'netral'],
    login_gagal: ['Gagal masuk', 'bahaya'],
    tambah: ['Tambah', 'sukses'],
    ubah: ['Ubah', 'info'],
    hapus: ['Hapus', 'bahaya'],
    reset_password: ['Reset sandi', 'peringatan'],
    ubah_password: ['Ubah sandi', 'peringatan'],
};

const labelAksi = (aksi) => AKSI[aksi]?.[0] ?? aksi;

const formatWaktu = (waktu) => {
    if (!waktu) {
        return '-';
    }

    const tanggal = new Date(waktu.replace(' ', 'T'));

    return Number.isNaN(tanggal.getTime())
        ? waktu
        : tanggal.toLocaleString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });
};

function Rincian({ detail }) {
    if (!detail) {
        return <span className="text-ink-400">-</span>;
    }

    let objek = null;

    try {
        const hasil = JSON.parse(detail);
        objek = hasil && typeof hasil === 'object' && !Array.isArray(hasil) ? hasil : null;
    } catch {
        objek = null;
    }

    if (!objek) {
        return <span className="break-words text-ink-900">{detail}</span>;
    }

    return (
        <dl className="space-y-0.5">
            {Object.entries(objek).map(([kunci, nilai]) => {
                const teks = typeof nilai === 'object' && nilai !== null ? JSON.stringify(nilai) : String(nilai ?? '-');

                return (
                    <div key={kunci} className="flex gap-2">
                        <dt className="shrink-0 text-ink-600">{kunci}:</dt>
                        <dd className="break-words text-ink-900">{teks.length > 120 ? `${teks.slice(0, 120)}...` : teks}</dd>
                    </div>
                );
            })}
        </dl>
    );
}

export default function Index({ log, filter, opsiAksi, opsiTabel }) {
    const [nilai, setNilai] = useState(filter);
    const ubah = (kunci, isi) => setNilai((sebelumnya) => ({ ...sebelumnya, [kunci]: isi }));
    const adaFilter = Object.values(filter).some((v) => v !== '');

    const terapkan = (params) => {
        const bersih = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));

        router.get(route('log-aktivitas.index'), bersih, { preserveState: true, replace: true });
    };

    const cari = (e) => {
        e.preventDefault();
        terapkan(nilai);
    };

    const aturUlang = () => {
        const kosong = { pengguna: '', aksi: '', tabel: '', dari: '', sampai: '' };
        setNilai(kosong);
        terapkan(kosong);
    };

    const kolom = [
        { judul: 'Waktu', className: 'whitespace-nowrap', render: (b) => formatWaktu(b.waktu) },
        { judul: 'Pengguna', render: (b) => b.pengguna },
        { judul: 'Aksi', render: (b) => <Badge nada={AKSI[b.aksi]?.[1] ?? 'netral'}>{labelAksi(b.aksi)}</Badge> },
        {
            judul: 'Data',
            render: (b) => (
                <span className="text-ink-900">
                    {b.nama_tabel}
                    {b.id_data ? ` #${b.id_data}` : ''}
                </span>
            ),
        },
        { judul: 'Rincian', className: 'max-w-md', render: (b) => <Rincian detail={b.detail} /> },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Log aktivitas" />

            <PageHeader
                breadcrumb={['FTI', 'Pengguna & hak akses']}
                judul="Pengguna & hak akses"
                deskripsi="Riwayat masuk, keluar, dan perubahan data oleh pengguna sistem."
            />

            <Tabs aktif="log" />

            <Card>
                <form onSubmit={cari} className="flex flex-wrap items-end gap-3 px-6 pb-4 pt-6">
                    <div className="min-w-[12rem] flex-1">
                        <label htmlFor="pengguna" className="mb-1 block text-sm font-medium text-ink-900">
                            Pengguna
                        </label>
                        <TextInput
                            id="pengguna"
                            type="search"
                            value={nilai.pengguna}
                            onChange={(e) => ubah('pengguna', e.target.value)}
                            placeholder="Nama atau username"
                            className="block w-full"
                        />
                    </div>
                    <div>
                        <label htmlFor="aksi" className="mb-1 block text-sm font-medium text-ink-900">
                            Aksi
                        </label>
                        <SelectInput id="aksi" value={nilai.aksi} onChange={(e) => ubah('aksi', e.target.value)} className="block">
                            <option value="">Semua aksi</option>
                            {opsiAksi.map((a) => (
                                <option key={a} value={a}>
                                    {labelAksi(a)}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <label htmlFor="tabel" className="mb-1 block text-sm font-medium text-ink-900">
                            Data
                        </label>
                        <SelectInput id="tabel" value={nilai.tabel} onChange={(e) => ubah('tabel', e.target.value)} className="block">
                            <option value="">Semua data</option>
                            {opsiTabel.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div>
                        <label htmlFor="dari" className="mb-1 block text-sm font-medium text-ink-900">
                            Dari tanggal
                        </label>
                        <TextInput id="dari" type="date" value={nilai.dari} onChange={(e) => ubah('dari', e.target.value)} className="block" />
                    </div>
                    <div>
                        <label htmlFor="sampai" className="mb-1 block text-sm font-medium text-ink-900">
                            Sampai tanggal
                        </label>
                        <TextInput id="sampai" type="date" value={nilai.sampai} onChange={(e) => ubah('sampai', e.target.value)} className="block" />
                    </div>
                    <PrimaryButton>Terapkan</PrimaryButton>
                    {adaFilter && <SecondaryButton onClick={aturUlang}>Atur ulang</SecondaryButton>}
                </form>

                <DataTable
                    kolom={kolom}
                    baris={log.data}
                    kunciBaris="id_log"
                    kosong={
                        <EmptyState
                            judul="Tidak ada aktivitas yang cocok"
                            deskripsi={adaFilter ? 'Ubah filter, lalu coba lagi.' : 'Aktivitas akan tercatat otomatis saat pengguna masuk atau mengubah data.'}
                        />
                    }
                />

                <Pagination links={log.links} from={log.from} to={log.to} total={log.total} />
            </Card>
        </AuthenticatedLayout>
    );
}
