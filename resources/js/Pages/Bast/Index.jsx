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
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

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

function getBadgeJenis(jenis) {
    switch (jenis) {
        case 'penerimaan':
            return <Badge nada="sukses">Penerimaan</Badge>;
        case 'mutasi':
            return <Badge nada="info">Mutasi</Badge>;
        case 'hibah':
            return <Badge nada="peringatan">Hibah</Badge>;
        case 'penjualan':
            return <Badge nada="bahaya">Penjualan / Lelang</Badge>;
        default:
            return <Badge nada="netral">{jenis || '-'}</Badge>;
    }
}

export default function BastIndex({
    daftarBast,
    transaksiSiapBast = {},
    statistik = {},
    filters = {},
}) {
    const { flash } = usePage().props;

    // Filter state
    const [q, setQ] = useState(filters.q || '');
    const [filterJenis, setFilterJenis] = useState(filters.jenis || 'semua');
    const [filterTahun, setFilterTahun] = useState(filters.tahun || 'semua');
    const [filterStatus, setFilterStatus] = useState(filters.status || 'semua');
    const isFirstRender = useRef(true);

    // BAST Terpilih untuk Pratinjau Dokumen (Frame Figma 12)
    const [bastTerpilih, setBastTerpilih] = useState(
        daftarBast?.data && daftarBast.data.length > 0 ? daftarBast.data[0] : null
    );

    // Modal Buat BAST
    const [modalBuatBuka, setModalBuatBuka] = useState(false);
    const [jenisPilihan, setJenisPilihan] = useState('penerimaan');
    const [transaksiPilihanId, setTransaksiPilihanId] = useState('');

    const formBuat = useForm({
        jenis_bast: 'penerimaan',
        id_penerimaan: '',
        id_pengajuan: '',
        tanggal_bast: new Date().toISOString().slice(0, 10),
        pihak_pertama: '',
        pihak_kedua: '',
        keterangan: '',
        items: [],
    });

    // Modal Arsipkan / Unggah BAST Bertanda Tangan
    const [modalArsipBuka, setModalArsipBuka] = useState(false);
    const [bastUntukArsip, setBastUntukArsip] = useState(null);

    const formArsip = useForm({
        file_bast: null,
        catatan_arsip: '',
    });

    // Sync BAST terpilih jika data berubah
    useEffect(() => {
        if (daftarBast?.data && daftarBast.data.length > 0) {
            if (!bastTerpilih || !daftarBast.data.some((b) => b.id_bast === bastTerpilih.id_bast)) {
                setBastTerpilih(daftarBast.data[0]);
            } else {
                const refreshed = daftarBast.data.find((b) => b.id_bast === bastTerpilih.id_bast);
                if (refreshed) setBastTerpilih(refreshed);
            }
        } else {
            setBastTerpilih(null);
        }
    }, [daftarBast]);

    // Live search & filters debounced
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route('bast.index'),
                {
                    q: q || undefined,
                    jenis: filterJenis !== 'semua' ? filterJenis : undefined,
                    tahun: filterTahun !== 'semua' ? filterTahun : undefined,
                    status: filterStatus !== 'semua' ? filterStatus : undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [q, filterJenis, filterTahun, filterStatus]);

    // Buka Modal Buat BAST
    const handleBukaModalBuat = (jenisAwal = 'penerimaan') => {
        setJenisPilihan(jenisAwal);
        setTransaksiPilihanId('');
        formBuat.setData({
            jenis_bast: jenisAwal,
            id_penerimaan: '',
            id_pengajuan: '',
            tanggal_bast: new Date().toISOString().slice(0, 10),
            pihak_pertama: '',
            pihak_kedua: '',
            keterangan: '',
            items: [],
        });
        formBuat.clearErrors();
        setModalBuatBuka(true);
    };

    // Saat Jenis BAST berubah di modal buat
    const handleGantiJenisBuat = (jenis) => {
        setJenisPilihan(jenis);
        setTransaksiPilihanId('');
        formBuat.setData({
            ...formBuat.data,
            jenis_bast: jenis,
            id_penerimaan: '',
            id_pengajuan: '',
            pihak_pertama: '',
            pihak_kedua: '',
            keterangan: '',
            items: [],
        });
    };

    // Saat Transaksi Referensi dipilih
    const handlePilihTransaksi = (idRef) => {
        setTransaksiPilihanId(idRef);
        const list = transaksiSiapBast[jenisPilihan] || [];
        const selected = list.find((t) => String(t.id_referensi) === String(idRef));

        if (selected) {
            formBuat.setData({
                ...formBuat.data,
                id_penerimaan: selected.jenis === 'penerimaan' ? selected.id_referensi : '',
                id_pengajuan: selected.id_pengajuan || (selected.jenis !== 'penerimaan' ? selected.id_referensi : ''),
                pihak_pertama: selected.pihak_pertama_default || '',
                pihak_kedua: selected.pihak_kedua_default || '',
                keterangan: selected.keterangan_default || '',
                items: selected.items || [],
            });
        }
    };

    // Submit pembuatan Draf BAST
    const handleSubmitBuat = (e) => {
        e.preventDefault();
        formBuat.post(route('bast.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setModalBuatBuka(false);
            },
        });
    };

    // Buka Modal Unggah Arsip Bertanda Tangan
    const handleBukaModalArsip = (bast) => {
        setBastUntukArsip(bast);
        formArsip.setData({
            file_bast: null,
            catatan_arsip: '',
        });
        formArsip.clearErrors();
        setModalArsipBuka(true);
    };

    // Submit Arsip Bertanda Tangan
    const handleSubmitArsip = (e) => {
        e.preventDefault();
        if (!bastUntukArsip) return;

        formArsip.post(route('bast.arsipkan', bastUntukArsip.id_bast), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setModalArsipBuka(false);
                setBastUntukArsip(null);
            },
        });
    };

    // Kolom Tabel BAST
    const kolomTabel = [
        {
            header: 'Nomor BAST',
            render: (row) => (
                <div
                    className="cursor-pointer"
                    onClick={() => setBastTerpilih(row)}
                >
                    <span className="font-bold text-ink-900 hover:text-brand-700">
                        {row.nomor_bast}
                    </span>
                    <p className="text-[11px] text-ink-500">{formatTanggal(row.tanggal_bast)}</p>
                </div>
            ),
        },
        {
            header: 'Jenis',
            render: (row) => getBadgeJenis(row.jenis_bast),
        },
        {
            header: 'Referensi',
            render: (row) => {
                if (row.penerimaan) {
                    return (
                        <div>
                            <span className="font-medium text-ink-800">Nota: {row.penerimaan.nomor_nota}</span>
                            <p className="text-[11px] text-ink-500">{row.penerimaan.vendor?.nama_vendor ?? '-'}</p>
                        </div>
                    );
                }
                if (row.pengajuan) {
                    return (
                        <div>
                            <span className="font-medium text-ink-800">{row.pengajuan.nomor_pengajuan}</span>
                            <p className="text-[11px] text-ink-500">{row.pengajuan.pemohon?.unit?.nama_unit ?? 'FTI'}</p>
                        </div>
                    );
                }
                return <span className="text-ink-400">-</span>;
            },
        },
        {
            header: 'Status',
            render: (row) => (
                row.status === 'selesai' ? (
                    <Badge nada="sukses">Selesai (Arsip)</Badge>
                ) : (
                    <Badge nada="peringatan">Draf</Badge>
                )
            ),
        },
        {
            header: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setBastTerpilih(row)}
                        className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                            bastTerpilih?.id_bast === row.id_bast
                                ? 'bg-brand-100 text-brand-800'
                                : 'bg-surface text-ink-600 hover:bg-surface-elevated'
                        }`}
                        title="Tampilkan Pratinjau Dokumen"
                    >
                        Pratinjau
                    </button>
                    <a
                        href={route('bast.pdf', row.id_bast) + '?mode=unduh'}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-surface px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 border border-line"
                        title="Unduh Formulir PDF"
                    >
                        PDF
                    </a>
                    {row.status === 'draft' ? (
                        <button
                            type="button"
                            onClick={() => handleBukaModalArsip(row)}
                            className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                            title="Unggah BAST Bertanda Tangan"
                        >
                            Unggah Arsip
                        </button>
                    ) : row.dokumen ? (
                        <a
                            href={route('dokumen.unduh', row.dokumen.id_dokumen)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            title="Unduh Scan Bertanda Tangan"
                        >
                            Scan Arsip
                        </a>
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Pembuatan dan Arsip BAST" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <PageHeader
                    breadcrumb={['FTI', 'Arsip BAST']}
                    judul="Pembuatan dan arsip BAST"
                    deskripsi="Susun berita acara serah terima resmi dan simpan dokumen final bertanda tangan secara tertelusur."
                />

                <PrimaryButton
                    type="button"
                    onClick={() => handleBukaModalBuat('penerimaan')}
                    className="self-start sm:self-auto shrink-0"
                >
                    + Buat BAST
                </PrimaryButton>
            </div>

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
                        label="Total BAST"
                        nilai={statistik.total_bast ?? 0}
                        keterangan="Seluruh transaksi"
                        nada="netral"
                    />
                    <StatCard
                        label="Draf menunggu tanda tangan"
                        nilai={statistik.draf_menunggu ?? 0}
                        keterangan="Perlu arsip scan"
                        nada="peringatan"
                    />
                    <StatCard
                        label="Arsip final selesai"
                        nilai={statistik.arsip_selesai ?? 0}
                        keterangan="Bermaterai & sah"
                        nada="sukses"
                    />
                    <StatCard
                        label="Rincian jenis BAST"
                        nilai={`${statistik.penerimaan ?? 0}P • ${statistik.mutasi ?? 0}M • ${(statistik.hibah ?? 0) + (statistik.penjualan ?? 0)}H`}
                        keterangan="Penerimaan • Mutasi • Hapus"
                        nada="info"
                    />
                </StatGrid>
            </div>

            {/* KARTU ATAS — Daftar Arsip Berita Acara */}
            <div className="mb-8 space-y-4">
                <Card>
                    <IsiKartu>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <h3 className="font-bold text-ink-900 text-sm">
                                Daftar Arsip Berita Acara Serah Terima
                            </h3>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center gap-2">
                                <SearchInput
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Cari nomor BAST, pihak, barang..."
                                    className="w-full sm:w-64 text-xs"
                                />

                                <SelectInput
                                    value={filterJenis}
                                    onChange={(e) => setFilterJenis(e.target.value)}
                                    className="text-xs"
                                >
                                    <option value="semua">Semua jenis</option>
                                    <option value="penerimaan">Penerimaan</option>
                                    <option value="mutasi">Mutasi</option>
                                    <option value="hibah">Hibah</option>
                                    <option value="penjualan">Penjualan / Lelang</option>
                                </SelectInput>

                                <SelectInput
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="text-xs"
                                >
                                    <option value="semua">Semua status</option>
                                    <option value="draft">Draf (Menunggu tanda tangan)</option>
                                    <option value="selesai">Selesai (Diarsipkan)</option>
                                </SelectInput>

                                <SelectInput
                                    value={filterTahun}
                                    onChange={(e) => setFilterTahun(e.target.value)}
                                    className="text-xs"
                                >
                                    <option value="semua">Semua tahun</option>
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                </SelectInput>
                            </div>
                        </div>

                        <DataTable
                            columns={kolomTabel}
                            data={daftarBast?.data || []}
                            emptyState={
                                <EmptyState
                                    judul="Data tidak ditemukan"
                                    deskripsi="Tidak ada arsip berita acara yang sesuai dengan kriteria pencarian atau filter yang dipilih."
                                />
                            }
                        />

                        {daftarBast?.links && (
                            <div className="mt-4 border-t border-line pt-4">
                                <Pagination links={daftarBast.links} />
                            </div>
                        )}
                    </IsiKartu>
                </Card>
            </div>

            {/* KARTU BAWAH — Pratinjau Dokumen Resmi BAST (Frame Figma 12) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-ink-900">
                            Pratinjau Dokumen Berita Acara
                        </h3>
                        <p className="text-xs text-ink-500">
                            Tampilan visual format resmi BAST sesuai standar kop Fakultas Teknologi Informasi Universitas Andalas.
                        </p>
                    </div>

                    {bastTerpilih && (
                        <div className="flex items-center gap-2">
                            <a
                                href={route('bast.pdf', bastTerpilih.id_bast) + '?mode=unduh'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-xs hover:bg-surface"
                            >
                                <span>📄</span>
                                <span>Unduh PDF BAST</span>
                            </a>

                            {bastTerpilih.status === 'draft' ? (
                                <PrimaryButton
                                    type="button"
                                    onClick={() => handleBukaModalArsip(bastTerpilih)}
                                    className="text-xs"
                                >
                                    Unggah BAST Bertanda Tangan
                                </PrimaryButton>
                            ) : bastTerpilih.dokumen ? (
                                <a
                                    href={route('dokumen.unduh', bastTerpilih.dokumen.id_dokumen)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                                >
                                    <span>📎</span>
                                    <span>Unduh Arsip Final</span>
                                </a>
                            ) : null}
                        </div>
                    )}
                </div>

                {!bastTerpilih ? (
                    <Card>
                        <IsiKartu>
                            <EmptyState
                                judul="Pilih atau susun BAST"
                                deskripsi="Pilih salah satu baris BAST pada tabel di atas atau klik '+ Buat BAST' untuk menampilkan format surat resmi BAST di panel ini."
                            />
                        </IsiKartu>
                    </Card>
                ) : (
                    <Card className="overflow-hidden border border-brand-200 shadow-md">
                        {/* Banner status peringatan draf */}
                        {bastTerpilih.status === 'draft' && (
                            <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-xs text-amber-900 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-amber-700">⚠️ Status Draf:</span>
                                    <span>Dokumen ini belum ditandatangani. Cetak PDF resmi, bubuhkan tanda tangan para pihak & materai, lalu unggah pindaian arsip final.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleBukaModalArsip(bastTerpilih)}
                                    className="font-bold text-amber-800 hover:underline shrink-0"
                                >
                                    Unggah Sekarang →
                                </button>
                            </div>
                        )}

                        {bastTerpilih.status === 'selesai' && (
                            <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-xs text-emerald-900 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-700">✓ Dokumen Selesai:</span>
                                    <span>Berita acara serah terima telah ditandatangani dan diarsipkan secara sah ke dalam sistem.</span>
                                </div>
                                {bastTerpilih.dokumen && (
                                    <span className="text-[11px] text-emerald-700">
                                        Berkas: {bastTerpilih.dokumen.nama_file}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Lembar Surat Resmi (Gaya Fisik A4 Kop FTI UNAND) */}
                        <div className="bg-white p-8 md:p-12 text-ink-900 font-serif leading-relaxed text-xs space-y-6 max-w-4xl mx-auto shadow-inner my-4 rounded border border-line">
                            {/* KOP SURAT */}
                            <div className="text-center border-b-4 border-double border-ink-900 pb-3 font-sans">
                                <p className="text-[11px] uppercase tracking-wider text-ink-700">Kementerian Pendidikan Tinggi, Sains, dan Teknologi</p>
                                <p className="text-[12px] font-bold uppercase tracking-wider text-ink-900">Universitas Andalas</p>
                                <h2 className="text-base font-bold uppercase text-brand-900 tracking-wide mt-0.5">
                                    Fakultas Teknologi Informasi
                                </h2>
                                <p className="text-[10px] text-ink-500 mt-0.5">
                                    Gedung FTI Kampus Limau Manis, Padang 25163 • Laman: https://fti.unand.ac.id • Pos-el: fti@unand.ac.id
                                </p>
                            </div>

                            {/* JUDUL BAST */}
                            <div className="text-center font-sans space-y-1">
                                <h3 className="text-sm font-bold uppercase underline tracking-wider">
                                    Berita Acara Serah Terima Aset
                                </h3>
                                <p className="text-xs font-mono font-semibold text-ink-700">
                                    Nomor: {bastTerpilih.nomor_bast}
                                </p>
                            </div>

                            {/* NARASI PEMBUKA */}
                            <p className="text-justify font-sans leading-normal">
                                Pada hari ini, <strong>{formatTanggal(bastTerpilih.tanggal_bast)}</strong>, bertempat di lingkungan Fakultas Teknologi Informasi Universitas Andalas, kami yang bertanda tangan di bawah ini:
                            </p>

                            {/* PARA PIHAK */}
                            <div className="space-y-3 font-sans">
                                <div className="grid grid-cols-12 gap-2 text-xs">
                                    <span className="col-span-3 text-ink-600">1. Nama / Instansi</span>
                                    <span className="col-span-1 text-center">:</span>
                                    <div className="col-span-8">
                                        <strong className="text-ink-900">{bastTerpilih.pihak_pertama}</strong>
                                        <p className="text-[11px] text-ink-500">Pihak yang Menyerahkan Barang Milik Negara / Aset</p>
                                        <p className="text-[11px] font-semibold text-ink-700">Disebut sebagai PIHAK PERTAMA</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-2 text-xs">
                                    <span className="col-span-3 text-ink-600">2. Nama / Instansi</span>
                                    <span className="col-span-1 text-center">:</span>
                                    <div className="col-span-8">
                                        <strong className="text-ink-900">{bastTerpilih.pihak_kedua}</strong>
                                        <p className="text-[11px] text-ink-500">Pihak yang Menerima Barang Milik Negara / Aset</p>
                                        <p className="text-[11px] font-semibold text-ink-700">Disebut sebagai PIHAK KEDUA</p>
                                    </div>
                                </div>
                            </div>

                            {/* KLAUSUL */}
                            <p className="text-justify font-sans leading-normal">
                                Berdasarkan transaksi <strong>{bastTerpilih.jenis_bast?.toUpperCase()}</strong> aset
                                {bastTerpilih.penerimaan && ` dengan referensi Nota Penerimaan ${bastTerpilih.penerimaan.nomor_nota}`}
                                {bastTerpilih.pengajuan && ` dengan referensi Pengajuan ${bastTerpilih.pengajuan.nomor_pengajuan}`}
                                {bastTerpilih.keterangan ? ` (${bastTerpilih.keterangan}), ` : ', '}
                                <strong>PIHAK PERTAMA</strong> menyerahkan kepada <strong>PIHAK KEDUA</strong>, dan <strong>PIHAK KEDUA</strong> menyatakan telah menerima dari <strong>PIHAK PERTAMA</strong> unit aset dalam kondisi sebagaimana rincian berikut:
                            </p>

                            {/* TABEL RINCIAN ASET */}
                            <div className="font-sans overflow-x-auto">
                                <table className="w-full border-collapse border border-line text-xs">
                                    <thead>
                                        <tr className="bg-surface/80 text-ink-700">
                                            <th className="border border-line px-2 py-1.5 text-center w-8">No</th>
                                            <th className="border border-line px-3 py-1.5 text-center">Kode Aset</th>
                                            <th className="border border-line px-3 py-1.5 text-left">Nama Barang & Spesifikasi</th>
                                            <th className="border border-line px-2 py-1.5 text-center">Nomor Seri</th>
                                            <th className="border border-line px-2 py-1.5 text-center">Jumlah</th>
                                            <th className="border border-line px-2 py-1.5 text-center">Kondisi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(bastTerpilih.items || []).map((it, idx) => (
                                            <tr key={it.id_item_bast || idx} className="hover:bg-surface/30">
                                                <td className="border border-line px-2 py-1 text-center">{idx + 1}</td>
                                                <td className="border border-line px-3 py-1 font-mono text-center">{it.kode_aset || '-'}</td>
                                                <td className="border border-line px-3 py-1">
                                                    <strong>{it.nama_barang}</strong>
                                                    {it.spesifikasi && (
                                                        <p className="text-[10px] text-ink-500">{it.spesifikasi}</p>
                                                    )}
                                                </td>
                                                <td className="border border-line px-2 py-1 font-mono text-center">{it.nomor_seri || '-'}</td>
                                                <td className="border border-line px-2 py-1 text-center">{it.jumlah} {it.satuan || 'unit'}</td>
                                                <td className="border border-line px-2 py-1 text-center capitalize">{it.kondisi || 'baik'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-justify font-sans leading-normal">
                                Sejak ditandatanganinya Berita Acara ini, tanggung jawab fisik dan pengawasan atas aset tersebut beralih kepada <strong>PIHAK KEDUA</strong>. Demikian Berita Acara Serah Terima Aset ini dibuat dengan sebenarnya dalam rangkap 2 (dua) bermaterai cukup untuk dipergunakan sebagaimana mestinya.
                            </p>

                            {/* BLOK TANDA TANGAN */}
                            <div className="grid grid-cols-2 gap-8 text-center font-sans pt-4">
                                <div>
                                    <p className="font-semibold text-ink-800">PIHAK PERTAMA</p>
                                    <p className="text-[11px] text-ink-500">Yang Menyerahkan,</p>
                                    <div className="h-16"></div>
                                    <p className="font-bold text-ink-900">( {bastTerpilih.pihak_pertama} )</p>
                                </div>

                                <div>
                                    <p className="font-semibold text-ink-800">PIHAK KEDUA</p>
                                    <p className="text-[11px] text-ink-500">Yang Menerima,</p>
                                    <div className="h-16 flex items-center justify-center">
                                        <span className="text-[9px] border border-dashed border-ink-300 px-2 py-1 text-ink-400">Materai Rp 10.000</span>
                                    </div>
                                    <p className="font-bold text-ink-900">( {bastTerpilih.pihak_kedua} )</p>
                                </div>
                            </div>

                            {/* MENGETAHUI WAKIL DEKAN II */}
                            <div className="text-center font-sans pt-4 border-t border-line">
                                <p className="text-[11px] text-ink-600">Mengetahui,</p>
                                <p className="font-bold text-ink-900">Wakil Dekan II Bidang Umum dan Keuangan</p>
                                <p className="text-[11px] text-ink-600">Fakultas Teknologi Informasi Universitas Andalas</p>
                                <div className="h-14"></div>
                                <p className="font-bold text-ink-900 underline">Dr. Eng. Ir. Derisma, M.T.</p>
                                <p className="text-[11px] text-ink-500">NIP. 197412152000032001</p>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* MODAL 1: + BUAT BAST BARU */}
            <Modal
                show={modalBuatBuka}
                onClose={() => setModalBuatBuka(false)}
                maxWidth="4xl"
            >
                <form onSubmit={handleSubmitBuat} className="p-6">
                    <div className="border-b border-line pb-4 flex items-center justify-between">
                        <div>
                            <Badge nada="info" className="mb-1">Langkah 1: Penyusunan Dokumen</Badge>
                            <h3 className="text-lg font-bold text-ink-900">
                                Susun Berita Acara Serah Terima (BAST) Baru
                            </h3>
                            <p className="text-xs text-ink-500">
                                Pilih sumber transaksi dan verifikasi para pihak sebelum mencetak draf dokumen resmi.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setModalBuatBuka(false)}
                            className="text-ink-400 hover:text-ink-700 text-lg"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-5 max-h-[72vh] overflow-y-auto pr-1 text-xs">
                        {/* 1. Pilih Jenis Transaksi */}
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-ink-700 block mb-2">
                                1. Pilih Jenis Transaksi Sumber BAST *:
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                    { id: 'penerimaan', label: 'Penerimaan Vendor', desc: 'Pengadaan barang baru' },
                                    { id: 'mutasi', label: 'Mutasi Ruangan', desc: 'Perpindahan fisik antar-unit' },
                                    { id: 'hibah', label: 'Hibah / Sharing', desc: 'Penyerahan unit nirlaba/kanibalisasi' },
                                    { id: 'penjualan', label: 'Penjualan / Lelang', desc: 'Pelelangan aset rusak berat' },
                                ].map((j) => (
                                    <div
                                        key={j.id}
                                        onClick={() => handleGantiJenisBuat(j.id)}
                                        className={`cursor-pointer rounded-lg border p-3 transition-all ${
                                            jenisPilihan === j.id
                                                ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500 font-semibold'
                                                : 'border-line bg-surface/40 hover:bg-surface'
                                        }`}
                                    >
                                        <p className="text-xs text-ink-900">{j.label}</p>
                                        <p className="text-[10px] text-ink-500 mt-1">{j.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Pilih Transaksi Referensi yang Belum Dibuatkan BAST */}
                        <div>
                            <Field
                                label="2. Pilih Transaksi Referensi yang Belum Dibuatkan BAST *"
                                wajib
                                error={formBuat.errors.id_penerimaan || formBuat.errors.id_pengajuan}
                            >
                                <SelectInput
                                    value={transaksiPilihanId}
                                    onChange={(e) => handlePilihTransaksi(e.target.value)}
                                    className="w-full text-xs"
                                >
                                    <option value="">-- Pilih Transaksi Siap BAST --</option>
                                    {(transaksiSiapBast[jenisPilihan] || []).map((t) => (
                                        <option key={t.id_referensi} value={t.id_referensi}>
                                            {t.label}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>
                            {(transaksiSiapBast[jenisPilihan] || []).length === 0 && (
                                <p className="text-[11px] text-amber-700 mt-1">
                                    Catatan: Saat ini belum ada transaksi berstatus selesai/terverifikasi pada jenis ini yang belum dibuatkan BAST.
                                </p>
                            )}
                        </div>

                        {/* 3. Identitas Tanggal & Para Pihak */}
                        <div className="rounded-lg border border-line bg-surface/30 p-4 space-y-4">
                            <h4 className="font-bold text-ink-800 uppercase tracking-wide text-[11px]">
                                3. Identitas Pelaksanaan & Para Pihak
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field
                                    label="Tanggal Pelaksanaan BAST *"
                                    wajib
                                    error={formBuat.errors.tanggal_bast}
                                >
                                    <TextInput
                                        type="date"
                                        value={formBuat.data.tanggal_bast}
                                        onChange={(e) => formBuat.setData('tanggal_bast', e.target.value)}
                                        className="w-full text-xs"
                                    />
                                </Field>

                                <Field
                                    label="Pihak Pertama (Menyerahkan) *"
                                    wajib
                                    error={formBuat.errors.pihak_pertama}
                                >
                                    <TextInput
                                        value={formBuat.data.pihak_pertama}
                                        onChange={(e) => formBuat.setData('pihak_pertama', e.target.value)}
                                        placeholder="Nama & Instansi Pihak Pertama"
                                        className="w-full text-xs"
                                    />
                                </Field>

                                <Field
                                    label="Pihak Kedua (Menerima) *"
                                    wajib
                                    error={formBuat.errors.pihak_kedua}
                                >
                                    <TextInput
                                        value={formBuat.data.pihak_kedua}
                                        onChange={(e) => formBuat.setData('pihak_kedua', e.target.value)}
                                        placeholder="Nama & Instansi Pihak Kedua"
                                        className="w-full text-xs"
                                    />
                                </Field>
                            </div>

                            <Field
                                label="Keterangan / Catatan Tambahan Dokumen"
                                error={formBuat.errors.keterangan}
                            >
                                <TextInput
                                    value={formBuat.data.keterangan}
                                    onChange={(e) => formBuat.setData('keterangan', e.target.value)}
                                    placeholder="Contoh: Serah terima pengadaan peralatan lab komputer tahun 2026"
                                    className="w-full text-xs"
                                />
                            </Field>
                        </div>

                        {/* 4. Rincian Unit Aset */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                                    4. Rincian Aset yang Diserahterimakan ({formBuat.data.items.length} unit) *:
                                </label>
                            </div>

                            {formBuat.errors.items && (
                                <p className="text-xs text-rose-600 mb-2">{formBuat.errors.items}</p>
                            )}

                            {formBuat.data.items.length === 0 ? (
                                <div className="rounded border border-dashed border-line p-4 text-center text-ink-500">
                                    Pilih transaksi referensi di atas untuk mengisi rincian barang secara otomatis.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {formBuat.data.items.map((it, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded border border-line bg-white p-3 space-y-2 shadow-xs"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-ink-900">
                                                    #{idx + 1}. {it.nama_barang}
                                                </span>
                                                {it.kode_aset && (
                                                    <Badge nada="netral">{it.kode_aset}</Badge>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                    <span className="text-[10px] text-ink-500">Spesifikasi:</span>
                                                    <p className="text-[11px] text-ink-700 line-clamp-1">{it.spesifikasi || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-ink-500">Kuantitas & Kondisi:</span>
                                                    <p className="text-[11px] text-ink-700">{it.jumlah} {it.satuan || 'unit'} • <span className="capitalize">{it.kondisi}</span></p>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-ink-500 block">Nomor Seri / S/N (opsional):</label>
                                                    <TextInput
                                                        value={it.nomor_seri || ''}
                                                        onChange={(e) => {
                                                            const baru = [...formBuat.data.items];
                                                            baru[idx].nomor_seri = e.target.value;
                                                            formBuat.setData('items', baru);
                                                        }}
                                                        placeholder="S/N fisik..."
                                                        className="w-full text-xs py-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                        <SecondaryButton
                            type="button"
                            onClick={() => setModalBuatBuka(false)}
                            disabled={formBuat.processing}
                        >
                            Batal
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            disabled={formBuat.processing || formBuat.data.items.length === 0}
                        >
                            {formBuat.processing ? 'Menyimpan...' : 'Simpan Draf BAST'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 2: UNGGAH ARSIP SCAN BAST BERTANDA TANGAN */}
            <Modal
                show={modalArsipBuka}
                onClose={() => setModalArsipBuka(false)}
                maxWidth="lg"
            >
                {bastUntukArsip && (
                    <form onSubmit={handleSubmitArsip} className="p-6">
                        <div className="border-b border-line pb-4 flex items-center justify-between">
                            <div>
                                <Badge nada="sukses" className="mb-1">Langkah 3: Pengarsipan Final</Badge>
                                <h3 className="text-base font-bold text-ink-900">
                                    Unggah Berkas Scan BAST Bermaterai
                                </h3>
                                <p className="text-xs text-ink-500 font-mono mt-0.5">
                                    {bastUntukArsip.nomor_bast}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalArsipBuka(false)}
                                className="text-ink-400 hover:text-ink-700 text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            <Alert nada="info">
                                Dokumen scan fisik BAST yang telah ditandatangani oleh Pihak Pertama, Pihak Kedua, dan Mengetahui Pimpinan Fakultas akan disimpan secara permanen pada arsip digital sistem.
                            </Alert>

                            <Field
                                label="Pilih Berkas Scan BAST (PDF, JPG, PNG maks 10MB) *"
                                wajib
                                error={formArsip.errors.file_bast}
                            >
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => formArsip.setData('file_bast', e.target.files[0] || null)}
                                    className="w-full text-xs text-ink-600 file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                                />
                            </Field>

                            <Field
                                label="Catatan Arsip Tambahan (opsional)"
                                error={formArsip.errors.catatan_arsip}
                            >
                                <TextInput
                                    value={formArsip.data.catatan_arsip}
                                    onChange={(e) => formArsip.setData('catatan_arsip', e.target.value)}
                                    placeholder="Contoh: Ditandatangani lengkap pada tanggal 20 Mei 2026 bermaterai Rp 10.000"
                                    className="w-full text-xs"
                                />
                            </Field>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                            <SecondaryButton
                                type="button"
                                onClick={() => setModalArsipBuka(false)}
                                disabled={formArsip.processing}
                            >
                                Batal
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                disabled={formArsip.processing || !formArsip.data.file_bast}
                            >
                                {formArsip.processing ? 'Mengunggah...' : 'Unggah & Finalisasi BAST'}
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
