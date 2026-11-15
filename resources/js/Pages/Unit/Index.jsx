import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import SelectInput from '@/Components/ui/SelectInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Tabs from '../Pengguna/Tabs';

const JENIS_UNIT_OPSI = [
    { value: 'fakultas', label: 'Fakultas' },
    { value: 'departemen', label: 'Departemen' },
    { value: 'unit_kerja', label: 'Unit Kerja' },
    { value: 'lainnya', label: 'Lainnya' },
];

const JENIS_SUB_UNIT_OPSI = [
    { value: 'tata_usaha', label: 'Tata Usaha' },
    { value: 'laboratorium', label: 'Laboratorium' },
    { value: 'administrasi', label: 'Administrasi' },
    { value: 'ruang_baca', label: 'Ruang Baca / Perpustakaan' },
    { value: 'lainnya', label: 'Lainnya' },
];

export default function Index({ daftarUnit, daftarSubUnit }) {
    const [unitEdit, setUnitEdit] = useState(null);
    const [subUnitEdit, setSubUnitEdit] = useState(null);
    const [filterUnit, setFilterUnit] = useState('');
    const [targetHapus, setTargetHapus] = useState(null);
    const [memprosesHapus, setMemprosesHapus] = useState(false);

    const formUnit = useForm({
        nama_unit: '',
        jenis_unit: 'departemen',
    });

    const formSubUnit = useForm({
        id_unit: daftarUnit[0]?.id_unit ? String(daftarUnit[0].id_unit) : '',
        nama_sub_unit: '',
        jenis_sub_unit: 'laboratorium',
    });

    const mulaiEditUnit = (u) => {
        setUnitEdit(u);
        formUnit.clearErrors();
        formUnit.setData({
            nama_unit: u.nama_unit,
            jenis_unit: u.jenis_unit,
        });
    };

    const batalEditUnit = () => {
        setUnitEdit(null);
        formUnit.reset();
        formUnit.clearErrors();
    };

    const simpanUnit = (e) => {
        e.preventDefault();

        if (unitEdit) {
            formUnit.put(route('unit.update', unitEdit.id_unit), {
                preserveScroll: true,
                onSuccess: () => batalEditUnit(),
            });
            return;
        }

        formUnit.post(route('unit.store'), {
            preserveScroll: true,
            onSuccess: () => formUnit.reset('nama_unit'),
        });
    };

    const mulaiEditSubUnit = (s) => {
        setSubUnitEdit(s);
        formSubUnit.clearErrors();
        formSubUnit.setData({
            id_unit: String(s.id_unit),
            nama_sub_unit: s.nama_sub_unit,
            jenis_sub_unit: s.jenis_sub_unit,
        });
    };

    const batalEditSubUnit = () => {
        setSubUnitEdit(null);
        formSubUnit.setData({
            id_unit: daftarUnit[0]?.id_unit ? String(daftarUnit[0].id_unit) : '',
            nama_sub_unit: '',
            jenis_sub_unit: 'laboratorium',
        });
        formSubUnit.clearErrors();
    };

    const simpanSubUnit = (e) => {
        e.preventDefault();

        if (subUnitEdit) {
            formSubUnit.put(route('sub-unit.update', subUnitEdit.id_sub_unit), {
                preserveScroll: true,
                onSuccess: () => batalEditSubUnit(),
            });
            return;
        }

        formSubUnit.post(route('sub-unit.store'), {
            preserveScroll: true,
            onSuccess: () => formSubUnit.reset('nama_sub_unit'),
        });
    };

    const konfirmasiHapus = () => {
        if (!targetHapus) return;
        setMemprosesHapus(true);

        const url =
            targetHapus.tipe === 'unit'
                ? route('unit.destroy', targetHapus.id)
                : route('sub-unit.destroy', targetHapus.id);

        router.delete(url, {
            preserveScroll: true,
            onFinish: () => {
                setMemprosesHapus(false);
                setTargetHapus(null);
            },
        });
    };

    const subUnitTampil = filterUnit
        ? daftarSubUnit.filter((s) => String(s.id_unit) === String(filterUnit))
        : daftarSubUnit;

    const kolomUnit = [
        {
            judul: 'Nama unit',
            render: (u) => <span className="font-semibold text-ink-900">{u.nama_unit}</span>,
        },
        {
            judul: 'Jenis',
            render: (u) => <Badge nada="info">{u.jenis_unit}</Badge>,
        },
        {
            judul: 'Sub-unit',
            render: (u) => <span>{u.sub_unit_count} sub-unit</span>,
        },
        {
            judul: 'Pengguna & Ruangan',
            render: (u) => (
                <span className="text-ink-600">
                    {u.pengguna_count} akun · {u.ruangan_count} ruangan
                </span>
            ),
        },
        {
            judul: 'Aksi',
            className: 'text-right',
            render: (u) => {
                const dipakai = u.sub_unit_count > 0 || u.pengguna_count > 0 || u.ruangan_count > 0;

                return (
                    <div className="flex justify-end gap-4 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => mulaiEditUnit(u)}
                            className="text-brand-600 hover:underline"
                        >
                            Ubah
                        </button>
                        {!dipakai && (
                            <button
                                type="button"
                                onClick={() =>
                                    setTargetHapus({
                                        tipe: 'unit',
                                        id: u.id_unit,
                                        nama: u.nama_unit,
                                    })
                                }
                                className="text-bahaya-600 hover:underline"
                            >
                                Hapus
                            </button>
                        )}
                    </div>
                );
            },
        },
    ];

    const kolomSubUnit = [
        {
            judul: 'Nama sub-unit',
            render: (s) => <span className="font-semibold text-ink-900">{s.nama_sub_unit}</span>,
        },
        {
            judul: 'Unit induk',
            render: (s) => <span className="text-ink-900">{s.nama_unit}</span>,
        },
        {
            judul: 'Jenis',
            render: (s) => <Badge nada="netral">{s.jenis_sub_unit}</Badge>,
        },
        {
            judul: 'Pengguna & Ruangan',
            render: (s) => (
                <span className="text-ink-600">
                    {s.pengguna_count} akun · {s.ruangan_count} ruangan
                </span>
            ),
        },
        {
            judul: 'Aksi',
            className: 'text-right',
            render: (s) => {
                const dipakai = s.pengguna_count > 0 || s.ruangan_count > 0;

                return (
                    <div className="flex justify-end gap-4 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => mulaiEditSubUnit(s)}
                            className="text-brand-600 hover:underline"
                        >
                            Ubah
                        </button>
                        {!dipakai && (
                            <button
                                type="button"
                                onClick={() =>
                                    setTargetHapus({
                                        tipe: 'sub-unit',
                                        id: s.id_sub_unit,
                                        nama: s.nama_sub_unit,
                                    })
                                }
                                className="text-bahaya-600 hover:underline"
                            >
                                Hapus
                            </button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Unit & sub-unit" />

            <PageHeader
                breadcrumb={['FTI', 'Pengguna & hak akses', 'Unit & sub-unit']}
                judul="Pengguna & hak akses"
                deskripsi="Kelola daftar unit (fakultas/departemen) dan sub-unit (tata usaha/laboratorium) untuk penempatan akun pengguna dan ruangan."
            />

            <Tabs aktif="unit" />

            <div className="space-y-6">
                <Card
                    judul="Daftar unit"
                    deskripsi="Unit organisasi tingkat fakultas atau departemen di FTI Universitas Andalas."
                >
                    <IsiKartu className="border-b border-line">
                        <form onSubmit={simpanUnit} className="flex flex-wrap items-start gap-3">
                            <Field
                                label={unitEdit ? `Ubah unit: ${unitEdit.nama_unit}` : 'Nama unit baru'}
                                htmlFor="nama_unit"
                                error={formUnit.errors.nama_unit}
                                className="min-w-[16rem] flex-1"
                            >
                                <TextInput
                                    id="nama_unit"
                                    value={formUnit.data.nama_unit}
                                    onChange={(e) => formUnit.setData('nama_unit', e.target.value)}
                                    placeholder="Contoh: Departemen Sistem Informasi"
                                    className="block w-full"
                                    required
                                />
                            </Field>

                            <Field
                                label="Jenis unit"
                                htmlFor="jenis_unit"
                                error={formUnit.errors.jenis_unit}
                                className="w-48"
                            >
                                <SelectInput
                                    id="jenis_unit"
                                    value={formUnit.data.jenis_unit}
                                    onChange={(e) => formUnit.setData('jenis_unit', e.target.value)}
                                    className="block w-full"
                                >
                                    {JENIS_UNIT_OPSI.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <div className="mt-6 flex items-center gap-2">
                                <PrimaryButton disabled={formUnit.processing}>
                                    {unitEdit ? 'Simpan perubahan' : '+ Tambah unit'}
                                </PrimaryButton>
                                {unitEdit && (
                                    <SecondaryButton type="button" onClick={batalEditUnit}>
                                        Batal
                                    </SecondaryButton>
                                )}
                            </div>
                        </form>
                    </IsiKartu>

                    <DataTable
                        kolom={kolomUnit}
                        baris={daftarUnit}
                        kunciBaris="id_unit"
                        kosong={<EmptyState judul="Belum ada unit" deskripsi="Tambahkan unit pertama melalui formulir di atas." />}
                    />
                </Card>

                <Card
                    judul="Daftar sub-unit"
                    deskripsi="Sub-unit seperti tata usaha, laboratorium, atau ruang administrasi di bawah masing-masing unit."
                >
                    <IsiKartu className="border-b border-line">
                        <form onSubmit={simpanSubUnit} className="flex flex-wrap items-start gap-3">
                            <Field
                                label="Unit induk"
                                htmlFor="id_unit"
                                error={formSubUnit.errors.id_unit}
                                className="min-w-[14rem]"
                            >
                                <SelectInput
                                    id="id_unit"
                                    value={formSubUnit.data.id_unit}
                                    onChange={(e) => formSubUnit.setData('id_unit', e.target.value)}
                                    className="block w-full"
                                    required
                                >
                                    <option value="">Pilih unit induk</option>
                                    {daftarUnit.map((u) => (
                                        <option key={u.id_unit} value={u.id_unit}>
                                            {u.nama_unit}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <Field
                                label={subUnitEdit ? `Ubah sub-unit: ${subUnitEdit.nama_sub_unit}` : 'Nama sub-unit baru'}
                                htmlFor="nama_sub_unit"
                                error={formSubUnit.errors.nama_sub_unit}
                                className="min-w-[16rem] flex-1"
                            >
                                <TextInput
                                    id="nama_sub_unit"
                                    value={formSubUnit.data.nama_sub_unit}
                                    onChange={(e) => formSubUnit.setData('nama_sub_unit', e.target.value)}
                                    placeholder="Contoh: Lab Sistem Enterprise"
                                    className="block w-full"
                                    required
                                />
                            </Field>

                            <Field
                                label="Jenis sub-unit"
                                htmlFor="jenis_sub_unit"
                                error={formSubUnit.errors.jenis_sub_unit}
                                className="w-52"
                            >
                                <SelectInput
                                    id="jenis_sub_unit"
                                    value={formSubUnit.data.jenis_sub_unit}
                                    onChange={(e) => formSubUnit.setData('jenis_sub_unit', e.target.value)}
                                    className="block w-full"
                                >
                                    {JENIS_SUB_UNIT_OPSI.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>

                            <div className="mt-6 flex items-center gap-2">
                                <PrimaryButton disabled={formSubUnit.processing}>
                                    {subUnitEdit ? 'Simpan perubahan' : '+ Tambah sub-unit'}
                                </PrimaryButton>
                                {subUnitEdit && (
                                    <SecondaryButton type="button" onClick={batalEditSubUnit}>
                                        Batal
                                    </SecondaryButton>
                                )}
                            </div>
                        </form>

                        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                            <label htmlFor="filter_unit" className="text-sm font-medium text-ink-900">
                                Filter menurut unit:
                            </label>
                            <SelectInput
                                id="filter_unit"
                                value={filterUnit}
                                onChange={(e) => setFilterUnit(e.target.value)}
                                className="w-64"
                            >
                                <option value="">Semua unit ({daftarSubUnit.length})</option>
                                {daftarUnit.map((u) => (
                                    <option key={u.id_unit} value={u.id_unit}>
                                        {u.nama_unit} ({u.sub_unit_count})
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                    </IsiKartu>

                    <DataTable
                        kolom={kolomSubUnit}
                        baris={subUnitTampil}
                        kunciBaris="id_sub_unit"
                        kosong={<EmptyState judul="Belum ada sub-unit" deskripsi="Tambahkan sub-unit melalui formulir di atas." />}
                    />
                </Card>
            </div>

            <ConfirmDialog
                show={targetHapus !== null}
                judul={`Hapus ${targetHapus?.tipe === 'unit' ? 'unit' : 'sub-unit'} ini?`}
                pesan={`${targetHapus?.nama} akan dihapus secara permanen dari daftar referensi.`}
                labelKonfirmasi="Hapus"
                nada="bahaya"
                memproses={memprosesHapus}
                onKonfirmasi={konfirmasiHapus}
                onTutup={() => setTargetHapus(null)}
            />
        </AuthenticatedLayout>
    );
}
