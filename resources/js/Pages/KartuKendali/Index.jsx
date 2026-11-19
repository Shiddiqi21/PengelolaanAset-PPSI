import PrimaryButton from '@/Components/PrimaryButton';
import Card from '@/Components/ui/Card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Index({
    daftarRuangan = [],
    ruanganAktif = null,
    penanggungJawab = 'Dr. Andi Pratama',
    daftarAset = [],
    tanggalPosisi = '21 Oktober 2026',
    nomorDokumen = 'KKR/FTI-201/X/2026',
    operatorNama = 'Nadia Putri',
    filter = {},
}) {
    const listRuangan = Array.isArray(daftarRuangan) ? daftarRuangan : [];
    const listAset = Array.isArray(daftarAset) ? daftarAset : [];

    // State custom dropdown pilihan ruangan (agar tidak memakai select bawaan browser)
    const [bukaDropdown, setBukaDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Menutup dropdown saat klik di luar
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setBukaDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const pilihRuangan = (idRuangan) => {
        setBukaDropdown(false);
        router.get(
            route('kartu-kendali.index'),
            { ruangan: idRuangan },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleCetak = () => {
        window.print();
    };

    const renderKondisi = (kondisi) => {
        const k = String(kondisi || '').toLowerCase();
        if (k === 'rusak_ringan' || k === 'kurang_baik') {
            return (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-300/80">
                    Rusak ringan
                </span>
            );
        }
        if (k === 'rusak_berat') {
            return (
                <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-300/80">
                    Rusak berat
                </span>
            );
        }
        return (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-300/80">
                Baik
            </span>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Kartu kendali ruangan" />

            {/* CSS Cetak Khusus Lembar Kartu Kendali Ruangan (A4 Portrait) */}
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                }
                @media print {
                    /* Sembunyikan semua elemen layout default saat cetak */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Tampilkan HANYA dokumen resmi lembar kartu kendali */
                    #lembar-kartu-kendali-wrapper,
                    #lembar-kartu-kendali-wrapper * {
                        visibility: visible !important;
                    }
                    #lembar-kartu-kendali-wrapper {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .hindari-potong {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            {/* Container utama dengan lebar seimbang agar tidak terlalu mepet ke tepi layar */}
            <div className="mx-auto max-w-5xl space-y-6 pb-12">
                {/* Header Sesuai Desain Figma */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-xs font-medium text-ink-500">FTI / Kartu kendali ruangan</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
                            Kartu kendali ruangan
                        </h1>
                        <p className="mt-1 text-sm text-ink-600">
                            Dokumen inventaris ruangan berdasarkan posisi aset terkini.
                        </p>
                    </div>

                    <PrimaryButton
                        onClick={handleCetak}
                        className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 shadow-sm px-4 py-2.5 text-sm"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                            />
                        </svg>
                        Cetak kartu ruangan
                    </PrimaryButton>
                </div>

                {/* Card 1: Pilih Ruangan (Dua kotak terpisah berdampingan dengan Custom Dropdown Modern) */}
                <Card className="p-6">
                    <h2 className="text-base font-bold text-ink-900">Pilih ruangan</h2>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Box 1 (Kiri): Custom Dropdown Ruangan (1 Panah & Menu Custom Modern) */}
                        <div ref={dropdownRef} className="relative">
                            <div
                                onClick={() => setBukaDropdown(!bukaDropdown)}
                                className={`cursor-pointer rounded-xl border bg-white p-3.5 transition-all ${
                                    bukaDropdown
                                        ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                                        : 'border-line hover:border-brand-500'
                                }`}
                            >
                                <p className="text-xs font-medium text-ink-500 mb-1">Ruangan</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-ink-900 truncate">
                                        {ruanganAktif?.label || `${ruanganAktif?.kode_ruangan || 'FTI-201'} • ${ruanganAktif?.nama_ruangan || 'Lab. Sistem Informasi'}`}
                                    </span>
                                    {/* HANYA 1 PANAH RAPI */}
                                    <svg
                                        className={`ml-2 h-4 w-4 text-ink-500 transition-transform duration-200 flex-shrink-0 ${
                                            bukaDropdown ? 'rotate-180 text-brand-700' : ''
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

                            {/* Menu Pilihan Ruangan Kustom (Bukan select bawaan browser) */}
                            {bukaDropdown && (
                                <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-white py-1.5 shadow-xl transition-all">
                                    {listRuangan.map((r) => {
                                        const terpilih = String(r.id_ruangan) === String(ruanganAktif?.id_ruangan);
                                        return (
                                            <div
                                                key={r.id_ruangan}
                                                onClick={() => pilihRuangan(r.id_ruangan)}
                                                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs transition ${
                                                    terpilih
                                                        ? 'bg-brand-50/80 font-bold text-brand-900'
                                                        : 'text-ink-800 hover:bg-surface'
                                                }`}
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-ink-900">
                                                            {r.kode_ruangan}
                                                        </span>
                                                        <span className="text-ink-400">•</span>
                                                        <span className="truncate">{r.nama_ruangan}</span>
                                                    </div>
                                                    <p className="text-[11px] text-ink-400 mt-0.5">
                                                        {r.gedung || 'Gedung FTI'}
                                                    </p>
                                                </div>
                                                {terpilih && (
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

                        {/* Box 2 (Kanan): Tanggal Posisi Aset */}
                        <div className="rounded-xl border border-line bg-white p-3.5">
                            <p className="text-xs font-medium text-ink-500 mb-1">Tanggal posisi aset</p>
                            <p className="text-sm font-semibold text-ink-900">
                                {tanggalPosisi}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Card 2: Lembar Dokumen Resmi DBR (Kartu Kendali Ruangan) */}
                <div id="lembar-kartu-kendali-wrapper">
                    <div className="rounded-2xl border border-line bg-white p-8 sm:p-12 md:p-14 shadow-xs">
                        {/* Kop Dokumen Resmi */}
                        <div className="flex items-start gap-4 pb-3">
                            <div className="flex-shrink-0 text-ink-900 pt-1">
                                {/* Ikon Gedung / Universitas Yunani */}
                                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 18h16M4 10h16M12 3l9 5H3l9-5zM6 10v8M10 10v8M14 10v8M18 10v8" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold tracking-wide text-ink-900 uppercase">
                                    UNIVERSITAS ANDALAS
                                </p>
                                <p className="text-lg font-extrabold tracking-tight text-ink-900 uppercase">
                                    FAKULTAS TEKNOLOGI INFORMASI
                                </p>
                                <p className="text-xs text-ink-500">
                                    Kampus Limau Manis, Padang 25163 • fti.unand.ac.id
                                </p>
                            </div>
                        </div>

                        {/* Garis Pemisah Kop Tebal */}
                        <div className="border-b-[2px] border-ink-900 mt-3 mb-6"></div>

                        {/* Judul Dokumen & Nomor */}
                        <div className="text-center my-6">
                            <h2 className="text-base font-extrabold tracking-wider text-ink-900 uppercase">
                                KARTU KENDALI RUANGAN
                            </h2>
                            <p className="text-xs text-ink-600 mt-1 font-medium">
                                {nomorDokumen} • Posisi {tanggalPosisi}
                            </p>
                            <div className="mt-2.5">
                                <span className="inline-block rounded-full bg-surface px-3 py-0.5 text-[10px] font-semibold tracking-wider text-ink-500 uppercase border border-line">
                                    CONTOH DOKUMEN • BUKAN DOKUMEN RESMI
                                </span>
                            </div>
                        </div>

                        {/* Metadata Ruangan, Penanggung Jawab, Unit Kerja */}
                        <div className="my-6 space-y-1.5 text-xs text-ink-800">
                            <div className="flex items-start">
                                <span className="w-36 flex-shrink-0 font-medium text-ink-600">Ruangan / gedung</span>
                                <span className="font-semibold text-ink-900">
                                    : {ruanganAktif?.kode_ruangan || 'FTI-201'} • {ruanganAktif?.nama_ruangan || 'Lab. Sistem Informasi'} / {ruanganAktif?.gedung || 'Gedung FTI'}
                                </span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-36 flex-shrink-0 font-medium text-ink-600">Penanggung jawab</span>
                                <span className="font-semibold text-ink-900">
                                    : {penanggungJawab}
                                </span>
                            </div>
                            <div className="flex items-start">
                                <span className="w-36 flex-shrink-0 font-medium text-ink-600">Unit kerja</span>
                                <span className="font-semibold text-ink-900">
                                    : {ruanganAktif?.unit || 'Program Studi Sistem Informasi'}
                                </span>
                            </div>
                        </div>

                        {/* Tabel Daftar Aset Inventaris Ruangan (Garis & Grid Jelas Kelihatan) */}
                        <div className="mt-6 overflow-x-auto rounded-lg border-2 border-line bg-white shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-line bg-surface/80 text-[11px] font-bold text-ink-800 uppercase tracking-wider">
                                        <th className="py-3 px-4 border-r border-line">KODE ASET</th>
                                        <th className="py-3 px-4 border-r border-line">NAMA BARANG</th>
                                        <th className="py-3 px-4 text-center border-r border-line">TAHUN</th>
                                        <th className="py-3 px-4 text-center border-r border-line">JUMLAH</th>
                                        <th className="py-3 px-4 border-r border-line">KONDISI</th>
                                        <th className="py-3 px-4">KETERANGAN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line text-ink-900">
                                    {listAset.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-10 text-center text-ink-500 italic">
                                                Belum ada aset inventaris yang ditempatkan pada ruangan ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        listAset.map((item, index) => (
                                            <tr key={item.id_aset || index} className="hover:bg-brand-50/20 transition-colors">
                                                <td className="py-3 px-4 font-mono font-bold text-ink-900 whitespace-nowrap border-r border-line">
                                                    {item.kode_aset}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-ink-900 border-r border-line">
                                                    {item.nama_barang}
                                                </td>
                                                <td className="py-3 px-4 text-center text-ink-700 whitespace-nowrap border-r border-line">
                                                    {item.tahun}
                                                </td>
                                                <td className="py-3 px-4 text-center text-ink-700 whitespace-nowrap border-r border-line">
                                                    {item.jumlah || '1 unit'}
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap border-r border-line">
                                                    {renderKondisi(item.kondisi)}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-ink-800 whitespace-nowrap">
                                                    {item.keterangan || 'Digunakan'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Catatan / Keterangan Kaki Tabel */}
                        <div className="mt-4 text-[11px] text-ink-500">
                            <p>
                                Halaman 1 dari 1 • {listAset.length} dari {listAset.length} unit inventaris. Mutasi MTS-2026-0014 belum mengubah lokasi sampai serah terima selesai.
                            </p>
                        </div>

                        {/* Blok Tanda Tangan: SEJAJAR (Side by Side) & ADA TEMPAT UNTUK TTD */}
                        <div className="hindari-potong mt-14 flex flex-row items-start justify-between gap-8 text-xs text-ink-900">
                            {/* Kolom Kiri: Penanggung Jawab Ruangan */}
                            <div className="w-1/2 max-w-[260px]">
                                <p className="font-semibold text-ink-700">Penanggung Jawab Ruangan,</p>
                                {/* Tempat untuk Tanda Tangan */}
                                <div className="my-3 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-ink-300 bg-surface/30 text-[10px] text-ink-400 italic">
                                    ( Tanda tangan & stempel )
                                </div>
                                <p className="font-bold text-ink-900 border-b border-ink-800 pb-0.5 inline-block min-w-[200px]">
                                    {penanggungJawab}
                                </p>
                            </div>

                            {/* Kolom Kanan: Operator Aset */}
                            <div className="w-1/2 max-w-[260px]">
                                <p className="font-semibold text-ink-700">
                                    Padang, {tanggalPosisi}
                                </p>
                                <p className="font-semibold text-ink-700">Operator Aset Fakultas,</p>
                                {/* Tempat untuk Tanda Tangan */}
                                <div className="my-3 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-ink-300 bg-surface/30 text-[10px] text-ink-400 italic">
                                    ( Tanda tangan & cap )
                                </div>
                                <p className="font-bold text-ink-900 border-b border-ink-800 pb-0.5 inline-block min-w-[200px]">
                                    {operatorNama}
                                </p>
                            </div>
                        </div>

                        {/* Footer Dokumen Resmi */}
                        <div className="mt-12 border-t border-line/60 pt-3 text-[10px] tracking-wider text-ink-400 uppercase">
                            CONTOH DOKUMEN • Bukan dokumen resmi • Halaman 1 / 1
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
