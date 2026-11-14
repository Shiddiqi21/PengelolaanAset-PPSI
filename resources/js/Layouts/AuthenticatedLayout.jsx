import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import FlashMessage from '@/Components/ui/FlashMessage';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

/**
 * Layout utama setelah login: sidebar putih (menu per peran dari server) + bilah atas + area isi.
 *
 * Cara pakai di halaman:
 *   <AuthenticatedLayout>
 *       <Head title="Judul" />
 *       <PageHeader breadcrumb={['FTI', 'Judul']} judul="Judul" />
 *       ...isi halaman...
 *   </AuthenticatedLayout>
 *
 * Menu ditentukan di app/Support/MenuPeran.php, bukan di file ini.
 */
export default function AuthenticatedLayout({ children }) {
    const [menuTerbuka, setMenuTerbuka] = useState(false);
    const { auth, tanggal, peranAktif } = usePage().props;

    return (
        <div className="min-h-screen bg-surface">
            {/* Sidebar tetap untuk layar lebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[246px]">
                <Sidebar />
            </div>

            {/* Laci menu untuk layar kecil */}
            <Transition show={menuTerbuka}>
                <Dialog className="relative z-50 lg:hidden" onClose={setMenuTerbuka}>
                    <TransitionChild
                        enter="transition-opacity duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-ink-900/50" aria-hidden="true" />
                    </TransitionChild>
                    <TransitionChild
                        enter="transition duration-200"
                        enterFrom="-translate-x-full"
                        enterTo="translate-x-0"
                        leave="transition duration-150"
                        leaveFrom="translate-x-0"
                        leaveTo="-translate-x-full"
                    >
                        <DialogPanel className="fixed inset-y-0 left-0 flex w-[270px] max-w-[85vw]">
                            <Sidebar onPilih={() => setMenuTerbuka(false)} />
                        </DialogPanel>
                    </TransitionChild>
                </Dialog>
            </Transition>

            <div className="lg:pl-[246px]">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-white px-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMenuTerbuka(true)}
                            className="-ml-2 rounded-lg p-2 text-ink-600 hover:bg-surface lg:hidden"
                        >
                            <span className="sr-only">Buka menu</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <p className="text-sm text-ink-600">
                            <span>Portal aset</span>
                            {peranAktif && (
                                <>
                                    <span className="mx-2 text-ink-400">/</span>
                                    <span>{peranAktif}</span>
                                </>
                            )}
                        </p>
                    </div>

                    <Dropdown>
                        <Dropdown.Trigger>
                            <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-right hover:bg-surface">
                                <span className="block">
                                    <span className="block text-sm font-semibold text-ink-900">{auth.user.nama_lengkap}</span>
                                    <span className="block text-xs text-ink-500">
                                        {auth.user.peran_label} • {tanggal}
                                    </span>
                                </span>
                                <svg className="h-4 w-4 text-ink-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                    <path d="m5.5 8 4.5 4.5L14.5 8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content>
                            <Dropdown.Link href={route('profile.edit')}>Profil saya</Dropdown.Link>
                            <Dropdown.Link href={route('logout')} method="post" as="button">
                                Keluar dari akun
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </header>

                <main className="px-4 py-8 sm:px-8">
                    <div className="mx-auto max-w-[1194px]">
                        <FlashMessage />
                        {children}
                        <footer className="mt-10 text-xs text-ink-500">© 2026 • FTI Universitas Andalas</footer>
                    </div>
                </main>
            </div>
        </div>
    );
}

function Sidebar({ onPilih }) {
    const { menu = [] } = usePage().props;

    return (
        <div className="flex w-full flex-col border-r border-line bg-white">
            <div className="px-[22px] pb-1 pt-7">
                <div className="flex items-center gap-2.5">
                    <ApplicationLogo className="h-8 w-8 shrink-0 text-brand-600" />
                    <div>
                        <p className="text-xl font-bold leading-none tracking-tight text-brand-600">SIM ASET FTI</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-500">Universitas Andalas</p>
                    </div>
                </div>
            </div>

            <div className="px-[22px] pt-6">
                <p className="text-[11px] uppercase tracking-wide text-ink-500">Unit kerja</p>
                <p className="mt-1 text-sm font-semibold text-ink-900">Fakultas Teknologi Informasi</p>
                <p className="mt-0.5 text-xs text-ink-500">Kampus Limau Manis, Padang</p>
            </div>

            <nav aria-label="Menu utama" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
                {menu.map((kelompok) => (
                    <div key={kelompok.peran}>
                        <p className="px-[10px] pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-600">
                            {kelompok.peran.replace('/', ' / ')}
                        </p>
                        <ul className="space-y-0.5">
                            {kelompok.item.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onPilih}
                                        aria-current={item.aktif ? 'page' : undefined}
                                        className={`block rounded-lg px-[10px] py-2 text-sm transition ${
                                            item.aktif
                                                ? 'bg-brand-50 font-semibold text-brand-600'
                                                : 'text-ink-600 hover:bg-surface hover:text-ink-900'
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="space-y-2 border-t border-line px-[22px] py-5 text-sm">
                <Link href={route('panduan')} onClick={onPilih} className="block text-ink-600 hover:text-ink-900">
                    Panduan penggunaan
                </Link>
                <Link href={route('logout')} method="post" as="button" className="block text-ink-600 hover:text-ink-900">
                    Keluar dari akun
                </Link>
                <p className="pt-1 text-[11px] text-ink-500">SIM Aset FTI • Versi 1.0</p>
            </div>
        </div>
    );
}
