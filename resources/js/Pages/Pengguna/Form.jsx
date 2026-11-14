import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Card from '@/Components/ui/Card';
import CheckboxGroup from '@/Components/ui/CheckboxGroup';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import SelectInput from '@/Components/ui/SelectInput';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

const PETUNJUK_SANDI = 'Minimal 8 karakter, berisi huruf dan angka.';

export default function Form({ mode, akun, peran, unit, subUnit }) {
    const edit = mode === 'edit';

    const { data, setData, post, put, processing, errors } = useForm({
        peran: akun?.peran ?? [],
        id_peran: akun?.id_peran ?? '',
        id_unit: akun?.id_unit ?? '',
        id_sub_unit: akun?.id_sub_unit ?? '',
        nip: akun?.nip ?? '',
        nama_lengkap: akun?.nama_lengkap ?? '',
        email: akun?.email ?? '',
        username: akun?.username ?? '',
        password: '',
        password_confirmation: '',
    });

    const reset = useForm({
        password: '',
        password_confirmation: '',
    });

    const subUnitTersedia = subUnit.filter((s) => String(s.id_unit) === String(data.id_unit));
    const peranTerpilih = peran.filter((p) => data.peran.includes(p.id_peran));

    const ubahPeran = (daftar) => {
        setData((sebelumnya) => {
            const utamaMasihAda = daftar.includes(Number(sebelumnya.id_peran));

            return {
                ...sebelumnya,
                peran: daftar,
                id_peran: utamaMasihAda ? sebelumnya.id_peran : (daftar[0] ?? ''),
            };
        });
    };

    const ubahUnit = (nilai) => {
        setData((sebelumnya) => ({ ...sebelumnya, id_unit: nilai, id_sub_unit: '' }));
    };

    const kirim = (e) => {
        e.preventDefault();

        if (edit) {
            put(route('pengguna.update', akun.id_pengguna));
        } else {
            post(route('pengguna.store'));
        }
    };

    const kirimReset = (e) => {
        e.preventDefault();

        reset.post(route('pengguna.reset-password', akun.id_pengguna), {
            preserveScroll: true,
            onSuccess: () => reset.reset(),
        });
    };

    const judul = edit ? 'Ubah akun' : 'Tambah akun';

    return (
        <AuthenticatedLayout>
            <Head title={judul} />

            <PageHeader
                breadcrumb={['FTI', 'Pengguna & hak akses', judul]}
                judul={judul}
                deskripsi={edit ? akun.nama_lengkap : 'Akun baru langsung aktif setelah disimpan.'}
            />

            <div className="space-y-6">
                <Card>
                    <form onSubmit={kirim} className="grid max-w-3xl grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                        <Field label="Nama lengkap" htmlFor="nama_lengkap" error={errors.nama_lengkap} className="sm:col-span-2">
                            <TextInput
                                id="nama_lengkap"
                                className="block w-full"
                                value={data.nama_lengkap}
                                onChange={(e) => setData('nama_lengkap', e.target.value)}
                                required
                            />
                        </Field>

                        <Field label="Username" htmlFor="username" error={errors.username}>
                            <TextInput
                                id="username"
                                className="block w-full"
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </Field>

                        <Field label="NIP" htmlFor="nip" error={errors.nip}>
                            <TextInput
                                id="nip"
                                className="block w-full"
                                value={data.nip}
                                onChange={(e) => setData('nip', e.target.value)}
                            />
                        </Field>

                        <Field label="Email" htmlFor="email" error={errors.email} className="sm:col-span-2">
                            <TextInput
                                id="email"
                                type="email"
                                className="block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                        </Field>

                        <Field
                            label="Peran"
                            error={errors.peran}
                            petunjuk="Satu akun boleh memiliki beberapa peran. Menu sidebar mengikuti semua peran yang dipilih."
                            className="sm:col-span-2"
                        >
                            <CheckboxGroup
                                pilihan={peran.map((p) => ({ nilai: p.id_peran, label: p.nama_peran, deskripsi: p.deskripsi }))}
                                terpilih={data.peran}
                                onChange={ubahPeran}
                            />
                        </Field>

                        <Field
                            label="Peran utama"
                            htmlFor="id_peran"
                            error={errors.id_peran}
                            petunjuk="Peran utama menentukan halaman awal setelah masuk dan urutan menu."
                            className="sm:col-span-2"
                        >
                            <SelectInput
                                id="id_peran"
                                className="block w-full"
                                value={data.id_peran}
                                onChange={(e) => setData('id_peran', e.target.value)}
                                disabled={peranTerpilih.length === 0}
                            >
                                {peranTerpilih.length === 0 && <option value="">Pilih peran lebih dulu</option>}
                                {peranTerpilih.map((p) => (
                                    <option key={p.id_peran} value={p.id_peran}>
                                        {p.nama_peran}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>

                        <Field label="Unit" htmlFor="id_unit" error={errors.id_unit}>
                            <SelectInput
                                id="id_unit"
                                className="block w-full"
                                value={data.id_unit}
                                onChange={(e) => ubahUnit(e.target.value)}
                                required
                            >
                                <option value="">Pilih unit</option>
                                {unit.map((u) => (
                                    <option key={u.id_unit} value={u.id_unit}>
                                        {u.nama_unit}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>

                        <Field
                            label="Sub unit"
                            htmlFor="id_sub_unit"
                            error={errors.id_sub_unit}
                            petunjuk={data.id_unit ? undefined : 'Pilih unit terlebih dahulu.'}
                        >
                            <SelectInput
                                id="id_sub_unit"
                                className="block w-full"
                                value={data.id_sub_unit}
                                onChange={(e) => setData('id_sub_unit', e.target.value)}
                                disabled={!data.id_unit}
                                required
                            >
                                <option value="">Pilih sub unit</option>
                                {subUnitTersedia.map((s) => (
                                    <option key={s.id_sub_unit} value={s.id_sub_unit}>
                                        {s.nama_sub_unit}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>

                        {!edit && (
                            <>
                                <Field label="Kata sandi" htmlFor="password" error={errors.password} petunjuk={PETUNJUK_SANDI}>
                                    <TextInput
                                        id="password"
                                        type="password"
                                        className="block w-full"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                </Field>

                                <Field label="Ulangi kata sandi" htmlFor="password_confirmation" error={errors.password_confirmation}>
                                    <TextInput
                                        id="password_confirmation"
                                        type="password"
                                        className="block w-full"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                </Field>
                            </>
                        )}

                        <div className="flex items-center gap-3 sm:col-span-2">
                            <PrimaryButton disabled={processing}>{edit ? 'Simpan perubahan' : 'Buat akun'}</PrimaryButton>
                            <TombolLink href={route('pengguna.index')} varian="sekunder">
                                Batal
                            </TombolLink>
                        </div>
                    </form>
                </Card>

                {edit && (
                    <Card
                        judul="Reset kata sandi"
                        deskripsi="Kata sandi lama langsung tidak berlaku dan sesi pengguna tersebut diakhiri. Sampaikan kata sandi baru kepada pemilik akun."
                    >
                        <form onSubmit={kirimReset} className="grid max-w-3xl grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                            <Field label="Kata sandi baru" htmlFor="reset_password" error={reset.errors.password} petunjuk={PETUNJUK_SANDI}>
                                <TextInput
                                    id="reset_password"
                                    type="password"
                                    className="block w-full"
                                    value={reset.data.password}
                                    onChange={(e) => reset.setData('password', e.target.value)}
                                    autoComplete="new-password"
                                />
                            </Field>

                            <Field label="Ulangi kata sandi baru" htmlFor="reset_password_confirmation" error={reset.errors.password_confirmation}>
                                <TextInput
                                    id="reset_password_confirmation"
                                    type="password"
                                    className="block w-full"
                                    value={reset.data.password_confirmation}
                                    onChange={(e) => reset.setData('password_confirmation', e.target.value)}
                                    autoComplete="new-password"
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <PrimaryButton disabled={reset.processing}>Reset kata sandi</PrimaryButton>
                            </div>
                        </form>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
