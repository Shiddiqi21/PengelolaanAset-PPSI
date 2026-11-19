import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import QrCode from '@/Components/ui/QrCode';
import SearchInput from '@/Components/ui/SearchInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const OPSI_UKURAN_LABEL = [
    '90 × 40 mm • Kertas A4',
    '100 × 50 mm • Kertas Stiker',
    '70 × 35 mm • Kertas Label',
];

export default function Index({ daftarAset, opsiKategori = [], opsiRuangan = [], filter = {} }) {
    const dataAsetSemua = useMemo(() => {
        if (!daftarAset) return [];
        if (Array.isArray(daftarAset.data)) return daftarAset.data;
        if (Array.isArray(daftarAset)) return daftarAset;
        return [];
    }, [daftarAset]);

    const listRuangan = Array.isArray(opsiRuangan) ? opsiRuangan : [];

    // Default pilih 4 aset pertama agar tampilan awal langsung rapi terisi
    const [idTerpilih, setIdTerpilih] = useState(() => {
        if (dataAsetSemua && dataAsetSemua.length > 0) {
            return dataAsetSemua.slice(0, 4).map((a) => a.id_aset);
        }
        return [];
    });

    const [ruanganTerpilih, setRuanganTerpilih] = useState('');
    const [ukuranLabel, setUkuranLabel] = useState(OPSI_UKURAN_LABEL[0]);

    // Custom Dropdowns
    const [bukaDropdownUkuran, setBukaDropdownUkuran] = useState(false);
    const [bukaDropdownRuanganModal, setBukaDropdownRuanganModal] = useState(false);
    const dropdownUkuranRef = useRef(null);
    const dropdownRuanganModalRef = useRef(null);

    // State Modal Pilih Aset
    const [tampilModalPilih, setTampilModalPilih] = useState(false);
    const [pencarianModal, setPencarianModal] = useState('');

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownUkuranRef.current && !dropdownUkuranRef.current.contains(event.target)) {
                setBukaDropdownUkuran(false);
            }
            if (dropdownRuanganModalRef.current && !dropdownRuanganModalRef.current.contains(event.target)) {
                setBukaDropdownRuanganModal(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter aset di dalam modal
    const asetTersaringModal = useMemo(() => {
        return dataAsetSemua.filter((aset) => {
            if (!aset) return false;
            const cocokRuangan = ruanganTerpilih ? String(aset.id_ruangan) === String(ruanganTerpilih) : true;
            const qLower = (pencarianModal || '').toLowerCase();
            const cocokQ =
                !pencarianModal ||
                String(aset.kode_aset || '').toLowerCase().includes(qLower) ||
                String(aset.nama_barang || '').toLowerCase().includes(qLower) ||
                String(aset.merek_tipe || '').toLowerCase().includes(qLower);

            return cocokRuangan && cocokQ;
        });
    }, [dataAsetSemua, ruanganTerpilih, pencarianModal]);

    // Daftar aset terpilih untuk dicetak
    const asetDipilih = useMemo(() => {
        return dataAsetSemua.filter((a) => a && idTerpilih.includes(a.id_aset));
    }, [dataAsetSemua, idTerpilih]);

    const teksRuangan = useMemo(() => {
        if (!ruanganTerpilih) return 'Semua Ruangan';
        const r = listRuangan.find((item) => item && String(item.id_ruangan) === String(ruanganTerpilih));
        return r ? `${r.kode_ruangan || `FTI-${r.nomor_ruangan}`} • ${r.nama_ruangan}` : 'Lab. Sistem Informasi';
    }, [ruanganTerpilih, listRuangan]);

    const teksRingkasanAset = useMemo(() => {
        if (!asetDipilih || asetDipilih.length === 0) return 'Belum ada aset dipilih';
        return asetDipilih.map((a) => a?.kode_aset || '').filter(Boolean).join(', ') || 'Belum ada aset dipilih';
    }, [asetDipilih]);

    const togglePilihAset = (id) => {
        setIdTerpilih((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handlePilihSemuaDiModal = () => {
        const semuaId = asetTersaringModal.map((a) => a.id_aset);
        setIdTerpilih((prev) => Array.from(new Set([...prev, ...semuaId])));
    };

    const handleBatalSemuaDiModal = () => {
        const semuaId = asetTersaringModal.map((a) => a.id_aset);
        setIdTerpilih((prev) => prev.filter((id) => !semuaId.includes(id)));
    };

    const handleCetak = () => {
        window.print();
    };

    return (
        <AuthenticatedLayout>
            <Head title="Cetak label aset" />

            {/* CSS Print Khusus Otomatis A4 */}
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 8mm;
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #area-pratinjau-cetak,
                    #area-pratinjau-cetak * {
                        visibility: visible !important;
                    }
                    #area-pratinjau-cetak {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                    .kotak-label-cetak {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="space-y-6">
                {/* Header Sesuai Desain Figma */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-xs font-medium text-ink-500">FTI / Cetak label aset</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
                            Cetak label aset
                        </h1>
                        <p className="mt-1 text-sm text-ink-600">
                            Buat label inventaris untuk identifikasi dan penelusuran aset.
                        </p>
                    </div>

                    <PrimaryButton
                        onClick={handleCetak}
                        disabled={asetDipilih.length === 0}
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
                        Cetak label
                    </PrimaryButton>
                </div>

                {/* Card 1: Pengaturan Label */}
                <Card className="p-6">
                    <h2 className="text-base font-bold text-ink-900">Pengaturan label</h2>

                    {/* Dua Kotak Pengaturan Berdampingan */}
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Box Kiri: Pilihan Aset */}
                        <div
                            onClick={() => setTampilModalPilih(true)}
                            className="group flex cursor-pointer items-center justify-between rounded-xl border border-line bg-white p-3.5 transition-all hover:border-brand-500 hover:bg-brand-50/20 hover:shadow-xs"
                            title="Klik untuk memilih aset atau ruangan"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 group-hover:bg-brand-100">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-ink-500">Pilihan aset</p>
                                    <p className="text-sm font-semibold text-ink-900 truncate">
                                        {asetDipilih.length} aset dipilih • {teksRuangan}
                                    </p>
                                </div>
                            </div>
                            <span className="ml-2 flex-shrink-0 text-xs font-semibold text-ink-400 group-hover:text-brand-700 transition">
                                Ubah ▾
                            </span>
                        </div>

                        {/* Box Kanan: Ukuran Label (Custom Dropdown) */}
                        <div ref={dropdownUkuranRef} className="relative">
                            <div
                                onClick={() => setBukaDropdownUkuran(!bukaDropdownUkuran)}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border bg-white p-3.5 transition-all ${
                                    bukaDropdownUkuran
                                        ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                                        : 'border-line hover:border-brand-500'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-ink-600">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-ink-500">Ukuran label</p>
                                        <p className="text-sm font-semibold text-ink-900 truncate">
                                            {ukuranLabel}
                                        </p>
                                    </div>
                                </div>
                                <svg
                                    className={`ml-2 h-4 w-4 flex-shrink-0 text-ink-500 transition-transform duration-200 ${
                                        bukaDropdownUkuran ? 'rotate-180 text-brand-700' : ''
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {bukaDropdownUkuran && (
                                <div className="absolute left-0 top-full z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-xl">
                                    {OPSI_UKURAN_LABEL.map((opsi) => {
                                        const terpilih = opsi === ukuranLabel;
                                        return (
                                            <div
                                                key={opsi}
                                                onClick={() => {
                                                    setUkuranLabel(opsi);
                                                    setBukaDropdownUkuran(false);
                                                }}
                                                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs transition ${
                                                    terpilih
                                                        ? 'bg-brand-50/80 font-bold text-brand-900'
                                                        : 'text-ink-800 hover:bg-surface'
                                                }`}
                                            >
                                                <span>{opsi}</span>
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
                    </div>

                    {/* Tabel Ringkasan Pengaturan */}
                    <div className="mt-5 overflow-x-auto rounded-lg border border-line">
                        <table className="min-w-full text-left text-xs">
                            <thead className="bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                                <tr>
                                    <th className="px-4 py-3">Aset Terpilih</th>
                                    <th className="px-4 py-3">Jumlah Label</th>
                                    <th className="px-4 py-3">Kode Identifikasi</th>
                                    <th className="px-4 py-3">Keluaran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line bg-white text-ink-800">
                                <tr>
                                    <td className="px-4 py-3.5 font-medium leading-relaxed max-w-md">
                                        {teksRingkasanAset}
                                    </td>
                                    <td className="px-4 py-3.5 font-semibold text-ink-900 whitespace-nowrap">
                                        {asetDipilih.length} label
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                        <Badge nada="netral">Kode Inventaris + QR</Badge>
                                    </td>
                                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-brand-700">
                                        <Badge nada="sukses">PDF siap cetak</Badge>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                        <span>Menampilkan 1-1 dari 1 data</span>
                        <div className="flex items-center gap-1 font-medium">
                            <span className="text-ink-400">‹</span>
                            <span className="rounded px-2 py-0.5 bg-surface text-ink-900">1</span>
                            <span className="text-ink-400">›</span>
                        </div>
                    </div>
                </Card>

                {/* Card 2: Pratinjau Label Inventaris */}
                <Card className="p-6">
                    <div className="flex items-center justify-between border-b border-line pb-4">
                        <h2 className="text-base font-bold text-ink-900">
                            Pratinjau label inventaris
                        </h2>
                        <span className="text-xs font-semibold text-ink-500 bg-surface px-2.5 py-1 rounded-full border border-line">
                            A4 • 100% • {asetDipilih.length} label
                        </span>
                    </div>

                    {/* Area Grid Label Stiker */}
                    <div id="area-pratinjau-cetak" className="py-5">
                        {asetDipilih.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-line py-12 text-center bg-surface/30">
                                <p className="text-sm font-semibold text-ink-700">
                                    Belum ada aset yang dipilih.
                                </p>
                                <p className="text-xs text-ink-500 mt-1">
                                    Pilih aset untuk melihat pratinjau stiker label inventaris.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setTampilModalPilih(true)}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 bg-white border border-brand-200 px-3 py-1.5 rounded-lg shadow-xs"
                                >
                                    + Buka Pilihan Aset
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {asetDipilih.map((aset) => (
                                    <div
                                        key={aset.id_aset}
                                        className="kotak-label-cetak flex items-center gap-4 rounded-xl border border-line bg-white p-4 shadow-xs transition hover:border-brand-400 hover:shadow-sm"
                                    >
                                        {/* Kotak QR Code di Sisi Kiri */}
                                        <div
                                            className="flex-shrink-0 rounded-lg border border-line/80 bg-white p-1.5 flex items-center justify-center shadow-2xs"
                                            style={{ width: '84px', height: '84px' }}
                                        >
                                            <QrCode value={aset.kode_aset} size={72} />
                                        </div>

                                        {/* Teks Identitas di Sisi Kanan Sesuai Desain */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="text-[10px] font-bold tracking-wider text-brand-700 uppercase">
                                                UNIVERSITAS ANDALAS • FTI
                                            </p>
                                            <p className="font-mono text-base font-extrabold tracking-tight text-ink-900 leading-tight">
                                                {aset.kode_aset}
                                            </p>
                                            <p className="text-sm font-semibold text-ink-800 truncate" title={aset.nama_barang}>
                                                {aset.nama_barang}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-ink-500">
                                                <svg className="h-3 w-3 text-ink-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="truncate">{aset.lokasi || 'FTI-201 • Lab. Sistem Informasi'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Keterangan Sesuai Desain */}
                    <div className="border-t border-line pt-3 flex items-center justify-between">
                        <p className="text-[11px] font-medium tracking-wider text-ink-400 uppercase">
                            CONTOH DESAIN • Kode QR merupakan ilustrasi visual label.
                        </p>
                        <button
                            type="button"
                            onClick={() => setTampilModalPilih(true)}
                            className="text-xs font-semibold text-brand-700 hover:underline"
                        >
                            Kelola Pilihan Aset ({asetDipilih.length})
                        </button>
                    </div>
                </Card>
            </div>

            {/* Modal Pilih Aset yang Rapi dan Modern */}
            <Modal show={tampilModalPilih} onClose={() => setTampilModalPilih(false)} maxWidth="2xl">
                <div className="p-6">
                    {/* Header Modal */}
                    <div className="flex items-center justify-between border-b border-line pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-ink-900">Pilih Aset untuk Dicetak</h3>
                            <p className="text-xs text-ink-600 mt-0.5">
                                Pilih satu atau beberapa aset inventaris untuk ditampilkan pada lembar label.
                            </p>
                        </div>
                        <Badge nada={idTerpilih.length > 0 ? 'sukses' : 'netral'}>
                            {idTerpilih.length} dari {dataAsetSemua.length} dipilih
                        </Badge>
                    </div>

                    {/* Filter dan Pencarian di Modal */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <SearchInput
                            value={pencarianModal}
                            onChange={(e) => setPencarianModal(e.target.value)}
                            placeholder="Cari kode atau nama aset..."
                        />

                        {/* Custom Dropdown Filter Ruangan di Modal */}
                        <div ref={dropdownRuanganModalRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setBukaDropdownRuanganModal(!bukaDropdownRuanganModal)}
                                className={`flex h-full w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2 text-sm text-ink-900 transition ${
                                    bukaDropdownRuanganModal
                                        ? 'border-brand-600 ring-2 ring-brand-500/20'
                                        : 'border-line hover:border-brand-500'
                                }`}
                            >
                                <span className="truncate font-medium">{teksRuangan}</span>
                                <svg
                                    className={`ml-2 h-4 w-4 flex-shrink-0 text-ink-500 transition-transform ${
                                        bukaDropdownRuanganModal ? 'rotate-180 text-brand-700' : ''
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {bukaDropdownRuanganModal && (
                                <div className="absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-white py-1.5 shadow-xl">
                                    <div
                                        onClick={() => {
                                            setRuanganTerpilih('');
                                            setBukaDropdownRuanganModal(false);
                                        }}
                                        className={`flex cursor-pointer items-center justify-between px-4 py-2 text-xs transition ${
                                            !ruanganTerpilih
                                                ? 'bg-brand-50/80 font-bold text-brand-900'
                                                : 'text-ink-800 hover:bg-surface'
                                        }`}
                                    >
                                        <span>Semua Ruangan</span>
                                        {!ruanganTerpilih && (
                                            <svg className="h-4 w-4 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    {listRuangan.map((r) => {
                                        const aktif = String(r.id_ruangan) === String(ruanganTerpilih);
                                        return (
                                            <div
                                                key={r.id_ruangan}
                                                onClick={() => {
                                                    setRuanganTerpilih(String(r.id_ruangan));
                                                    setBukaDropdownRuanganModal(false);
                                                }}
                                                className={`flex cursor-pointer items-center justify-between px-4 py-2 text-xs transition ${
                                                    aktif
                                                        ? 'bg-brand-50/80 font-bold text-brand-900'
                                                        : 'text-ink-800 hover:bg-surface'
                                                }`}
                                            >
                                                <span className="truncate pr-2">
                                                    {r.kode_ruangan || `FTI-${r.nomor_ruangan}`} • {r.nama_ruangan}
                                                </span>
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

                    {/* Quick Selection Toolbar */}
                    <div className="mt-3 flex items-center justify-between text-xs border-b border-line pb-2.5">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePilihSemuaDiModal}
                                className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 hover:bg-brand-100 transition"
                            >
                                ✓ Pilih Semua ({asetTersaringModal.length})
                            </button>
                            <button
                                type="button"
                                onClick={handleBatalSemuaDiModal}
                                className="rounded-full bg-surface px-2.5 py-1 font-medium text-ink-600 hover:bg-line transition"
                            >
                                ✕ Kosongkan Pilihan
                            </button>
                        </div>
                        <span className="text-ink-500 font-medium">
                            Ditemukan {asetTersaringModal.length} aset
                        </span>
                    </div>

                    {/* Daftar Aset Checkbox Berbentuk Kartu Rapi */}
                    <div className="mt-3 max-h-72 divide-y divide-line/60 overflow-y-auto rounded-xl border border-line bg-surface/20">
                        {asetTersaringModal.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-sm font-medium text-ink-600">Tidak ada aset yang cocok.</p>
                                <p className="text-xs text-ink-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter ruangan.</p>
                            </div>
                        ) : (
                            asetTersaringModal.map((a) => {
                                const aktif = idTerpilih.includes(a.id_aset);
                                return (
                                    <label
                                        key={a.id_aset}
                                        className={`flex cursor-pointer items-center justify-between p-3.5 transition ${
                                            aktif
                                                ? 'bg-brand-50/50 hover:bg-brand-50/80'
                                                : 'bg-white hover:bg-surface/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={aktif}
                                                onChange={() => togglePilihAset(a.id_aset)}
                                                className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-brand-800 bg-brand-100/60 px-1.5 py-0.5 rounded">
                                                        {a.kode_aset}
                                                    </span>
                                                    <span className="text-xs text-ink-500 truncate">
                                                        {a.kategori}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-ink-900 mt-0.5 truncate">
                                                    {a.nama_barang}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="ml-3 flex-shrink-0 text-xs font-medium text-ink-600 bg-white border border-line px-2.5 py-1 rounded-lg shadow-2xs">
                                            {a.lokasi}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>

                    {/* Tombol Aksi Modal */}
                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
                        <SecondaryButton onClick={() => setTampilModalPilih(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={() => setTampilModalPilih(false)}
                            className="bg-brand-700 hover:bg-brand-800 px-4 py-2"
                        >
                            Terapkan Pilihan ({idTerpilih.length})
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
