import ApplicationLogo from '@/Components/ApplicationLogo';
import Checkbox from '@/Components/Checkbox';
import PrimaryButton from '@/Components/PrimaryButton';
import Alert from '@/Components/ui/Alert';
import FloatingInput from '@/Components/ui/FloatingInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: false,
    });
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Masuk" />

            <div className="flex items-center gap-3">
                <ApplicationLogo className="h-10 w-10 text-brand-600" />
                <span className="text-2xl font-bold tracking-tight text-ink-900">SIM Aset FTI</span>
            </div>

            <h2 className="mt-10 text-3xl font-bold tracking-tight text-ink-900">Selamat datang kembali</h2>
            <p className="mt-2 text-[15px] text-ink-600">
                Masuk dengan akun institusi untuk mengakses layanan pengelolaan aset.
            </p>

            {status && <Alert nada="sukses" className="mt-5">{status}</Alert>}

            <form onSubmit={submit} className="mt-8 space-y-4">
                <FloatingInput
                    id="username"
                    name="username"
                    label="Nama pengguna"
                    wajib
                    value={data.username}
                    error={errors.username}
                    autoComplete="username"
                    autoFocus
                    onChange={(e) => setData('username', e.target.value)}
                />

                <FloatingInput
                    id="password"
                    name="password"
                    type="password"
                    label="Kata sandi"
                    wajib
                    value={data.password}
                    error={errors.password}
                    autoComplete="current-password"
                    onChange={(e) => setData('password', e.target.value)}
                />

                <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <span className="ms-2 text-sm text-ink-600">Ingat perangkat ini</span>
                    </label>

                    <button
                        type="button"
                        onClick={() => setBantuanTerbuka((terbuka) => !terbuka)}
                        aria-expanded={bantuanTerbuka}
                        aria-controls="bantuan-sandi"
                        className="text-sm font-medium text-brand-600 hover:underline"
                    >
                        Lupa kata sandi?
                    </button>
                </div>

                {bantuanTerbuka && (
                    <Alert nada="peringatan" className="" >
                        <span id="bantuan-sandi">
                            Hubungi administrator aset fakultas melalui kantor FTI untuk mereset kata sandi Anda.
                        </span>
                    </Alert>
                )}

                <PrimaryButton className="w-full py-3.5 text-[15px]" disabled={processing}>
                    Masuk ke sistem
                </PrimaryButton>
            </form>

            <Alert nada="info" className="mt-8 leading-relaxed">
                Menu ditampilkan sesuai hak akses akun. Akun dengan beberapa peran dapat mengakses kelompok menu setiap
                peran yang diberikan.
            </Alert>

            <p className="mt-6 text-sm text-ink-600">
                Butuh bantuan akses? Hubungi administrator aset fakultas melalui kantor FTI.
            </p>
        </GuestLayout>
    );
}
