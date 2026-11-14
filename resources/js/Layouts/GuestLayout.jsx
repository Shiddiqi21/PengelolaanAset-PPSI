import ApplicationLogo from '@/Components/ApplicationLogo';

/**
 * Layout halaman sebelum login: panel hijau di kiri (dengan foto kampus bila tersedia) dan area form di kanan.
 *
 * Foto latar panel kiri: taruh file di public/images/login-kampus.jpg. Bila belum ada,
 * panel memakai warna hijau polos.
 */
export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <aside
                className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
                style={{
                    backgroundColor: '#0b3625',
                    backgroundImage:
                        "linear-gradient(180deg, rgba(11,54,37,0.88) 0%, rgba(11,54,37,0.82) 55%, rgba(11,54,37,0.94) 100%), url('/images/login-kampus.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                        <ApplicationLogo className="h-7 w-7 text-white" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold">Universitas Andalas</p>
                        <p className="text-sm text-white/75">Fakultas Teknologi Informasi</p>
                    </div>
                </div>

                <div className="max-w-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                        Portal administrasi aset tetap
                    </p>
                    <h1 className="mt-4 text-5xl font-bold leading-[1.1] tracking-tight">
                        Aset terkelola. Akademik berdaya.
                    </h1>
                    <p className="mt-5 text-base text-white/80">
                        Satu ruang kerja untuk inventaris, pengajuan, dan pemeliharaan aset fakultas yang tertib dan
                        transparan.
                    </p>
                    <ul className="mt-8 space-y-3 text-sm">
                        {['Inventaris terpadu', 'Proses terlacak', 'Akses sesuai peran'].map((butir) => (
                            <li key={butir} className="flex items-center gap-3">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
                                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                {butir}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs text-white/65">Kampus Limau Manis, Padang, Sumatera Barat</p>
            </aside>

            <div className="flex min-h-screen flex-col bg-white px-6 py-10 sm:px-12 lg:min-h-0">
                <div className="flex flex-1 flex-col justify-center">
                    <div className="mx-auto w-full max-w-[400px]">{children}</div>
                </div>
                <p className="mt-10 text-center text-xs text-ink-500">© 2026 Fakultas Teknologi Informasi • Universitas Andalas</p>
            </div>
        </div>
    );
}
