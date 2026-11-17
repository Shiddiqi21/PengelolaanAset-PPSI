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

export default function Index({ daftarPemeliharaan, daftarAset = [], daftarTeknisi = [], daftarVendor = [], tabAktif, filters }) {
    const [q, setQ] = useState(filters.q || '');
    const [modalTambahBuka, setModalTambahBuka] = useState(false);
    const [modalUpdateBuka, setModalUpdateBuka] = useState(false);
    const [targetItem, setTargetItem] = useState(null);
    const isFirstRender = useRef(true);

    // Form tambah jadwal
    const formTambah = useForm({
        id_aset: daftarAset[0]?.id_aset ? String(daftarAset[0].id_aset) : '',
        jenis_pemeliharaan: '',
        tanggal_jadwal: '',
        tipe_pelaksana: 'teknisi',
        id_pelaksana: daftarTeknisi[0]?.id_pengguna ? String(daftarTeknisi[0].id_pengguna) : '',
        id_vendor: daftarVendor[0]?.id_vendor ? String(daftarVendor[0].id_vendor) : '',
        uraian: '',
        biaya: '',
    });

    // Form update realisasi
    const formUpdate = useForm({
        status: 'selesai',
        tanggal_pelaksanaan: new Date().toISOString().split('T')[0],
        uraian: '',
        biaya: '',
    });

    const terapkanFilter = (keyword, tab) => {
        router.get(
            route('pemeliharaan.index'),
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

    const bukaModalUpdate = (item) => {
        setTargetItem(item);
        formUpdate.reset();
        formUpdate.clearErrors();
        formUpdate.setData({
            status: item.status === 'terjadwal' ? 'selesai' : item.status,
            tanggal_pelaksanaan: item.tanggal_pelaksanaan !== '-' ? item.tanggal_pelaksanaan : new Date().toISOString().split('T')[0],
            uraian: item.uraian !== '-' ? item.uraian : '',
            biaya: item.biaya ? String(item.biaya) : '',
        });
        setModalUpdateBuka(true);
    };

    const kirimTambah = (e) => {
        e.preventDefault();
        formTambah.post(route('pemeliharaan.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setModalTambahBuka(false);
                formTambah.reset();
            },
        });
    };

    const kirimUpdate = (e) => {
        e.preventDefault();
        if (!targetItem) return;

        formUpdate.put(route('pemeliharaan.update', targetItem.id_pemeliharaan), {
            preserveScroll: true,
            onSuccess: () => {
                setModalUpdateBuka(false);
                setTargetItem(null);
            },
        });
    };

    const kolom = [
        {
            kunci: 'tanggal_jadwal',
            judul: 'Tanggal Jadwal',
            className: 'font-semibold text-ink-900 whitespace-nowrap',
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
            kunci: 'jenis_pemeliharaan',
            judul: 'Jenis Pemeliharaan',
            className: 'font-medium text-ink-800',
        },
        {
            judul: 'Pelaksana',
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
                    onClick={() => bukaModalUpdate(b)}
                    className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-surface"
                >
                    {b.status === 'selesai' ? 'Detail realisasi' : 'Perbarui realisasi'}
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Jadwal & Riwayat Pemeliharaan" />

            <PageHeader
                breadcrumb={['FTI', 'Pemeliharaan']}
                judul="Jadwal & riwayat pemeliharaan"
                deskripsi="Jadwalkan pemeliharaan berkala untuk menjaga keandalan aset fakultas dan catat riwayat pelaksanaannya."
            >
                <PrimaryButton onClick={() => setModalTambahBuka(true)}>
                    + Tambah jadwal pemeliharaan
                </PrimaryButton>
            </PageHeader>

            <div className="space-y-4">
                {/* Tab Navigasi */}
                <TabNav
                    tab={[
                        {
                            label: 'Terjadwal',
                            href: route('pemeliharaan.index', { tab: 'terjadwal', ...(q ? { q } : {}) }),
                            aktif: tabAktif === 'terjadwal',
                        },
                        {
                            label: 'Sedang berjalan',
                            href: route('pemeliharaan.index', { tab: 'dalam_proses', ...(q ? { q } : {}) }),
                            aktif: tabAktif === 'dalam_proses',
                        },
                        {
                            label: 'Riwayat selesai',
                            href: route('pemeliharaan.index', { tab: 'selesai', ...(q ? { q } : {}) }),
                            aktif: tabAktif === 'selesai',
                        },
                        {
                            label: 'Semua jadwal',
                            href: route('pemeliharaan.index', { tab: 'semua', ...(q ? { q } : {}) }),
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
                            placeholder="Cari aset, jenis, pelaksana..."
                        />
                    </div>
                </div>

                {/* Tabel Pemeliharaan */}
                <Card>
                    <DataTable
                        kolom={kolom}
                        baris={daftarPemeliharaan.data}
                        kunciBaris="id_pemeliharaan"
                        kosong={
                            <EmptyState
                                judul={q ? 'Data tidak ditemukan' : 'Belum ada agenda pemeliharaan'}
                                deskripsi={
                                    q
                                        ? 'Tidak ditemukan jadwal pemeliharaan yang cocok dengan pencarian Anda.'
                                        : 'Klik tombol di atas untuk membuat jadwal pemeliharaan berkala aset.'
                                }
                            />
                        }
                    />
                    <Pagination
                        links={daftarPemeliharaan.links}
                        from={daftarPemeliharaan.from}
                        to={daftarPemeliharaan.to}
                        total={daftarPemeliharaan.total}
                    />
                </Card>
            </div>

            {/* Modal Tambah Jadwal Pemeliharaan */}
            <Modal show={modalTambahBuka} onClose={() => setModalTambahBuka(false)} maxWidth="2xl">
                <div className="p-6">
                    <div className="border-b border-line pb-4">
                        <h3 className="text-xl font-bold text-ink-900">Tambah Jadwal Pemeliharaan</h3>
                        <p className="text-xs text-ink-500">Agendakan pemeliharaan preventif atau servis rutin untuk aset tetap.</p>
                    </div>

                    <form onSubmit={kirimTambah} className="my-5 space-y-4">
                        <Field label="Pilih Aset yang Akan Dipelihara" htmlFor="id_aset" error={formTambah.errors.id_aset}>
                            <SelectInput
                                id="id_aset"
                                className="block w-full"
                                value={formTambah.data.id_aset}
                                onChange={(e) => formTambah.setData('id_aset', e.target.value)}
                                required
                            >
                                <option value="">-- Pilih aset tetap --</option>
                                {daftarAset.map((a) => (
                                    <option key={a.id_aset} value={a.id_aset}>
                                        [{a.kode_aset}] {a.nama_barang} ({a.merek_tipe})
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>

                        <Field
                            label="Jenis Pemeliharaan"
                            htmlFor="jenis_pemeliharaan"
                            error={formTambah.errors.jenis_pemeliharaan}
                            petunjuk="Contoh: Servis Rutin AC, Pembersihan Debu PC Lab, Kalibrasi Sensor"
                        >
                            <TextInput
                                id="jenis_pemeliharaan"
                                className="block w-full"
                                value={formTambah.data.jenis_pemeliharaan}
                                onChange={(e) => formTambah.setData('jenis_pemeliharaan', e.target.value)}
                                placeholder="Tuliskan nama kegiatan pemeliharaan..."
                                required
                            />
                        </Field>

                        <Field label="Tanggal Jadwal Pelaksanaan" htmlFor="tanggal_jadwal" error={formTambah.errors.tanggal_jadwal}>
                            <TextInput
                                id="tanggal_jadwal"
                                type="date"
                                className="block w-full"
                                value={formTambah.data.tanggal_jadwal}
                                onChange={(e) => formTambah.setData('tanggal_jadwal', e.target.value)}
                                required
                            />
                        </Field>

                        <Field label="Pilih Pelaksana Kegiatan">
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-3">
                                    <input
                                        type="radio"
                                        name="tipe_pelaksana"
                                        value="teknisi"
                                        checked={formTambah.data.tipe_pelaksana === 'teknisi'}
                                        onChange={(e) => formTambah.setData('tipe_pelaksana', e.target.value)}
                                        className="text-brand-600 focus:ring-brand-600"
                                    />
                                    <span className="text-xs font-semibold text-ink-900">Teknisi Fakultas</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-3">
                                    <input
                                        type="radio"
                                        name="tipe_pelaksana"
                                        value="vendor"
                                        checked={formTambah.data.tipe_pelaksana === 'vendor'}
                                        onChange={(e) => formTambah.setData('tipe_pelaksana', e.target.value)}
                                        className="text-brand-600 focus:ring-brand-600"
                                    />
                                    <span className="text-xs font-semibold text-ink-900">Vendor Eksternal</span>
                                </label>
                            </div>
                        </Field>

                        {formTambah.data.tipe_pelaksana === 'teknisi' ? (
                            <Field label="Teknisi Pelaksana" htmlFor="id_pelaksana" error={formTambah.errors.id_pelaksana}>
                                <SelectInput
                                    id="id_pelaksana"
                                    className="block w-full"
                                    value={formTambah.data.id_pelaksana}
                                    onChange={(e) => formTambah.setData('id_pelaksana', e.target.value)}
                                    required
                                >
                                    <option value="">-- Pilih teknisi --</option>
                                    {daftarTeknisi.map((t) => (
                                        <option key={t.id_pengguna} value={t.id_pengguna}>
                                            {t.nama_lengkap} (NIP: {t.nip || '-'})
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>
                        ) : (
                            <Field label="Vendor Rekanan" htmlFor="id_vendor" error={formTambah.errors.id_vendor}>
                                <SelectInput
                                    id="id_vendor"
                                    className="block w-full"
                                    value={formTambah.data.id_vendor}
                                    onChange={(e) => formTambah.setData('id_vendor', e.target.value)}
                                    required
                                >
                                    <option value="">-- Pilih vendor --</option>
                                    {daftarVendor.map((v) => (
                                        <option key={v.id_vendor} value={v.id_vendor}>
                                            {v.nama_vendor}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>
                        )}

                        <Field label="Estimasi Anggaran (Opsional)" htmlFor="biaya" error={formTambah.errors.biaya}>
                            <TextInput
                                id="biaya"
                                type="number"
                                className="block w-full"
                                value={formTambah.data.biaya}
                                onChange={(e) => formTambah.setData('biaya', e.target.value)}
                                placeholder="Contoh: 350000"
                            />
                        </Field>

                        <Field label="Uraian Rencana Kerja (Opsional)" htmlFor="uraian" error={formTambah.errors.uraian}>
                            <textarea
                                id="uraian"
                                rows={3}
                                className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                value={formTambah.data.uraian}
                                onChange={(e) => formTambah.setData('uraian', e.target.value)}
                                placeholder="Rincian prosedur atau komponen yang akan dibersihkan/diperiksa..."
                            />
                        </Field>

                        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                            <SecondaryButton onClick={() => setModalTambahBuka(false)} disabled={formTambah.processing}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={formTambah.processing}>
                                {formTambah.processing ? 'Menyimpan...' : 'Simpan Jadwal'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Perbarui Realisasi Pemeliharaan */}
            <Modal show={modalUpdateBuka} onClose={() => setModalUpdateBuka(false)} maxWidth="xl">
                {targetItem && (
                    <div className="p-6">
                        <div className="border-b border-line pb-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                Realisasi Pemeliharaan
                            </span>
                            <h3 className="text-xl font-bold text-ink-900">{targetItem.jenis_pemeliharaan}</h3>
                            <p className="text-xs text-ink-600">
                                Aset: {targetItem.nama_barang} ({targetItem.kode_aset})
                            </p>
                        </div>

                        <form onSubmit={kirimUpdate} className="my-5 space-y-4">
                            <Field label="Status Pemeliharaan">
                                <SelectInput
                                    className="block w-full"
                                    value={formUpdate.data.status}
                                    onChange={(e) => formUpdate.setData('status', e.target.value)}
                                >
                                    <option value="selesai">Selesai Dilaksanakan</option>
                                    <option value="dalam_proses">Sedang Berjalan</option>
                                    <option value="dibatalkan">Dibatalkan</option>
                                </SelectInput>
                            </Field>

                            <Field label="Tanggal Pelaksanaan" htmlFor="tanggal_pelaksanaan">
                                <TextInput
                                    id="tanggal_pelaksanaan"
                                    type="date"
                                    className="block w-full"
                                    value={formUpdate.data.tanggal_pelaksanaan}
                                    onChange={(e) => formUpdate.setData('tanggal_pelaksanaan', e.target.value)}
                                />
                            </Field>

                            <Field label="Uraian Hasil Pemeliharaan" htmlFor="uraian_update">
                                <textarea
                                    id="uraian_update"
                                    rows={3}
                                    className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                    value={formUpdate.data.uraian}
                                    onChange={(e) => formUpdate.setData('uraian', e.target.value)}
                                    placeholder="Jelaskan tindakan yang telah selesai dikerjakan..."
                                />
                            </Field>

                            <Field label="Biaya Riil / Pengeluaran (Rp)" htmlFor="biaya_update">
                                <TextInput
                                    id="biaya_update"
                                    type="number"
                                    className="block w-full"
                                    value={formUpdate.data.biaya}
                                    onChange={(e) => formUpdate.setData('biaya', e.target.value)}
                                    placeholder="Contoh: 300000"
                                />
                            </Field>

                            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                                <SecondaryButton onClick={() => setModalUpdateBuka(false)} disabled={formUpdate.processing}>
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton disabled={formUpdate.processing}>
                                    {formUpdate.processing ? 'Menyimpan...' : 'Simpan Realisasi'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
