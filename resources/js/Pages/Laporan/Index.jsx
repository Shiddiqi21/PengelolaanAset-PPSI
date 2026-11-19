import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Card from '@/Components/ui/Card';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function Index({
    peranKonteks = 'operator',
    kpi = {},
    periode = 'Oktober 2026',
    sumberPembanding = 'Inventaris fisik & dokumen perolehan',
    daftarSelisih = [],
    daftarSesuai = [],
    rekapPerKategori = [],
    totalRekap = {},
    penandatangan = {},
}) {
    // Tab Aktif: 'selisih' | 'sesuai' | 'rekap'
    const [tabAktif, setTabAktif] = useState('selisih');

    // Sinkronkan state daftar selisih setiap kali props dari server berubah
    const [dataSelisih, setDataSelisih] = useState(() =>
        Array.isArray(daftarSelisih) ? daftarSelisih : []
    );

    useEffect(() => {
        setDataSelisih(Array.isArray(daftarSelisih) ? daftarSelisih : []);
        setHalamanSelisih(1);
    }, [daftarSelisih]);

    // Pagination untuk Tab Selisih (4 baris per halaman)
    const [halamanSelisih, setHalamanSelisih] = useState(1);
    const perHalaman = 4;
    const totalHalamanSelisih = Math.max(1, Math.ceil(dataSelisih.length / perHalaman));

    const barisSelisihTampil = useMemo(() => {
        const mulai = (halamanSelisih - 1) * perHalaman;
        return dataSelisih.slice(mulai, mulai + perHalaman);
    }, [dataSelisih, halamanSelisih]);

    // Periode & Sumber Pembanding Filter
    const [periodePilihan, setPeriodePilihan] = useState(periode);
    const [sumberPilihan, setSumberPilihan] = useState(sumberPembanding);

    // State Custom Dropdowns
    const [bukaDropdownPeriode, setBukaDropdownPeriode] = useState(false);
    const [bukaDropdownSumber, setBukaDropdownSumber] = useState(false);
    const dropdownPeriodeRef = useRef(null);
    const dropdownSumberRef = useRef(null);

    // Modal Riwayat Periode & Detail Selisih
    const [tampilModalRiwayat, setTampilModalRiwayat] = useState(false);
    const [itemSelisihTerpilih, setItemSelisihTerpilih] = useState(null);

    // Notifikasi Pencocokan Sukses
    const [pesanSukses, setPesanSukses] = useState('');

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownPeriodeRef.current && !dropdownPeriodeRef.current.contains(event.target)) {
                setBukaDropdownPeriode(false);
            }
            if (dropdownSumberRef.current && !dropdownSumberRef.current.contains(event.target)) {
                setBukaDropdownSumber(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleJalankanPencocokan = () => {
        router.get(
            window.location.pathname,
            { periode: periodePilihan, sumber: sumberPilihan },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setPesanSukses(
                        `Pencocokan otomatis terhadap database untuk periode ${periodePilihan} (${sumberPilihan}) selesai dijalankan.`
                    );
                    setTimeout(() => setPesanSukses(''), 4000);
                },
            }
        );
    };

    const handleUnduh = () => {
        window.print();
    };

    const handleSetujuiPenyesuaian = (item) => {
        setDataSelisih((prev) =>
            prev.map((row) =>
                row.id === item.id
                    ? { ...row, status: 'Diselesaikan', status_tipe: 'sukses' }
                    : row
            )
        );
        setItemSelisihTerpilih(null);
        setPesanSukses(`Catatan selisih untuk aset ${item.kode_aset} (${item.elemen_data}) ditandai selesai.`);
        setTimeout(() => setPesanSukses(''), 4000);
    };

    const formatRupiah = (angka) => {
        return 'Rp' + Number(angka || 0).toLocaleString('id-ID');
    };

    const opsiDaftarPeriode = [
        'Oktober 2026',
        'September 2026',
        'Agustus 2026',
        'Semester Ganjil 2026/2027',
    ];

    const opsiDaftarSumber = [
        'Inventaris fisik & dokumen perolehan',
        'Hasil sensus barang milik negara',
        'Catatan BAST mutasi & penerimaan',
    ];

    const indeksMulai = dataSelisih.length === 0 ? 0 : (halamanSelisih - 1) * perHalaman + 1;
    const indeksAkhir = Math.min(halamanSelisih * perHalaman, dataSelisih.length);
    const jumlahBelumSelesai = dataSelisih.filter((d) => d.status !== 'Diselesaikan').length;

    const judulHalaman = peranKonteks === 'operator' ? 'Laporan dan rekonsiliasi' : 'Laporan aset';
    const breadcrumbHalaman = peranKonteks === 'operator' ? 'FTI / Laporan & rekonsiliasi' : 'FTI / Laporan aset';

    return (
        <AuthenticatedLayout>
            <Head title={judulHalaman} />

            {/* CSS Print Khusus Lembar Laporan Resmi A4 */}
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #lembar-laporan-resmi,
                    #lembar-laporan-resmi * {
                        visibility: visible !important;
                    }
                    #lembar-laporan-resmi {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                }
            `}</style>

            <div className="space-y-6">
                {/* Header Sesuai Desain Figma */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-xs font-medium text-ink-500">{breadcrumbHalaman}</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
                            {judulHalaman}
                        </h1>
                        <p className="mt-1 text-sm text-ink-600">
                            Cocokkan inventaris fakultas dengan dokumen sumber dan hasil pemeriksaan fisik.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {peranKonteks === 'pimpinan' && (
                            <Link
                                href={route('pimpinan.laporan.pratinjau')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-800 shadow-xs hover:bg-surface transition"
                            >
                                Pratinjau dokumen
                            </Link>
                        )}
                        <PrimaryButton
                            onClick={handleUnduh}
                            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 shadow-sm px-4 py-2.5 text-sm whitespace-nowrap"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Unduh hasil rekonsiliasi
                        </PrimaryButton>
                    </div>
                </div>

                {/* Notifikasi Flash Sukses */}
                {pesanSukses && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 transition">
                        ✓ {pesanSukses}
                    </div>
                )}

                {/* 4 Stat Cards Ringkasan Rekonsiliasi (100% Otomatis dari Database) */}
                <StatGrid>
                    <StatCard
                        label="Aset pada master"
                        nilai={kpi.totalAset ?? '0'}
                        keterangan={`Per ${kpi.tanggalPosisi || '-'}`}
                        nada="netral"
                    />
                    <StatCard
                        label="Sudah dicocokkan"
                        nilai={kpi.sudahDicocokkan ?? '0'}
                        keterangan={`${kpi.persentaseCocok ?? '100%'} dari master inventaris`}
                        nada="sukses"
                    />
                    <StatCard
                        label="Selisih data"
                        nilai={String(jumlahBelumSelesai)}
                        keterangan={jumlahBelumSelesai > 0 ? 'Perlu tindak lanjut operator' : 'Seluruh data telah sesuai'}
                        nada={jumlahBelumSelesai > 0 ? 'peringatan' : 'sukses'}
                    />
                    <StatCard
                        label="Nilai perolehan"
                        nilai={kpi.nilaiPerolehan ?? 'Rp0'}
                        keterangan={`Nilai buku ${kpi.nilaiBuku ?? 'Rp0'}`}
                        nada="netral"
                    />
                </StatGrid>

                {/* Card 1: Periode Rekonsiliasi */}
                <Card className="p-6">
                    <h2 className="text-base font-bold text-ink-900">Periode rekonsiliasi</h2>

                    {/* Dua Kotak Filter Berdampingan (Custom Dropdown Elegan) */}
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Box 1: Dropdown Periode Kustom */}
                        <div ref={dropdownPeriodeRef} className="relative">
                            <div
                                onClick={() => {
                                    setBukaDropdownPeriode(!bukaDropdownPeriode);
                                    setBukaDropdownSumber(false);
                                }}
                                className={`cursor-pointer rounded-xl border bg-white p-3.5 transition-all ${
                                    bukaDropdownPeriode
                                        ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                                        : 'border-line hover:border-brand-500'
                                }`}
                            >
                                <p className="text-xs font-medium text-ink-500 mb-1">Periode</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-ink-900 truncate">
                                        {periodePilihan}
                                    </span>
                                    <svg
                                        className={`ml-2 h-4 w-4 text-ink-500 transition-transform duration-200 flex-shrink-0 ${
                                            bukaDropdownPeriode ? 'rotate-180 text-brand-700' : ''
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {bukaDropdownPeriode && (
                                <div className="absolute left-0 top-full z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-xl transition-all">
                                    {opsiDaftarPeriode.map((p) => {
                                        const aktif = p === periodePilihan;
                                        return (
                                            <div
                                                key={p}
                                                onClick={() => {
                                                    setPeriodePilihan(p);
                                                    setBukaDropdownPeriode(false);
                                                }}
                                                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs transition ${
                                                    aktif
                                                        ? 'bg-brand-50/80 font-bold text-brand-900'
                                                        : 'text-ink-800 hover:bg-surface'
                                                }`}
                                            >
                                                <span>{p}</span>
                                                {aktif && (
                                                    <svg className="h-4 w-4 text-brand-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Box 2: Dropdown Sumber Pembanding Kustom */}
                        <div ref={dropdownSumberRef} className="relative">
                            <div
                                onClick={() => {
                                    setBukaDropdownSumber(!bukaDropdownSumber);
                                    setBukaDropdownPeriode(false);
                                }}
                                className={`cursor-pointer rounded-xl border bg-white p-3.5 transition-all ${
                                    bukaDropdownSumber
                                        ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                                        : 'border-line hover:border-brand-500'
                                }`}
                            >
                                <p className="text-xs font-medium text-ink-500 mb-1">Sumber pembanding</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-ink-900 truncate">
                                        {sumberPilihan}
                                    </span>
                                    <svg
                                        className={`ml-2 h-4 w-4 text-ink-500 transition-transform duration-200 flex-shrink-0 ${
                                            bukaDropdownSumber ? 'rotate-180 text-brand-700' : ''
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {bukaDropdownSumber && (
                                <div className="absolute left-0 top-full z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-xl transition-all">
                                    {opsiDaftarSumber.map((s) => {
                                        const aktif = s === sumberPilihan;
                                        return (
                                            <div
                                                key={s}
                                                onClick={() => {
                                                    setSumberPilihan(s);
                                                    setBukaDropdownSumber(false);
                                                }}
                                                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs transition ${
                                                    aktif
                                                        ? 'bg-brand-50/80 font-bold text-brand-900'
                                                        : 'text-ink-800 hover:bg-surface'
                                                }`}
                                            >
                                                <span className="truncate pr-2">{s}</span>
                                                {aktif && (
                                                    <svg className="h-4 w-4 text-brand-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tombol Aksi di Bawah Filter */}
                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-line/60 pt-4">
                        <button
                            type="button"
                            onClick={() => setTampilModalRiwayat(true)}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-white px-4 text-xs font-semibold text-ink-700 shadow-xs hover:bg-surface hover:text-ink-900 transition whitespace-nowrap"
                        >
                            Riwayat periode
                        </button>
                        <button
                            type="button"
                            onClick={handleJalankanPencocokan}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 transition whitespace-nowrap"
                        >
                            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Jalankan pencocokan</span>
                        </button>
                    </div>
                </Card>

                {/* Card 2: Hasil Pencocokan Data */}
                <Card className="p-6">
                    <h2 className="text-base font-bold text-ink-900">Hasil pencocokan data</h2>

                    {/* Navigasi Tab */}
                    <div className="mt-4 flex border-b border-line text-sm font-semibold">
                        <button
                            type="button"
                            onClick={() => setTabAktif('selisih')}
                            className={`pb-3 pr-6 text-sm transition-all border-b-2 ${
                                tabAktif === 'selisih'
                                    ? 'border-brand-700 text-brand-700'
                                    : 'border-transparent text-ink-500 hover:text-ink-800'
                            }`}
                        >
                            Selisih ({jumlahBelumSelesai})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTabAktif('sesuai')}
                            className={`pb-3 px-6 text-sm transition-all border-b-2 ${
                                tabAktif === 'sesuai'
                                    ? 'border-brand-700 text-brand-700'
                                    : 'border-transparent text-ink-500 hover:text-ink-800'
                            }`}
                        >
                            Sesuai ({daftarSesuai.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTabAktif('rekap')}
                            className={`pb-3 px-6 text-sm transition-all border-b-2 ${
                                tabAktif === 'rekap'
                                    ? 'border-brand-700 text-brand-700'
                                    : 'border-transparent text-ink-500 hover:text-ink-800'
                            }`}
                        >
                            Rekap laporan
                        </button>
                    </div>

                    {/* KONTEN TAB 1: Selisih */}
                    {tabAktif === 'selisih' && (
                        <div className="mt-4 space-y-4">
                            <div className="overflow-x-auto rounded-lg border border-line">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-surface/80 border-b border-line text-[11px] font-bold text-ink-700 uppercase tracking-wider">
                                            <th className="py-3 px-4">KODE ASET</th>
                                            <th className="py-3 px-4">ELEMEN DATA</th>
                                            <th className="py-3 px-4">MASTER ASET</th>
                                            <th className="py-3 px-4">DATA PEMBANDING</th>
                                            <th className="py-3 px-4">STATUS</th>
                                            <th className="py-3 px-4 text-right">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line bg-white text-ink-900">
                                        {barisSelisihTampil.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-ink-500 italic">
                                                    Tidak ada selisih data ditemukan. Seluruh inventaris telah sinkron!
                                                </td>
                                            </tr>
                                        ) : (
                                            barisSelisihTampil.map((item) => {
                                                const selesai = item.status === 'Diselesaikan';
                                                return (
                                                    <tr key={item.id} className="hover:bg-surface/40 transition">
                                                        <td className="py-3.5 px-4 font-mono font-bold text-ink-900 whitespace-nowrap">
                                                            {item.kode_aset}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-medium text-ink-900 whitespace-nowrap">
                                                            {item.elemen_data}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-ink-700">
                                                            {item.master_aset}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-medium text-ink-800">
                                                            {item.data_pembanding}
                                                        </td>
                                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                                            <span
                                                                className={`font-semibold px-2 py-0.5 rounded border ${
                                                                    selesai
                                                                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                                        : 'text-amber-700 bg-amber-50 border-amber-200'
                                                                }`}
                                                            >
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => setItemSelisihTerpilih(item)}
                                                                className="font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                                                            >
                                                                {item.aksi} →
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Navigasi Pagination Interaktif */}
                            <div className="flex items-center justify-between text-xs text-ink-500 pt-1">
                                <span>
                                    Menampilkan {indeksMulai}–{indeksAkhir} dari {dataSelisih.length} data
                                </span>
                                <div className="flex items-center gap-1 font-medium">
                                    <button
                                        type="button"
                                        disabled={halamanSelisih <= 1}
                                        onClick={() => setHalamanSelisih((p) => Math.max(1, p - 1))}
                                        className="rounded px-2 py-0.5 text-ink-500 hover:bg-surface disabled:opacity-40"
                                    >
                                        ‹
                                    </button>
                                    {Array.from({ length: totalHalamanSelisih }, (_, i) => i + 1).map((hal) => (
                                        <button
                                            key={hal}
                                            type="button"
                                            onClick={() => setHalamanSelisih(hal)}
                                            className={`rounded px-2.5 py-0.5 transition ${
                                                hal === halamanSelisih
                                                    ? 'bg-brand-50 text-brand-700 font-bold'
                                                    : 'hover:bg-surface text-ink-700'
                                            }`}
                                        >
                                            {hal}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        disabled={halamanSelisih >= totalHalamanSelisih}
                                        onClick={() => setHalamanSelisih((p) => Math.min(totalHalamanSelisih, p + 1))}
                                        className="rounded px-2 py-0.5 text-ink-500 hover:bg-surface disabled:opacity-40"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                            {/* Banner Peringatan Sesuai Desain Figma */}
                            {jumlahBelumSelesai > 0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-medium text-amber-900 leading-relaxed">
                                    Periode belum dapat ditutup selama selisih belum diselesaikan. Setiap penyesuaian harus memiliki bukti pendukung.
                                </div>
                            )}
                        </div>
                    )}

                    {/* KONTEN TAB 2: Sesuai */}
                    {tabAktif === 'sesuai' && (
                        <div className="mt-4 space-y-4">
                            <div className="overflow-x-auto rounded-lg border border-line">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-surface/80 border-b border-line text-[11px] font-bold text-ink-700 uppercase tracking-wider">
                                            <th className="py-3 px-4">KODE ASET</th>
                                            <th className="py-3 px-4">NAMA BARANG</th>
                                            <th className="py-3 px-4">KATEGORI</th>
                                            <th className="py-3 px-4">LOKASI</th>
                                            <th className="py-3 px-4">KONDISI</th>
                                            <th className="py-3 px-4 text-center">HASIL COCOK</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line bg-white text-ink-900">
                                        {daftarSesuai.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-ink-500 italic">
                                                    Belum ada aset yang 100% sesuai tanpa catatan selisih.
                                                </td>
                                            </tr>
                                        ) : (
                                            daftarSesuai.map((item) => (
                                                <tr key={item.id_aset} className="hover:bg-surface/40 transition">
                                                    <td className="py-3 px-4 font-mono font-bold text-ink-900 whitespace-nowrap">
                                                        {item.kode_aset}
                                                    </td>
                                                    <td className="py-3 px-4 font-medium text-ink-900">
                                                        {item.nama_barang}
                                                    </td>
                                                    <td className="py-3 px-4 text-ink-600">
                                                        {item.kategori}
                                                    </td>
                                                    <td className="py-3 px-4 text-ink-700">
                                                        {item.lokasi}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            {item.kondisi}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className="inline-flex items-center gap-1 font-bold text-brand-700 text-xs">
                                                            ✓ Sesuai
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* KONTEN TAB 3: Rekap Laporan Penyusutan & Nilai Buku */}
                    {tabAktif === 'rekap' && (
                        <div className="mt-4 space-y-4">
                            <div className="overflow-x-auto rounded-lg border border-line">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-surface/80 border-b border-line text-[11px] font-bold text-ink-700 uppercase tracking-wider">
                                            <th className="py-3 px-4">KODE</th>
                                            <th className="py-3 px-4">KATEGORI ASET</th>
                                            <th className="py-3 px-4 text-center">MASA MANFAAT</th>
                                            <th className="py-3 px-4 text-center">UNIT</th>
                                            <th className="py-3 px-4 text-right">HARGA PEROLEHAN</th>
                                            <th className="py-3 px-4 text-right">AKUMULASI PENYUSUTAN</th>
                                            <th className="py-3 px-4 text-right">NILAI BUKU</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line bg-white text-ink-900">
                                        {rekapPerKategori.map((k) => (
                                            <tr key={k.kode} className="hover:bg-surface/40 transition">
                                                <td className="py-3 px-4 font-mono font-bold text-ink-900">
                                                    {k.kode}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-ink-900">
                                                    {k.nama}
                                                </td>
                                                <td className="py-3 px-4 text-center text-ink-600">
                                                    {k.masa_manfaat} tahun
                                                </td>
                                                <td className="py-3 px-4 text-center text-ink-700 font-semibold">
                                                    {k.jumlah_aset}
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-ink-900">
                                                    {formatRupiah(k.harga_perolehan)}
                                                </td>
                                                <td className="py-3 px-4 text-right text-rose-700">
                                                    {formatRupiah(k.penyusutan)}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-brand-700">
                                                    {formatRupiah(k.nilai_buku)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-line bg-surface font-bold text-ink-900 text-xs">
                                            <td colSpan="4" className="py-3.5 px-4 uppercase tracking-wider">
                                                TOTAL KESELURUHAN
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                {formatRupiah(totalRekap.harga_perolehan)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right text-rose-700">
                                                {formatRupiah(totalRekap.penyusutan)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right text-brand-800 text-sm">
                                                {formatRupiah(totalRekap.nilai_buku)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Lembar Dokumen Resmi Laporan Rekonsiliasi & Penyusutan (Khusus Saat Cetak / Unduh PDF) */}
                <div id="lembar-laporan-resmi" className="hidden">
                    <div className="bg-white p-4 text-xs text-ink-900">
                        <div className="flex items-start gap-4 border-b-2 border-ink-900 pb-3">
                            <div className="flex-shrink-0 pt-1">
                                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 18h16M4 10h16M12 3l9 5H3l9-5zM6 10v8M10 10v8M14 10v8M18 10v8" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-bold uppercase">UNIVERSITAS ANDALAS</p>
                                <p className="text-lg font-extrabold uppercase">FAKULTAS TEKNOLOGI INFORMASI</p>
                                <p className="text-[11px] text-ink-500">Kampus Limau Manis, Padang 25163 • fti.unand.ac.id</p>
                            </div>
                        </div>

                        <div className="my-5 text-center">
                            <h2 className="text-base font-extrabold uppercase tracking-wider">
                                BERITA ACARA & LAPORAN REKONSILIASI INVENTARIS ASET
                            </h2>
                            <p className="mt-1 text-xs text-ink-600">
                                Periode: {periodePilihan} • Sumber Pembanding: {sumberPilihan}
                            </p>
                        </div>

                        <h3 className="mt-4 mb-2 font-bold uppercase text-ink-800">I. Rekapitulasi Nilai Perolehan & Penyusutan</h3>
                        <table className="w-full border-collapse border border-line text-left text-[11px]">
                            <thead>
                                <tr className="border-b border-line bg-surface font-bold">
                                    <th className="border-r border-line p-2">Kode</th>
                                    <th className="border-r border-line p-2">Kategori Aset</th>
                                    <th className="border-r border-line p-2 text-center">Unit</th>
                                    <th className="border-r border-line p-2 text-right">Harga Perolehan</th>
                                    <th className="border-r border-line p-2 text-right">Akumulasi Penyusutan</th>
                                    <th className="p-2 text-right">Nilai Buku</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rekapPerKategori.map((k) => (
                                    <tr key={k.kode} className="border-b border-line">
                                        <td className="border-r border-line p-2 font-mono font-bold">{k.kode}</td>
                                        <td className="border-r border-line p-2">{k.nama}</td>
                                        <td className="border-r border-line p-2 text-center">{k.jumlah_aset}</td>
                                        <td className="border-r border-line p-2 text-right">{formatRupiah(k.harga_perolehan)}</td>
                                        <td className="border-r border-line p-2 text-right">{formatRupiah(k.penyusutan)}</td>
                                        <td className="p-2 text-right font-bold">{formatRupiah(k.nilai_buku)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <h3 className="mt-6 mb-2 font-bold uppercase text-ink-800">II. Daftar Temuan Selisih Rekonsiliasi</h3>
                        <table className="w-full border-collapse border border-line text-left text-[11px]">
                            <thead>
                                <tr className="border-b border-line bg-surface font-bold">
                                    <th className="border-r border-line p-2">Kode Aset</th>
                                    <th className="border-r border-line p-2">Elemen Data</th>
                                    <th className="border-r border-line p-2">Master Aset</th>
                                    <th className="border-r border-line p-2">Data Pembanding</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataSelisih.map((item) => (
                                    <tr key={item.id} className="border-b border-line">
                                        <td className="border-r border-line p-2 font-mono font-bold">{item.kode_aset}</td>
                                        <td className="border-r border-line p-2">{item.elemen_data}</td>
                                        <td className="border-r border-line p-2">{item.master_aset}</td>
                                        <td className="border-r border-line p-2">{item.data_pembanding}</td>
                                        <td className="p-2">{item.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-10 flex flex-row items-start justify-between gap-8">
                            <div className="w-1/2 max-w-[240px]">
                                <p className="font-semibold">Mengetahui, Pimpinan FTI</p>
                                <div className="my-3 h-20 rounded border border-dashed border-ink-300" />
                                <p className="font-bold border-b border-ink-800 pb-0.5">
                                    {penandatangan?.pimpinan || 'Dr. Eng. Budi Raharjo, M.T.'}
                                </p>
                            </div>
                            <div className="w-1/2 max-w-[240px]">
                                <p className="font-semibold">Padang, {kpi.tanggalPosisi || '-'}</p>
                                <p className="font-semibold">Operator Aset Fakultas,</p>
                                <div className="my-3 h-20 rounded border border-dashed border-ink-300" />
                                <p className="font-bold border-b border-ink-800 pb-0.5">
                                    {penandatangan?.operator || 'Nadia Putri'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Detail Tindak Lanjut Selisih */}
            <Modal show={!!itemSelisihTerpilih} onClose={() => setItemSelisihTerpilih(null)} maxWidth="lg">
                {itemSelisihTerpilih && (
                    <div className="p-6">
                        <div className="flex items-center justify-between border-b border-line pb-3">
                            <div>
                                <h3 className="text-base font-bold text-ink-900">
                                    Tindak Lanjut Selisih Data
                                </h3>
                                <p className="text-xs text-ink-500 font-mono mt-0.5">
                                    {itemSelisihTerpilih.kode_aset} {itemSelisihTerpilih.nama_barang ? `• ${itemSelisihTerpilih.nama_barang}` : ''}
                                </p>
                            </div>
                            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                                {itemSelisihTerpilih.status}
                            </span>
                        </div>

                        <div className="mt-4 space-y-3 text-xs">
                            <div className="rounded-lg bg-surface/50 p-3 space-y-1.5 border border-line">
                                <p className="text-ink-500 font-medium">Elemen Data: <strong className="text-ink-900">{itemSelisihTerpilih.elemen_data}</strong></p>
                                <p className="text-ink-500">Nilai di Master Aset: <strong className="text-ink-900">{itemSelisihTerpilih.master_aset}</strong></p>
                                <p className="text-ink-500">Temuan Data Pembanding: <strong className="text-brand-800">{itemSelisihTerpilih.data_pembanding}</strong></p>
                            </div>

                            <p className="text-ink-600 leading-relaxed">
                                {itemSelisihTerpilih.keterangan_detail}
                            </p>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                            {peranKonteks === 'operator' && itemSelisihTerpilih.href ? (
                                <Link
                                    href={itemSelisihTerpilih.href}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                                >
                                    Buka di Master Aset / Lokasi →
                                </Link>
                            ) : (
                                <span />
                            )}

                            <div className="flex items-center gap-2.5">
                                <SecondaryButton onClick={() => setItemSelisihTerpilih(null)}>
                                    Tutup
                                </SecondaryButton>
                                <PrimaryButton
                                    onClick={() => handleSetujuiPenyesuaian(itemSelisihTerpilih)}
                                    className="bg-brand-700 hover:bg-brand-800 text-xs px-4 py-2"
                                >
                                    Tandai Selesai
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Riwayat Periode */}
            <Modal show={tampilModalRiwayat} onClose={() => setTampilModalRiwayat(false)} maxWidth="lg">
                <div className="p-6">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                        <h3 className="text-base font-bold text-ink-900">
                            Riwayat Rekonsiliasi Periode Sebelumnya
                        </h3>
                        <button
                            type="button"
                            onClick={() => setTampilModalRiwayat(false)}
                            className="rounded-lg p-1 text-ink-400 hover:bg-surface hover:text-ink-600 transition"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-line">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-surface/80 text-[11px] font-bold text-ink-700 uppercase">
                                <tr className="border-b border-line">
                                    <th className="py-2.5 px-3">Periode</th>
                                    <th className="py-2.5 px-3">Tanggal Tutup</th>
                                    <th className="py-2.5 px-3">Operator</th>
                                    <th className="py-2.5 px-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line bg-white">
                                {[
                                    { periode: 'September 2026', tanggal: '30 September 2026', status: 'Ditutup', operator: 'Nadia Putri' },
                                    { periode: 'Agustus 2026', tanggal: '31 Agustus 2026', status: 'Ditutup', operator: 'Nadia Putri' },
                                    { periode: 'Juli 2026', tanggal: '31 Juli 2026', status: 'Ditutup', operator: 'Nadia Putri' },
                                    { periode: 'Semester Genap 2025/2026', tanggal: '30 Juni 2026', status: 'Ditutup', operator: 'Nadia Putri' },
                                ].map((r, i) => (
                                    <tr key={i} className="hover:bg-surface/50 transition">
                                        <td className="py-3 px-3 font-semibold text-ink-900">{r.periode}</td>
                                        <td className="py-3 px-3 text-ink-600">{r.tanggal}</td>
                                        <td className="py-3 px-3 text-ink-700">{r.operator}</td>
                                        <td className="py-3 px-3 text-right">
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 flex justify-end">
                        <SecondaryButton onClick={() => setTampilModalRiwayat(false)} className="text-xs px-4 py-2">
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
