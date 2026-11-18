import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function formatRupiah(angka) {
    if (angka === null || angka === undefined || isNaN(angka)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(angka);
}

function formatTanggal(tanggalString) {
    if (!tanggalString) return '-';
    try {
        const d = new Date(tanggalString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(d);
    } catch {
        return tanggalString;
    }
}

function getBadgeJalur(jalur) {
    switch (jalur) {
        case 'sharing_internal':
            return <Badge nada="info">Sharing Internal UNAND</Badge>;
        case 'hibah_luar':
        case 'hibah':
            return <Badge nada="sukses">Hibah Pihak Luar</Badge>;
        case 'penjualan_lelang':
        case 'penjualan':
            return <Badge nada="peringatan">Penjualan / Lelang</Badge>;
        default:
            return <Badge nada="netral">{jalur || 'Belum dipilih'}</Badge>;
    }
}

export default function PenghapusanIndex({
    antreanPenghapusan = [],
    riwayatPenghapusan,
    statistik = {},
    filters = {},
}) {
    const { flash } = usePage().props;

    const [tabAktif, setTabAktif] = useState('antrean'); // 'antrean' | 'riwayat'
    const [q, setQ] = useState(filters.q || '');
    const isFirstRender = useRef(true);

    // Modal Eksekusi 3 Jalur
    const [modalEksekusiBuka, setModalEksekusiBuka] = useState(false);
    const [pengajuanEksekusi, setPengajuanEksekusi] = useState(null);

    // Modal Detail Riwayat
    const [modalDetailBuka, setModalDetailBuka] = useState(false);
    const [detailPengajuan, setDetailPengajuan] = useState(null);

    // Form Eksekusi Inertia
    const formEksekusi = useForm({
        jalur_penghapusan: 'sharing_internal',
        tanggal_penghapusan: new Date().toISOString().slice(0, 10),
        pihak_penerima: '',
        nomor_persetujuan_rektor: '',
        catatan_tim_peneliti: '',
        catatan_tim_penilai: '',
        nilai_taksiran: '',
        dokumen_sk: null,
    });

    // Debounced search tabel riwayat
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route('penghapusan.index'),
                { q: q || undefined },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [q]);

    // Buka Modal Eksekusi
    const handleBukaModalEksekusi = (pengajuan) => {
        setPengajuanEksekusi(pengajuan);
        formEksekusi.setData({
            jalur_penghapusan: 'sharing_internal',
            tanggal_penghapusan: new Date().toISOString().slice(0, 10),
            pihak_penerima: '',
            nomor_persetujuan_rektor: '',
            catatan_tim_peneliti: '',
            catatan_tim_penilai: '',
            nilai_taksiran: '',
            dokumen_sk: null,
        });
        formEksekusi.clearErrors();
        setModalEksekusiBuka(true);
    };

    // Submit eksekusi penghapusan
    const handleSubmitEksekusi = (e) => {
        e.preventDefault();
        if (!pengajuanEksekusi) return;

        formEksekusi.post(route('penghapusan.proses', pengajuanEksekusi.id_pengajuan), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setModalEksekusiBuka(false);
                setPengajuanEksekusi(null);
            },
        });
    };

    // Buka modal detail riwayat
    const handleBukaDetail = (pengajuan) => {
        setDetailPengajuan(pengajuan);
        setModalDetailBuka(true);
    };

    // Columns tabel riwayat
    const kolomRiwayat = [
        {
            header: 'Pengajuan',
            render: (row) => (
                <div>
                    <span className="font-semibold text-ink-900">{row.nomor_pengajuan}</span>
                    <p className="text-xs text-ink-500">{formatTanggal(row.tanggal_pengajuan)}</p>
                </div>
            ),
        },
        {
            header: 'Pemohon / Unit',
            render: (row) => (
                <div>
                    <p className="font-medium text-ink-800">{row.pemohon?.nama_lengkap ?? '-'}</p>
                    <p className="text-xs text-ink-500">{row.pemohon?.unit?.nama_unit ?? 'FTI'}</p>
                </div>
            ),
        },
        {
            header: 'Aset yang Dihapus',
            render: (row) => {
                const items = row.item_penghapusan || row.itemPenghapusan || [];
                return (
                    <div className="space-y-1">
                        <span className="font-semibold text-ink-900">
                            {items.length} unit aset
                        </span>
                        <div className="text-xs text-ink-600 line-clamp-1">
                            {items.map((it) => it.aset?.nama_barang).filter(Boolean).join(', ')}
                        </div>
                    </div>
                );
            },
        },
        {
            header: 'Jalur Eksekusi',
            render: (row) => {
                const itemPertama = (row.item_penghapusan || row.itemPenghapusan || [])[0];
                return getBadgeJalur(itemPertama?.jalur_penghapusan);
            },
        },
        {
            header: 'Penerima / Nilai',
            render: (row) => {
                const itemPertama = (row.item_penghapusan || row.itemPenghapusan || [])[0];
                if (!itemPertama) return '-';

                if (itemPertama.pihak_penerima) {
                    return <span className="text-sm font-medium text-ink-800">{itemPertama.pihak_penerima}</span>;
                }
                if (itemPertama.nilai_penjualan !== null && itemPertama.nilai_penjualan !== undefined) {
                    return <span className="text-sm font-semibold text-emerald-700">{formatRupiah(itemPertama.nilai_penjualan)}</span>;
                }
                return '-';
            },
        },
        {
            header: 'Aksi',
            render: (row) => (
                <SecondaryButton
                    type="button"
                    onClick={() => handleBukaDetail(row)}
                    className="text-xs"
                >
                    Lihat detail
                </SecondaryButton>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Pemrosesan Penghapusan Aset" />

            <PageHeader
                breadcrumb={['FTI', 'Penghapusan aset']}
                judul="Pemrosesan penghapusan aset"
                deskripsi="Kelola eksekusi penghapusan aset yang telah disetujui Pimpinan melalui 3 jalur resmi: Sharing Internal UNAND, Hibah Pihak Luar, atau Penjualan / Lelang."
            />

            {/* Flash Status */}
            {flash?.status && (
                <div className="mb-6">
                    <Alert nada="sukses">{flash.status}</Alert>
                </div>
            )}

            {/* StatGrid KPI */}
            <div className="mb-6">
                <StatGrid kolom={4}>
                    <StatCard
                        label="Siap diproses"
                        nilai={statistik.siap_diproses ?? 0}
                        keterangan="Disetujui Pimpinan"
                        nada="peringatan"
                    />
                    <StatCard
                        label="Menunggu persetujuan"
                        nilai={statistik.menunggu_persetujuan ?? 0}
                        keterangan="Pemeriksaan / Kepala Kantor"
                        nada="info"
                    />
                    <StatCard
                        label="Penghapusan selesai"
                        nilai={statistik.penghapusan_selesai ?? 0}
                        keterangan="Tereksekusi tuntas"
                        nada="sukses"
                    />
                    <StatCard
                        label="Total aset dihapus"
                        nilai={statistik.total_aset_dihapus ?? 0}
                        keterangan="Unit aset fisik"
                        nada="netral"
                    />
                </StatGrid>
            </div>

            {/* Tab Navigasi Meja Kerja */}
            <div className="mb-6 flex border-b border-line">
                <button
                    type="button"
                    onClick={() => setTabAktif('antrean')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                        tabAktif === 'antrean'
                            ? 'border-brand-600 text-brand-700'
                            : 'border-transparent text-ink-500 hover:text-ink-800'
                    }`}
                >
                    <span>Antrean siap eksekusi</span>
                    <Badge nada={antreanPenghapusan.length > 0 ? 'peringatan' : 'netral'}>
                        {antreanPenghapusan.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => setTabAktif('riwayat')}
                    className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                        tabAktif === 'riwayat'
                            ? 'border-brand-600 text-brand-700'
                            : 'border-transparent text-ink-500 hover:text-ink-800'
                    }`}
                >
                    <span>Riwayat penghapusan selesai</span>
                    <Badge nada="netral">{riwayatPenghapusan?.total ?? 0}</Badge>
                </button>
            </div>

            {/* Konten Tab 1: Antrean Penghapusan Siap Diproses */}
            {tabAktif === 'antrean' && (
                <div className="space-y-6">
                    {antreanPenghapusan.length === 0 ? (
                        <Card>
                            <IsiKartu>
                                <EmptyState
                                    judul="Tidak ada penghapusan yang siap diproses"
                                    deskripsi="Saat ini belum ada pengajuan penghapusan aset dengan status 'Disetujui Pimpinan' yang menunggu eksekusi jalur penghapusan."
                                />
                            </IsiKartu>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {antreanPenghapusan.map((pengajuan) => {
                                const items = pengajuan.item_penghapusan || pengajuan.itemPenghapusan || [];
                                return (
                                    <Card
                                        key={pengajuan.id_pengajuan}
                                        className="overflow-hidden border-brand-200 shadow-sm"
                                    >
                                        <div className="border-b border-line bg-surface/60 px-5 py-3">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <Badge nada="sukses">Disetujui Pimpinan</Badge>
                                                    <span className="font-bold text-ink-900">
                                                        {pengajuan.nomor_pengajuan}
                                                    </span>
                                                    <span className="text-xs text-ink-500">
                                                        Diajukan: {formatTanggal(pengajuan.tanggal_pengajuan)}
                                                    </span>
                                                </div>
                                                <PrimaryButton
                                                    type="button"
                                                    onClick={() => handleBukaModalEksekusi(pengajuan)}
                                                    className="text-xs"
                                                >
                                                    Eksekusi penghapusan aset →
                                                </PrimaryButton>
                                            </div>
                                        </div>

                                        <IsiKartu className="space-y-4">
                                            {/* Info Ringkas Pemohon & Alasan */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                                <div>
                                                    <span className="text-ink-500">Pemohon:</span>
                                                    <p className="font-semibold text-ink-800">
                                                        {pengajuan.pemohon?.nama_lengkap ?? '-'}
                                                    </p>
                                                    <p className="text-ink-500">
                                                        {pengajuan.pemohon?.unit?.nama_unit ?? 'Fakultas Teknologi Informasi'}
                                                    </p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <span className="text-ink-500">Keterangan / Alasan Usulan:</span>
                                                    <p className="text-ink-800 line-clamp-2">
                                                        {pengajuan.keterangan || '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Rincian Aset yang Diusulkan */}
                                            <div className="rounded-lg border border-line bg-surface/30 p-3">
                                                <p className="text-xs font-semibold text-ink-700 mb-2">
                                                    Daftar Aset ({items.length} unit):
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {items.map((it) => (
                                                        <div
                                                            key={it.id_item_penghapusan}
                                                            className="rounded border border-line bg-white p-2.5 text-xs shadow-xs"
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <p className="font-bold text-ink-900">
                                                                        {it.aset?.nama_barang}
                                                                    </p>
                                                                    <p className="text-[11px] font-mono text-ink-500">
                                                                        {it.aset?.kode_aset}
                                                                    </p>
                                                                </div>
                                                                <Badge nada="peringatan" className="capitalize">
                                                                    {it.aset?.kondisi || 'rusak'}
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-2 text-[11px] text-ink-600">
                                                                <p>Kategori: {it.aset?.kategori?.nama_kategori ?? '-'}</p>
                                                                <p>Perolehan: {formatRupiah(it.aset?.harga_perolehan)} ({it.aset?.tahun_perolehan ?? '-'})</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Lampiran Dokumen Pemohon */}
                                            {pengajuan.dokumen && pengajuan.dokumen.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line text-xs">
                                                    <span className="text-ink-500 font-medium">Dokumen Usulan:</span>
                                                    {pengajuan.dokumen.map((doc) => (
                                                        <a
                                                            key={doc.id_dokumen}
                                                            href={route('dokumen.unduh', doc.id_dokumen)}
                                                            className="inline-flex items-center gap-1 rounded bg-surface px-2.5 py-1 font-medium text-brand-700 hover:text-brand-900 hover:bg-brand-50 border border-line"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <span className="text-ink-500">📎</span>
                                                            <span>{doc.nama_file}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </IsiKartu>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Konten Tab 2: Riwayat Penghapusan Selesai */}
            {tabAktif === 'riwayat' && (
                <div className="space-y-4">
                    <Card>
                        <IsiKartu>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <SearchInput
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Cari nomor pengajuan, nama barang, penerima..."
                                    className="w-full sm:w-80 text-sm"
                                />
                                <span className="text-xs text-ink-500">
                                    Total data: {riwayatPenghapusan?.total ?? 0}
                                </span>
                            </div>

                            <DataTable
                                columns={kolomRiwayat}
                                data={riwayatPenghapusan?.data || []}
                                emptyState={
                                    <EmptyState
                                        judul="Belum ada riwayat penghapusan"
                                        deskripsi="Belum ada pengajuan penghapusan aset yang telah diselesaikan eksekusinya."
                                    />
                                }
                            />

                            {riwayatPenghapusan && riwayatPenghapusan.links && (
                                <div className="mt-4 border-t border-line pt-4">
                                    <Pagination links={riwayatPenghapusan.links} />
                                </div>
                            )}
                        </IsiKartu>
                    </Card>
                </div>
            )}

            {/* Modal Form Eksekusi Penghapusan 3 Jalur */}
            <Modal
                show={modalEksekusiBuka}
                onClose={() => setModalEksekusiBuka(false)}
                maxWidth="3xl"
            >
                {pengajuanEksekusi && (
                    <form onSubmit={handleSubmitEksekusi} className="p-6">
                        <div className="border-b border-line pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Badge nada="sukses" className="mb-1">Eksekusi Penghapusan</Badge>
                                    <h3 className="text-lg font-bold text-ink-900">
                                        Pemrosesan Penghapusan — {pengajuanEksekusi.nomor_pengajuan}
                                    </h3>
                                    <p className="text-xs text-ink-500">
                                        Pemohon: {pengajuanEksekusi.pemohon?.nama_lengkap} • {pengajuanEksekusi.pemohon?.unit?.nama_unit ?? 'FTI'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalEksekusiBuka(false)}
                                    className="text-ink-400 hover:text-ink-700 text-lg"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 space-y-5 max-h-[72vh] overflow-y-auto pr-1">
                            {/* Pilihan 3 Jalur Penghapusan */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                                    Pilih Jalur Eksekusi Penghapusan Resmi *:
                                </label>
                                <p className="text-[11px] text-ink-500 mb-3">
                                    Tentukan jalur penghapusan yang telah disepakati dan disetujui oleh Pimpinan Fakultas & Rektorat Universitas Andalas.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Jalur 1: Sharing Internal */}
                                    <div
                                        onClick={() => formEksekusi.setData('jalur_penghapusan', 'sharing_internal')}
                                        className={`cursor-pointer rounded-lg border p-3.5 transition-all text-xs flex flex-col justify-between ${
                                            formEksekusi.data.jalur_penghapusan === 'sharing_internal'
                                                ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-500 shadow-sm'
                                                : 'border-line bg-surface/40 hover:bg-surface'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-ink-900">1. Sharing Internal</span>
                                                <input
                                                    type="radio"
                                                    checked={formEksekusi.data.jalur_penghapusan === 'sharing_internal'}
                                                    onChange={() => formEksekusi.setData('jalur_penghapusan', 'sharing_internal')}
                                                    className="text-brand-600 focus:ring-brand-500"
                                                />
                                            </div>
                                            <p className="text-[11px] text-ink-600 mt-1">
                                                Pengalihan aset ke unit kerja, departemen, atau laboratorium lain di lingkungan UNAND.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Jalur 2: Hibah Pihak Luar */}
                                    <div
                                        onClick={() => formEksekusi.setData('jalur_penghapusan', 'hibah_luar')}
                                        className={`cursor-pointer rounded-lg border p-3.5 transition-all text-xs flex flex-col justify-between ${
                                            formEksekusi.data.jalur_penghapusan === 'hibah_luar'
                                                ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-500 shadow-sm'
                                                : 'border-line bg-surface/40 hover:bg-surface'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-ink-900">2. Hibah Pihak Luar</span>
                                                <input
                                                    type="radio"
                                                    checked={formEksekusi.data.jalur_penghapusan === 'hibah_luar'}
                                                    onChange={() => formEksekusi.setData('jalur_penghapusan', 'hibah_luar')}
                                                    className="text-brand-600 focus:ring-brand-500"
                                                />
                                            </div>
                                            <p className="text-[11px] text-ink-600 mt-1">
                                                Penyerahan aset kepada sekolah, yayasan, atau institusi eksternal nirlaba.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Jalur 3: Penjualan / Lelang */}
                                    <div
                                        onClick={() => formEksekusi.setData('jalur_penghapusan', 'penjualan_lelang')}
                                        className={`cursor-pointer rounded-lg border p-3.5 transition-all text-xs flex flex-col justify-between ${
                                            formEksekusi.data.jalur_penghapusan === 'penjualan_lelang'
                                                ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-500 shadow-sm'
                                                : 'border-line bg-surface/40 hover:bg-surface'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-ink-900">3. Penjualan / Lelang</span>
                                                <input
                                                    type="radio"
                                                    checked={formEksekusi.data.jalur_penghapusan === 'penjualan_lelang'}
                                                    onChange={() => formEksekusi.setData('jalur_penghapusan', 'penjualan_lelang')}
                                                    className="text-brand-600 focus:ring-brand-500"
                                                />
                                            </div>
                                            <p className="text-[11px] text-ink-600 mt-1">
                                                Pelelangan/penjualan aset rusak berat/tidak ekonomis melalui panitia lelang universitas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Input Dinamis Berdasarkan Jalur yang Dipilih */}
                            <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-4 space-y-4">
                                <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wide">
                                    Kelengkapan Data: {formEksekusi.data.jalur_penghapusan === 'sharing_internal' ? 'Sharing Internal UNAND' : formEksekusi.data.jalur_penghapusan === 'hibah_luar' ? 'Hibah Pihak Luar' : 'Penjualan / Lelang Resmi'}
                                </h4>

                                {(formEksekusi.data.jalur_penghapusan === 'sharing_internal' || formEksekusi.data.jalur_penghapusan === 'hibah_luar') && (
                                    <Field
                                        label={formEksekusi.data.jalur_penghapusan === 'sharing_internal' ? 'Unit / Fakultas / Lembaga Penerima (UNAND) *' : 'Nama Instansi / Yayasan / Organisasi Penerima *'}
                                        wajib
                                        error={formEksekusi.errors.pihak_penerima}
                                    >
                                        <TextInput
                                            value={formEksekusi.data.pihak_penerima}
                                            onChange={(e) => formEksekusi.setData('pihak_penerima', e.target.value)}
                                            placeholder={formEksekusi.data.jalur_penghapusan === 'sharing_internal' ? 'Contoh: Laboratorium Sistem Informasi FTI / Fakultas Kedokteran' : 'Contoh: Yayasan Pendidikan Bina Bangsa / SMKN 1 Padang'}
                                            className="w-full text-sm"
                                        />
                                    </Field>
                                )}

                                {formEksekusi.data.jalur_penghapusan === 'penjualan_lelang' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field
                                                label="Kajian Tim Peneliti Fakultas *"
                                                wajib
                                                error={formEksekusi.errors.catatan_tim_peneliti}
                                            >
                                                <textarea
                                                    rows={3}
                                                    value={formEksekusi.data.catatan_tim_peneliti}
                                                    onChange={(e) => formEksekusi.setData('catatan_tim_peneliti', e.target.value)}
                                                    placeholder="Tuliskan ringkasan hasil pemeriksaan fisik tim peneliti internal..."
                                                    className="w-full rounded-md border-line text-xs shadow-xs focus:border-brand-500 focus:ring-brand-500"
                                                />
                                            </Field>

                                            <Field
                                                label="Catatan Tim Penilai Rektorat / BMN *"
                                                wajib
                                                error={formEksekusi.errors.catatan_tim_penilai}
                                            >
                                                <textarea
                                                    rows={3}
                                                    value={formEksekusi.data.catatan_tim_penilai}
                                                    onChange={(e) => formEksekusi.setData('catatan_tim_penilai', e.target.value)}
                                                    placeholder="Tuliskan rekomendasi penilaian taksiran dan kelayakan lelang dari Rektorat..."
                                                    className="w-full rounded-md border-line text-xs shadow-xs focus:border-brand-500 focus:ring-brand-500"
                                                />
                                            </Field>
                                        </div>

                                        <Field
                                            label="Nilai Taksiran / Nilai Perolehan Lelang (Rp) *"
                                            wajib
                                            error={formEksekusi.errors.nilai_taksiran}
                                        >
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={formEksekusi.data.nilai_taksiran}
                                                onChange={(e) => formEksekusi.setData('nilai_taksiran', e.target.value)}
                                                placeholder="Contoh: 1500000"
                                                className="w-full text-sm font-mono"
                                            />
                                        </Field>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field
                                        label="Tanggal Efektif Eksekusi *"
                                        wajib
                                        error={formEksekusi.errors.tanggal_penghapusan}
                                    >
                                        <TextInput
                                            type="date"
                                            value={formEksekusi.data.tanggal_penghapusan}
                                            onChange={(e) => formEksekusi.setData('tanggal_penghapusan', e.target.value)}
                                            className="w-full text-sm"
                                        />
                                    </Field>

                                    <Field
                                        label="Nomor SK / Penetapan Rektorat (opsional)"
                                        error={formEksekusi.errors.nomor_persetujuan_rektor}
                                    >
                                        <TextInput
                                            value={formEksekusi.data.nomor_persetujuan_rektor}
                                            onChange={(e) => formEksekusi.setData('nomor_persetujuan_rektor', e.target.value)}
                                            placeholder="Contoh: 142/UN16.R/HK.02/2026"
                                            className="w-full text-sm"
                                        />
                                    </Field>
                                </div>

                                <Field
                                    label="Unggah Berkas SK / BAST / Berita Acara Eksekusi (opsional)"
                                    error={formEksekusi.errors.dokumen_sk}
                                >
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => formEksekusi.setData('dokumen_sk', e.target.files[0] || null)}
                                        className="w-full text-xs text-ink-600 file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-50"
                                    />
                                    <p className="mt-1 text-[11px] text-ink-500">
                                        Format PDF, JPG, atau PNG (maks 5MB). Berkas akan disimpan sebagai dokumen pendukung resmi penghapusan.
                                    </p>
                                </Field>
                            </div>

                            {/* Peringatan Dampak Master Aset */}
                            <Alert nada="bahaya">
                                <div className="text-xs">
                                    <p className="font-bold">Konfirmasi Perubahan Status Master Aset:</p>
                                    <p className="mt-1">
                                        Setelah formulir ini disimpan, status seluruh unit aset pada usulan ini ({((pengajuanEksekusi.item_penghapusan || pengajuanEksekusi.itemPenghapusan || []).length)} unit) akan diubah menjadi <span className="font-bold">Dihapuskan</span>, kondisi diubah menjadi <span className="font-bold">Rusak Berat</span>, dan penempatan aktif ruangan akan ditutup secara permanen.
                                    </p>
                                </div>
                            </Alert>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                            <SecondaryButton
                                type="button"
                                onClick={() => setModalEksekusiBuka(false)}
                                disabled={formEksekusi.processing}
                            >
                                Batal
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                disabled={formEksekusi.processing}
                            >
                                {formEksekusi.processing ? 'Menyimpan...' : 'Konfirmasi & Eksekusi Penghapusan'}
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Detail Riwayat Penghapusan */}
            <Modal
                show={modalDetailBuka}
                onClose={() => setModalDetailBuka(false)}
                maxWidth="3xl"
            >
                {detailPengajuan && (
                    <div className="p-6 space-y-5">
                        <div className="border-b border-line pb-4 flex items-center justify-between">
                            <div>
                                <Badge nada="sukses" className="mb-1">Penghapusan Selesai</Badge>
                                <h3 className="text-lg font-bold text-ink-900">
                                    Detail Penghapusan — {detailPengajuan.nomor_pengajuan}
                                </h3>
                                <p className="text-xs text-ink-500">
                                    Diajukan: {formatTanggal(detailPengajuan.tanggal_pengajuan)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalDetailBuka(false)}
                                className="text-ink-400 hover:text-ink-700 text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
                            {/* Data Pemohon & Keterangan */}
                            <InfoList
                                data={[
                                    {
                                        label: 'Pemohon',
                                        value: `${detailPengajuan.pemohon?.nama_lengkap ?? '-'} (${detailPengajuan.pemohon?.nip ?? '-'})`,
                                    },
                                    {
                                        label: 'Unit Pemohon',
                                        value: detailPengajuan.pemohon?.unit?.nama_unit ?? 'Fakultas Teknologi Informasi',
                                    },
                                    {
                                        label: 'Perihal & Alasan Usulan',
                                        value: detailPengajuan.keterangan || '-',
                                    },
                                ]}
                            />

                            {/* Ringkasan Hasil Eksekusi */}
                            {(() => {
                                const itemPertama = (detailPengajuan.item_penghapusan || detailPengajuan.itemPenghapusan || [])[0];
                                return (
                                    <div className="rounded-lg border border-line bg-surface/40 p-3.5 space-y-2">
                                        <p className="font-bold text-ink-900 uppercase tracking-wider text-[11px]">
                                            Hasil Eksekusi Penghapusan:
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-ink-500">Jalur Penghapusan:</span>
                                                <div className="mt-1">{getBadgeJalur(itemPertama?.jalur_penghapusan)}</div>
                                            </div>
                                            <div>
                                                <span className="text-ink-500">Tanggal Eksekusi:</span>
                                                <p className="font-semibold text-ink-800 mt-1">
                                                    {formatTanggal(itemPertama?.tanggal_penghapusan)}
                                                </p>
                                            </div>
                                            {itemPertama?.pihak_penerima && (
                                                <div className="md:col-span-2">
                                                    <span className="text-ink-500">Pihak Penerima:</span>
                                                    <p className="font-semibold text-ink-800 mt-1">
                                                        {itemPertama.pihak_penerima}
                                                    </p>
                                                </div>
                                            )}
                                            {itemPertama?.nilai_penjualan !== null && itemPertama?.nilai_penjualan !== undefined && (
                                                <div>
                                                    <span className="text-ink-500">Nilai Perolehan / Lelang:</span>
                                                    <p className="font-bold text-emerald-700 text-sm mt-1">
                                                        {formatRupiah(itemPertama.nilai_penjualan)}
                                                    </p>
                                                </div>
                                            )}
                                            {itemPertama?.catatan_tim_penilai && (
                                                <div className="md:col-span-2">
                                                    <span className="text-ink-500">Catatan Penilaian & Penetapan:</span>
                                                    <p className="whitespace-pre-line text-ink-700 mt-1 font-mono text-[11px] bg-white p-2 rounded border border-line">
                                                        {itemPertama.catatan_tim_penilai}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Daftar Aset */}
                            <div>
                                <p className="font-bold text-ink-900 mb-2">
                                    Daftar Aset yang Telah Dihapus ({((detailPengajuan.item_penghapusan || detailPengajuan.itemPenghapusan || []).length)} unit):
                                </p>
                                <div className="space-y-2">
                                    {(detailPengajuan.item_penghapusan || detailPengajuan.itemPenghapusan || []).map((it) => (
                                        <div
                                            key={it.id_item_penghapusan}
                                            className="rounded border border-line bg-white p-2.5 flex items-center justify-between"
                                        >
                                            <div>
                                                <span className="font-semibold text-ink-900">{it.aset?.nama_barang}</span>
                                                <span className="font-mono text-ink-500 ml-2">({it.aset?.kode_aset})</span>
                                                <p className="text-[11px] text-ink-500">
                                                    Kategori: {it.aset?.kategori?.nama_kategori ?? '-'} • Nilai Buku Awal: {formatRupiah(it.aset?.harga_perolehan)}
                                                </p>
                                            </div>
                                            <Badge nada="bahaya">Dihapuskan</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dokumen Lampiran */}
                            {detailPengajuan.dokumen && detailPengajuan.dokumen.length > 0 && (
                                <div>
                                    <p className="font-bold text-ink-900 mb-2">Dokumen Berkas:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {detailPengajuan.dokumen.map((doc) => (
                                            <a
                                                key={doc.id_dokumen}
                                                href={route('dokumen.unduh', doc.id_dokumen)}
                                                className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-3 py-1.5 font-medium text-brand-700 hover:text-brand-900 hover:bg-brand-50"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <span>📎</span>
                                                <span>{doc.nama_file}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end border-t border-line pt-4">
                            <SecondaryButton
                                type="button"
                                onClick={() => setModalDetailBuka(false)}
                            >
                                Tutup
                            </SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
