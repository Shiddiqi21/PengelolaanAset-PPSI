import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatusText from '@/Components/ui/StatusText';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function formatRupiah(angka) {
    if (!angka || angka === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka);
}

export default function Index({ daftarPerbaikan, daftarTeknisi = [], tabAktif, filters }) {
    const [q, setQ] = useState(filters.q || '');
    const [modalBuka, setModalBuka] = useState(false);
    const [targetItem, setTargetItem] = useState(null);
    const isFirstRender = useRef(true);

    const formTugaskan = useForm({
        id_teknisi: daftarTeknisi[0]?.id_pengguna ? String(daftarTeknisi[0].id_pengguna) : '',
        estimasi_biaya: '',
        catatan: '',
    });

    const terapkanFilter = (keyword, tab) => {
        router.get(
            route('perbaikan.index'),
            {
                q: keyword || undefined,
                tab: tab,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            terapkanFilter(q, tabAktif);
        }, 350);

        return () => clearTimeout(timer);
    }, [q]);

    const bukaModal = (item) => {
        setTargetItem(item);
        formTugaskan.reset();
        formTugaskan.clearErrors();
        formTugaskan.setData({
            id_teknisi: daftarTeknisi[0]?.id_pengguna ? String(daftarTeknisi[0].id_pengguna) : '',
            estimasi_biaya: item.estimasi_biaya ? String(item.estimasi_biaya) : '',
            catatan: '',
        });
        setModalBuka(true);
    };

    const tutupModal = () => {
        if (!formTugaskan.processing) {
            setModalBuka(false);
            setTargetItem(null);
        }
    };

    const kirimPenugasan = (e) => {
        e.preventDefault();
        if (!targetItem) return;

        formTugaskan.post(route('perbaikan.tugaskan', targetItem.id_item_perbaikan), {
            preserveScroll: true,
            onSuccess: () => {
                tutupModal();
            },
        });
    };

    const kolom = [
        {
            kunci: 'nomor_pengajuan',
            judul: 'Nomor Tiket',
            className: 'font-semibold text-brand-700 whitespace-nowrap',
        },
        {
            judul: 'Aset',
            render: (b) => (
                <div>
                    <div className="font-semibold text-ink-900">{b.nama_barang}</div>
                    <div className="text-xs text-ink-500 font-mono">{b.kode_aset} • {b.merek_tipe}</div>
                </div>
            ),
        },
        {
            judul: 'Pemohon / Unit',
            render: (b) => (
                <div>
                    <div className="font-medium text-ink-900">{b.pemohon_nama}</div>
                    <div className="text-xs text-ink-500">{b.unit_nama}</div>
                </div>
            ),
        },
        {
            judul: 'Pelaksana Ditugaskan',
            render: (b) => (
                <span className={`text-xs ${b.pelaksana === '-' ? 'italic text-ink-400' : 'font-medium text-ink-900'}`}>
                    {b.pelaksana}
                </span>
            ),
        },
        {
            judul: 'Status',
            render: (b) => <StatusText nada={b.status_nada}>{b.status_label}</StatusText>,
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (b) => (
                <button
                    type="button"
                    onClick={() => bukaModal(b)}
                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        b.bisa_ditugaskan
                            ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                            : 'border border-line bg-white text-ink-700 hover:bg-surface'
                    }`}
                >
                    {b.bisa_ditugaskan ? 'Tugaskan pelaksana' : 'Lihat rincian'}
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Pemrosesan Perbaikan Aset" />

            <PageHeader
                breadcrumb={['FTI', 'Perbaikan aset']}
                judul="Pemrosesan perbaikan aset"
                deskripsi="Kelola penugasan teknisi internal fakultas untuk usulan perbaikan aset yang telah disetujui pimpinan."
            />

            <div className="space-y-4">
                {/* Tab Navigasi */}
                <TabNav
                    tab={[
                        {
                            label: 'Menunggu penugasan',
                            href: route('perbaikan.index', { tab: 'antrean', ...(q ? { q } : {}) }),
                            aktif: tabAktif === 'antrean',
                        },
                        {
                            label: 'Sedang dikerjakan',
                            href: route('perbaikan.index', { tab: 'proses', ...(q ? { q } : {}) }),
                            aktif: tabAktif === 'proses',
                        },
                        {
                            label: 'Perbaikan selesai',
                            href: route('perbaikan.index', { tab: 'selesai', ...(q ? { q } : {}) }),
                            aktif: tabAktif === 'selesai',
                        },
                        {
                            label: 'Semua perbaikan',
                            href: route('perbaikan.index', { tab: 'semua', ...(q ? { q } : {}) }),
                            aktif: tabAktif === 'semua',
                        },
                    ]}
                />

                {/* Pencarian */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full sm:max-w-xs">
                        <SearchInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari nomor, aset, pelaksana..."
                        />
                    </div>
                </div>

                {/* Tabel Perbaikan */}
                <Card>
                    <DataTable
                        kolom={kolom}
                        baris={daftarPerbaikan.data}
                        kunciBaris="id_item_perbaikan"
                        kosong={
                            <EmptyState
                                judul={
                                    q
                                        ? 'Data perbaikan tidak ditemukan'
                                        : tabAktif === 'antrean'
                                          ? 'Tidak ada perbaikan yang menunggu penugasan'
                                          : 'Belum ada data perbaikan'
                                }
                                deskripsi={
                                    q
                                        ? 'Tidak ditemukan usulan perbaikan yang cocok dengan kata kunci pencarian.'
                                        : 'Aset yang telah disetujui pimpinan akan muncul di antrean ini.'
                                }
                            />
                        }
                    />
                    <Pagination
                        links={daftarPerbaikan.links}
                        from={daftarPerbaikan.from}
                        to={daftarPerbaikan.to}
                        total={daftarPerbaikan.total}
                    />
                </Card>
            </div>

            {/* Modal Penugasan / Rincian Perbaikan */}
            <Modal show={modalBuka} onClose={tutupModal} maxWidth="2xl">
                {targetItem && (
                    <div className="p-6">
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    {targetItem.bisa_ditugaskan ? 'Penugasan Pelaksana Perbaikan' : 'Rincian Perbaikan Aset'}
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">{targetItem.nomor_pengajuan}</h3>
                                <p className="text-xs text-ink-600">
                                    Pengusul: {targetItem.pemohon_nama} • {targetItem.unit_nama}
                                </p>
                            </div>
                            <Badge nada={targetItem.status_nada}>{targetItem.status_label}</Badge>
                        </div>

                        <div className="my-5 space-y-4">
                            {/* Rincian Aset & Kerusakan */}
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge nada="brand">{targetItem.kode_aset}</Badge>
                                        <span className="font-semibold text-ink-900 text-sm">{targetItem.nama_barang}</span>
                                    </div>
                                    <span className="text-ink-500 font-medium">Model: {targetItem.merek_tipe}</span>
                                </div>
                                <div className="border-t border-line/60 pt-2">
                                    <span className="font-medium text-ink-500 block">Deskripsi Kerusakan dari Pemohon:</span>
                                    <p className="mt-1 text-ink-800 whitespace-pre-wrap leading-relaxed">
                                        {targetItem.deskripsi_kerusakan}
                                    </p>
                                </div>
                                {targetItem.foto_url && (
                                    <div className="border-t border-line/60 pt-2">
                                        <span className="font-medium text-ink-500 block mb-1">Bukti Foto Fisik Kerusakan:</span>
                                        <a href={targetItem.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                            <img
                                                src={targetItem.foto_url}
                                                alt="Bukti Kerusakan"
                                                className="h-28 w-28 rounded-lg object-cover border border-line group-hover:opacity-90 shadow-sm"
                                            />
                                            <span className="block text-[11px] text-brand-600 group-hover:underline mt-1 font-medium">
                                                Buka foto ukuran penuh ↗
                                            </span>
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Informasi Pelaksanaan Jika Sudah Ditugaskan / Selesai */}
                            {!targetItem.bisa_ditugaskan && (
                                <div className="rounded-lg border border-line p-4 text-xs space-y-3">
                                    <div className="flex justify-between items-center border-b border-line pb-2">
                                        <span className="font-semibold text-ink-900">Pelaksana Ditugaskan:</span>
                                        <span className="font-medium text-brand-700">{targetItem.pelaksana}</span>
                                    </div>
                                    {targetItem.hasil_pemeriksaan && (
                                        <div>
                                            <span className="font-medium text-ink-500 block">Analisis / Hasil Pemeriksaan Teknisi:</span>
                                            <p className="mt-1 text-ink-800 whitespace-pre-wrap">{targetItem.hasil_pemeriksaan}</p>
                                        </div>
                                    )}
                                    {targetItem.hasil_perbaikan && (
                                        <div>
                                            <span className="font-medium text-ink-500 block">Tindakan Hasil Perbaikan:</span>
                                            <p className="mt-1 text-ink-800 whitespace-pre-wrap">{targetItem.hasil_perbaikan}</p>
                                        </div>
                                    )}
                                    {targetItem.biaya_aktual > 0 && (
                                        <div className="border-t border-line pt-2 flex justify-between items-center">
                                            <span className="font-semibold text-ink-900">Biaya Aktual Realisasi:</span>
                                            <span className="font-bold text-brand-700 text-sm">{formatRupiah(targetItem.biaya_aktual)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Form Penugasan (Hanya jika status 'disetujui' dan siap ditugaskan) */}
                            {targetItem.bisa_ditugaskan && (
                                <form id="form-penugasan" onSubmit={kirimPenugasan} className="space-y-4">
                                    <Field
                                        label="Teknisi Fakultas yang Ditugaskan"
                                        htmlFor="id_teknisi"
                                        error={formTugaskan.errors.id_teknisi}
                                    >
                                        <SelectInput
                                            id="id_teknisi"
                                            className="block w-full"
                                            value={formTugaskan.data.id_teknisi}
                                            onChange={(e) => formTugaskan.setData('id_teknisi', e.target.value)}
                                            required
                                        >
                                            <option value="">-- Pilih teknisi fakultas --</option>
                                            {daftarTeknisi.map((t) => (
                                                <option key={t.id_pengguna} value={t.id_pengguna}>
                                                    {t.nama_lengkap} (NIP: {t.nip || '-'})
                                                </option>
                                            ))}
                                        </SelectInput>
                                    </Field>

                                    <Field
                                        label="Estimasi Biaya / Plafon Maksimal (Opsional)"
                                        htmlFor="estimasi_biaya"
                                        error={formTugaskan.errors.estimasi_biaya}
                                    >
                                        <TextInput
                                            id="estimasi_biaya"
                                            type="number"
                                            className="block w-full"
                                            value={formTugaskan.data.estimasi_biaya}
                                            onChange={(e) => formTugaskan.setData('estimasi_biaya', e.target.value)}
                                            placeholder="Contoh: 750000"
                                        />
                                    </Field>

                                    <Field
                                        label="Instruksi Kerja / Catatan Penugasan (Opsional)"
                                        htmlFor="catatan"
                                        error={formTugaskan.errors.catatan}
                                    >
                                        <textarea
                                            id="catatan"
                                            rows={3}
                                            className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                            value={formTugaskan.data.catatan}
                                            onChange={(e) => formTugaskan.setData('catatan', e.target.value)}
                                            placeholder="Tuliskan arahan khusus atau batas waktu penyelesaian..."
                                        />
                                    </Field>
                                </form>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                            {targetItem.bisa_ditugaskan ? (
                                <>
                                    <SecondaryButton onClick={tutupModal} disabled={formTugaskan.processing}>
                                        Batal
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" form="form-penugasan" disabled={formTugaskan.processing}>
                                        {formTugaskan.processing ? 'Menyimpan...' : 'Simpan penugasan'}
                                    </PrimaryButton>
                                </>
                            ) : (
                                <SecondaryButton onClick={tutupModal}>Tutup</SecondaryButton>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
