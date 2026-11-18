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

export default function MutasiIndex({
    antreanMutasi = [],
    riwayatMutasi,
    daftarRuangan = [],
    daftarPengguna = [],
    statistik = {},
    filters = {},
}) {
    const { flash } = usePage().props;

    const [tabAktif, setTabAktif] = useState('antrean'); // 'antrean' | 'riwayat'
    const [q, setQ] = useState(filters.q || '');
    const isFirstRender = useRef(true);

    // Modal Eksekusi
    const [modalEksekusiBuka, setModalEksekusiBuka] = useState(false);
    const [pengajuanEksekusi, setPengajuanEksekusi] = useState(null);

    // Modal Detail Riwayat
    const [modalDetailBuka, setModalDetailBuka] = useState(false);
    const [detailPengajuan, setDetailPengajuan] = useState(null);

    // Form Eksekusi Inertia
    const formEksekusi = useForm({
        tanggal_eksekusi: new Date().toISOString().slice(0, 10),
        nomor_disposisi: '',
        catatan_mutasi: '',
        items: [],
    });

    // Debounced search tabel riwayat
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route('mutasi.index'),
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
            tanggal_eksekusi: new Date().toISOString().slice(0, 10),
            nomor_disposisi: '',
            catatan_mutasi: '',
            items: (pengajuan.item_mutasi || []).map((it) => ({
                id_item_mutasi: it.id_item_mutasi,
                id_ruangan_tujuan: it.id_ruangan_tujuan ? String(it.id_ruangan_tujuan) : '',
                id_pengguna_pj_tujuan: it.id_pengguna_pj ? String(it.id_pengguna_pj) : '',
            })),
        });
        setModalEksekusiBuka(true);
    };

    // Update item override di formulir eksekusi
    const handleItemChange = (idItemMutasi, field, val) => {
        const baru = formEksekusi.data.items.map((it) => {
            if (it.id_item_mutasi === idItemMutasi) {
                return { ...it, [field]: val };
            }
            return it;
        });
        formEksekusi.setData('items', baru);
    };

    // Submit eksekusi mutasi
    const handleSubmitEksekusi = (e) => {
        e.preventDefault();
        if (!pengajuanEksekusi) return;

        formEksekusi.post(route('mutasi.proses', pengajuanEksekusi.id_pengajuan), {
            preserveScroll: true,
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

    return (
        <AuthenticatedLayout>
            <Head title="Pemrosesan Mutasi Aset" />

            <PageHeader
                breadcrumb={['FTI', 'Mutasi aset']}
                judul="Pemrosesan mutasi aset"
                deskripsi="Verifikasi ruangan & penanggung jawab tujuan serta eksekusi pemindahan aset yang telah disetujui Pimpinan."
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
                        keterangan="Diperiksa / Kadep"
                        nada="info"
                    />
                    <StatCard
                        label="Mutasi selesai"
                        nilai={statistik.mutasi_selesai ?? 0}
                        keterangan="Penempatan aktif baru"
                        nada="sukses"
                    />
                    <StatCard
                        label="Total aset dimutasi"
                        nilai={statistik.total_aset_dimutasi ?? 0}
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
                    <span>Antrean mutasi siap diproses</span>
                    <Badge nada={antreanMutasi.length > 0 ? 'peringatan' : 'netral'}>
                        {antreanMutasi.length}
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
                    <span>Riwayat mutasi selesai</span>
                    <Badge nada="netral">{riwayatMutasi?.total ?? 0}</Badge>
                </button>
            </div>

            {/* Konten Tab 1: Antrean Mutasi Siap Diproses */}
            {tabAktif === 'antrean' && (
                <div className="space-y-6">
                    {antreanMutasi.length === 0 ? (
                        <Card>
                            <IsiKartu>
                                <EmptyState
                                    judul="Tidak ada mutasi yang siap diproses"
                                    deskripsi="Saat ini belum ada pengajuan mutasi aset dengan status 'Disetujui Pimpinan' yang menunggu eksekusi perpindahan fisik."
                                />
                            </IsiKartu>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {antreanMutasi.map((pengajuan) => (
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
                                                Eksekusi perpindahan aset →
                                            </PrimaryButton>
                                        </div>
                                    </div>

                                    <IsiKartu className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
                                            <div>
                                                <span className="text-ink-500">Pemohon / Pengusul:</span>
                                                <p className="font-semibold text-ink-900">
                                                    {pengajuan.pemohon?.nama_lengkap || '-'}
                                                </p>
                                                <p className="text-[11px] text-ink-500">
                                                    {pengajuan.pemohon?.unit?.nama_unit || 'Fakultas Teknologi Informasi'}
                                                </p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <span className="text-ink-500">Perihal & Alasan Usulan:</span>
                                                <p className="font-medium whitespace-pre-wrap text-ink-900">
                                                    {pengajuan.keterangan || '-'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tabel Rincian Aset */}
                                        <div className="overflow-x-auto rounded-lg border border-line">
                                            <table className="min-w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-line bg-surface/70 text-left font-semibold text-ink-600">
                                                        <th className="py-2.5 px-3">Kode & Nama Aset</th>
                                                        <th className="py-2.5 px-3">Kategori</th>
                                                        <th className="py-2.5 px-3">Ruangan & PJ Asal</th>
                                                        <th className="py-2.5 px-3">Ruangan & PJ Tujuan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-line bg-white">
                                                    {(pengajuan.item_mutasi || []).map((it) => (
                                                        <tr key={it.id_item_mutasi} className="align-top">
                                                            <td className="py-2.5 px-3">
                                                                <p className="font-semibold text-ink-900">
                                                                    {it.aset?.nama_barang}
                                                                </p>
                                                                <p className="text-[11px] text-ink-500">
                                                                    {it.aset?.kode_aset}
                                                                </p>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-ink-700">
                                                                {it.aset?.kategori?.nama_kategori || '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-ink-700">
                                                                <p className="font-medium text-ink-900">
                                                                    {it.ruanganAsal?.nama_ruangan ||
                                                                        it.aset?.penempatan_aktif?.ruangan?.nama_ruangan ||
                                                                        '-'}
                                                                </p>
                                                                <p className="text-[11px] text-ink-500">
                                                                    PJ: {it.penanggungJawabAsal?.nama_lengkap ||
                                                                        it.aset?.penempatan_aktif?.penanggung_jawab?.nama_lengkap ||
                                                                        '-'}
                                                                </p>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <p className="font-semibold text-brand-700">
                                                                    {it.ruangan_tujuan?.nama_ruangan || '-'}
                                                                </p>
                                                                <p className="text-[11px] text-ink-500">
                                                                    PJ: {it.penanggung_jawab_tujuan?.nama_lengkap ||
                                                                        it.penanggungJawabBaru?.nama_lengkap ||
                                                                        'Tetap / Mengikuti ruangan'}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Dokumen Terlampir */}
                                        {pengajuan.dokumen && pengajuan.dokumen.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                                <span className="text-ink-500">Dokumen pendukung:</span>
                                                {pengajuan.dokumen.map((doc) => (
                                                    <a
                                                        key={doc.id_dokumen}
                                                        href={route('dokumen.unduh', doc.id_dokumen)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-brand-600 hover:bg-brand-50 hover:underline"
                                                    >
                                                        <span>📎 {doc.nama_file}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </IsiKartu>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Konten Tab 2: Riwayat Mutasi Selesai */}
            {tabAktif === 'riwayat' && (
                <div className="space-y-4">
                    <Card>
                        <div className="border-b border-line p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="w-full max-w-sm">
                                    <SearchInput
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Cari nomor pengajuan, nama aset, pemohon..."
                                    />
                                </div>
                                <span className="text-xs text-ink-500">
                                    Total <strong>{riwayatMutasi?.total ?? 0}</strong> riwayat mutasi
                                </span>
                            </div>
                        </div>

                        <DataTable
                            kolom={[
                                { header: 'Nomor & Tanggal', accessor: 'nomor' },
                                { header: 'Pemohon / Unit', accessor: 'pemohon' },
                                { header: 'Aset & Pemindahan', accessor: 'aset' },
                                { header: 'Status', accessor: 'status' },
                                { header: 'Aksi', accessor: 'aksi', align: 'right' },
                            ]}
                            baris={(riwayatMutasi?.data || []).map((p) => ({
                                id: p.id_pengajuan,
                                nomor: (
                                    <div>
                                        <p className="font-bold text-ink-900">{p.nomor_pengajuan}</p>
                                        <p className="text-[11px] text-ink-500">
                                            {formatTanggal(p.tanggal_pengajuan)}
                                        </p>
                                    </div>
                                ),
                                pemohon: (
                                    <div>
                                        <p className="font-medium text-ink-900">{p.pemohon?.nama_lengkap || '-'}</p>
                                        <p className="text-[11px] text-ink-500">
                                            {p.pemohon?.unit?.nama_unit || 'FTI'}
                                        </p>
                                    </div>
                                ),
                                aset: (
                                    <div className="space-y-1">
                                        {(p.item_mutasi || []).map((it) => (
                                            <div key={it.id_item_mutasi} className="text-xs">
                                                <span className="font-semibold text-ink-900">{it.aset?.nama_barang}</span>
                                                <span className="text-ink-500"> ({it.aset?.kode_aset})</span>
                                                <div className="text-[11px] text-ink-600">
                                                    {it.ruanganAsal?.nama_ruangan || 'Asal'} → <strong className="text-brand-700">{it.ruangan_tujuan?.nama_ruangan || 'Tujuan'}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ),
                                status: (
                                    <div>
                                        <Badge nada="sukses">Selesai</Badge>
                                        {p.berita_acara && p.berita_acara.length > 0 && (
                                            <p className="mt-1 text-[11px] text-ink-500">BAST Tersedia</p>
                                        )}
                                    </div>
                                ),
                                aksi: (
                                    <button
                                        type="button"
                                        onClick={() => handleBukaDetail(p)}
                                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                                    >
                                        Lihat detail
                                    </button>
                                ),
                            }))}
                            kosong={
                                <EmptyState
                                    judul="Data mutasi tidak ditemukan"
                                    deskripsi="Tidak ada riwayat mutasi aset yang sesuai dengan kriteria pencarian Anda."
                                />
                            }
                        />

                        {riwayatMutasi && riwayatMutasi.links && (
                            <div className="p-4 border-t border-line">
                                <Pagination links={riwayatMutasi.links} />
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Modal Eksekusi Perpindahan Aset */}
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
                                    <Badge nada="sukses" className="mb-1">Siap Eksekusi</Badge>
                                    <h3 className="text-lg font-bold text-ink-900">
                                        Eksekusi Mutasi — {pengajuanEksekusi.nomor_pengajuan}
                                    </h3>
                                    <p className="text-xs text-ink-500">
                                        Pemohon: {pengajuanEksekusi.pemohon?.nama_lengkap} • {pengajuanEksekusi.pemohon?.unit?.nama_unit}
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

                        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                            {/* Verifikasi Ruangan & PIC Tujuan Per Item */}
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                                    Verifikasi Ruangan & Penanggung Jawab Tujuan Aset:
                                </label>
                                <p className="text-[11px] text-ink-500 mb-2">
                                    Operator dapat memastikan atau menyesuaikan ruangan dan penanggung jawab fisik akhir jika terdapat perubahan teknis.
                                </p>

                                <div className="space-y-3">
                                    {(pengajuanEksekusi.item_mutasi || []).map((it) => {
                                        const formItem = formEksekusi.data.items.find((fi) => fi.id_item_mutasi === it.id_item_mutasi);
                                        return (
                                            <div
                                                key={it.id_item_mutasi}
                                                className="rounded-lg border border-line bg-surface/50 p-3 text-xs space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-ink-900">{it.aset?.nama_barang}</span>
                                                        <Badge nada="netral" className="ml-2">{it.aset?.kode_aset}</Badge>
                                                    </div>
                                                    <span className="text-[11px] text-ink-500">
                                                        Kondisi: <span className="capitalize">{it.aset?.kondisi || 'baik'}</span>
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="rounded border border-line bg-white p-2.5">
                                                        <p className="text-[10px] font-semibold uppercase text-ink-400">Penempatan Asal Saat Ini</p>
                                                        <p className="font-semibold text-ink-800 mt-1">
                                                            {it.ruanganAsal?.nama_ruangan || it.aset?.penempatan_aktif?.ruangan?.nama_ruangan || '-'}
                                                        </p>
                                                        <p className="text-[11px] text-ink-500">
                                                            PJ: {it.penanggungJawabAsal?.nama_lengkap || it.aset?.penempatan_aktif?.penanggung_jawab?.nama_lengkap || '-'}
                                                        </p>
                                                    </div>

                                                    <div className="rounded border border-brand-200 bg-brand-50/40 p-2.5 space-y-2">
                                                        <p className="text-[10px] font-semibold uppercase text-brand-800">Tujuan Akhir Eksekusi *</p>
                                                        <div>
                                                            <label className="text-[11px] font-medium text-ink-700">Ruangan Tujuan:</label>
                                                            <SelectInput
                                                                value={formItem?.id_ruangan_tujuan || ''}
                                                                onChange={(e) => handleItemChange(it.id_item_mutasi, 'id_ruangan_tujuan', e.target.value)}
                                                                className="w-full text-xs mt-1"
                                                            >
                                                                {daftarRuangan.map((r) => (
                                                                    <option key={r.id_ruangan} value={r.id_ruangan}>
                                                                        {r.gedung ? `${r.gedung.nama_gedung} - ` : ''}{r.nomor_ruangan} ({r.nama_ruangan})
                                                                    </option>
                                                                ))}
                                                            </SelectInput>
                                                        </div>

                                                        <div>
                                                            <label className="text-[11px] font-medium text-ink-700">Penanggung Jawab Baru:</label>
                                                            <SelectInput
                                                                value={formItem?.id_pengguna_pj_tujuan || ''}
                                                                onChange={(e) => handleItemChange(it.id_item_mutasi, 'id_pengguna_pj_tujuan', e.target.value)}
                                                                className="w-full text-xs mt-1"
                                                            >
                                                                <option value="">-- Tetap PJ lama / Mengikuti ruangan --</option>
                                                                {daftarPengguna.map((p) => (
                                                                    <option key={p.id_pengguna} value={p.id_pengguna}>
                                                                        {p.nama_lengkap} {p.nip ? `(${p.nip})` : ''}
                                                                    </option>
                                                                ))}
                                                            </SelectInput>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Data Tanggal & Dokumen Eksekusi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-line pt-4">
                                <Field
                                    label="Tanggal efektif eksekusi"
                                    wajib
                                    error={formEksekusi.errors.tanggal_eksekusi}
                                >
                                    <TextInput
                                        type="date"
                                        value={formEksekusi.data.tanggal_eksekusi}
                                        onChange={(e) => formEksekusi.setData('tanggal_eksekusi', e.target.value)}
                                        className="w-full text-sm"
                                    />
                                </Field>

                                <Field
                                    label="Nomor disposisi / memo mutasi (opsional)"
                                    error={formEksekusi.errors.nomor_disposisi}
                                >
                                    <TextInput
                                        value={formEksekusi.data.nomor_disposisi}
                                        onChange={(e) => formEksekusi.setData('nomor_disposisi', e.target.value)}
                                        placeholder="Contoh: DSP/FTI/XI/2026/042"
                                        className="w-full text-sm"
                                    />
                                </Field>
                            </div>

                            <Field
                                label="Catatan / keterangan eksekusi mutasi"
                                error={formEksekusi.errors.catatan_mutasi}
                            >
                                <textarea
                                    rows={3}
                                    value={formEksekusi.data.catatan_mutasi}
                                    onChange={(e) => formEksekusi.setData('catatan_mutasi', e.target.value)}
                                    placeholder="Tuliskan catatan teknis pelaksanaan pemindahan aset..."
                                    className="w-full rounded-md border-line bg-surface text-xs shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                />
                            </Field>

                            {/* Peringatan Konfirmasi */}
                            <div className="rounded-lg border border-warn-200 bg-warn-50 p-3 text-xs text-warn-800 leading-relaxed">
                                <strong>Peringatan Eksekusi:</strong> Tombol di bawah ini akan secara permanen menutup record penempatan aset lama dan menerbitkan baris penempatan baru di tabel <code>penempatan_aset</code> serta mengubah status pengajuan menjadi <strong>Selesai</strong>.
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                            <SecondaryButton
                                type="button"
                                disabled={formEksekusi.processing}
                                onClick={() => setModalEksekusiBuka(false)}
                            >
                                Batal
                            </SecondaryButton>

                            <PrimaryButton
                                type="submit"
                                disabled={formEksekusi.processing}
                            >
                                {formEksekusi.processing ? 'Memproses eksekusi...' : 'Proses mutasi & perbarui penempatan'}
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Detail Riwayat Mutasi */}
            <Modal
                show={modalDetailBuka}
                onClose={() => setModalDetailBuka(false)}
                maxWidth="2xl"
            >
                {detailPengajuan && (
                    <div className="p-6">
                        <div className="flex items-center justify-between border-b border-line pb-3">
                            <div>
                                <Badge nada="sukses" className="mb-1">Mutasi Selesai</Badge>
                                <h3 className="text-base font-bold text-ink-900">
                                    Detail Mutasi — {detailPengajuan.nomor_pengajuan}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalDetailBuka(false)}
                                className="text-ink-400 hover:text-ink-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
                            <InfoList
                                item={[
                                    { label: 'Pemohon', nilai: detailPengajuan.pemohon?.nama_lengkap || '-' },
                                    { label: 'Unit pengusul', nilai: detailPengajuan.pemohon?.unit?.nama_unit || '-' },
                                    { label: 'Tanggal usulan', nilai: formatTanggal(detailPengajuan.tanggal_pengajuan) },
                                    { label: 'Status', nilai: 'Selesai' },
                                ]}
                            />

                            <div className="border-t border-line pt-3">
                                <p className="font-semibold uppercase tracking-wider text-ink-500 text-[11px] mb-2">
                                    Daftar Aset Termutasi:
                                </p>
                                <div className="space-y-2">
                                    {(detailPengajuan.item_mutasi || []).map((it) => (
                                        <div key={it.id_item_mutasi} className="rounded-lg border border-line p-3 bg-surface/50">
                                            <p className="font-bold text-ink-900">{it.aset?.nama_barang}</p>
                                            <p className="text-ink-500">{it.aset?.kode_aset} • {it.aset?.kategori?.nama_kategori}</p>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] border-t border-line pt-2">
                                                <div>
                                                    <span className="text-ink-400">Asal:</span>
                                                    <p className="font-medium text-ink-800">{it.ruanganAsal?.nama_ruangan || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-ink-400">Tujuan Akhir:</span>
                                                    <p className="font-semibold text-brand-700">{it.ruangan_tujuan?.nama_ruangan || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {detailPengajuan.dokumen && detailPengajuan.dokumen.length > 0 && (
                                <div className="border-t border-line pt-3">
                                    <p className="font-semibold uppercase tracking-wider text-ink-500 text-[11px] mb-1">
                                        Dokumen Terlampir:
                                    </p>
                                    <ul className="divide-y divide-line rounded border border-line">
                                        {detailPengajuan.dokumen.map((doc) => (
                                            <li key={doc.id_dokumen} className="flex items-center justify-between p-2">
                                                <span>📎 {doc.nama_file}</span>
                                                <a
                                                    href={route('dokumen.unduh', doc.id_dokumen)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-semibold text-brand-600 hover:underline"
                                                >
                                                    Unduh
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end border-t border-line pt-3">
                            <SecondaryButton type="button" onClick={() => setModalDetailBuka(false)}>
                                Tutup
                            </SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
