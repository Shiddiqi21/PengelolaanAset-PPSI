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
import TautanAksi from '@/Components/ui/TautanAksi';
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

// Badge kondisi aset
function KondisiBadge({ kondisi }) {
    const map = {
        baik: { label: 'Baik', nada: 'sukses' },
        rusak_ringan: { label: 'Rusak Ringan', nada: 'peringatan' },
        rusak_berat: { label: 'Rusak Berat', nada: 'bahaya' },
        dalam_perbaikan: { label: 'Dalam Perbaikan', nada: 'info' },
    };
    const meta = map[kondisi] ?? { label: kondisi ?? '-', nada: 'netral' };
    return <Badge nada={meta.nada}>{meta.label}</Badge>;
}

export default function TugasIndex({ daftarTugas, filters }) {
    const [q, setQ] = useState(filters.q || '');
    const [modalBuka, setModalBuka] = useState(false);
    const [targetTugas, setTargetTugas] = useState(null);
    const isFirstRender = useRef(true);

    const formUpdate = useForm({
        status_perbaikan: 'selesai',
        hasil_pemeriksaan: '',
        hasil_perbaikan: '',
        biaya_aktual: '',
    });

    const terapkanFilter = (keyword) => {
        router.get(
            route('teknisi.tugas'),
            { q: keyword || undefined },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            terapkanFilter(q);
        }, 350);

        return () => clearTimeout(timer);
    }, [q]);

    const bukaModal = (item) => {
        setTargetTugas(item);
        formUpdate.reset();
        formUpdate.clearErrors();
        formUpdate.setData({
            status_perbaikan: 'selesai',
            hasil_pemeriksaan: item.hasil_pemeriksaan || '',
            hasil_perbaikan: item.hasil_perbaikan || '',
            biaya_aktual: item.biaya_aktual ? String(item.biaya_aktual) : '',
        });
        setModalBuka(true);
    };

    const tutupModal = () => {
        if (!formUpdate.processing) {
            setModalBuka(false);
            setTargetTugas(null);
        }
    };

    const kirimUpdate = (e) => {
        e.preventDefault();
        if (!targetTugas) return;

        formUpdate.post(route('teknisi.tugas.update', targetTugas.id_item_perbaikan), {
            preserveScroll: true,
            onSuccess: () => {
                tutupModal();
            },
        });
    };

    const isSelesai = formUpdate.data.status_perbaikan === 'selesai';
    const isPerluVendor = formUpdate.data.status_perbaikan === 'perlu_vendor';

    const kolom = [
        {
            judul: 'Tiket & Aset',
            render: (b) => (
                <div>
                    <p className="font-semibold text-brand-700 whitespace-nowrap font-mono text-sm">{b.nomor_pengajuan}</p>
                    <p className="mt-0.5 font-medium text-ink-900">{b.nama_barang}</p>
                    <p className="text-xs text-ink-500 font-mono">{b.kode_aset} · {b.merek_tipe}</p>
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
            judul: 'Kondisi Aset',
            render: (b) => <KondisiBadge kondisi={b.kondisi_aset} />,
        },
        {
            judul: 'Deskripsi Kerusakan',
            render: (b) => (
                <div className="max-w-xs text-xs text-ink-700 leading-relaxed line-clamp-2" title={b.deskripsi_kerusakan}>
                    {b.deskripsi_kerusakan}
                </div>
            ),
        },
        {
            judul: 'Tanggal Mulai',
            render: (b) => (
                <span className="text-xs text-ink-600 whitespace-nowrap">{b.tanggal_mulai}</span>
            ),
        },
        {
            judul: 'Status',
            render: () => (
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-info-500 animate-pulse" />
                    <span className="text-sm font-medium text-info-700">Dikerjakan</span>
                </span>
            ),
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (b) => (
                <button
                    type="button"
                    onClick={() => bukaModal(b)}
                    className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                    Perbarui progres
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Tugas Perbaikan Teknisi" />

            <PageHeader
                breadcrumb={['FTI', 'Tugas perbaikan']}
                judul="Tugas perbaikan aktif"
                deskripsi="Daftar pekerjaan perbaikan inventaris fakultas yang sedang ditugaskan kepada Anda."
            >
                <TautanAksi href={route('teknisi.riwayat')}>
                    Lihat riwayat selesai →
                </TautanAksi>
            </PageHeader>

            {/* Info Panel */}
            <div className="mb-4 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-xs text-info-800">
                <strong>Panduan:</strong> Klik <strong>Perbarui progres</strong> untuk mencatat hasil pemeriksaan, tindakan perbaikan, dan melaporkan status penyelesaian. Jika aset membutuhkan penanganan vendor eksternal, pilih opsi <em>Perlu Rekanan Vendor</em>.
            </div>

            <div className="space-y-4">
                <div className="w-full sm:max-w-xs">
                    <SearchInput
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari tiket, aset, pemohon..."
                    />
                </div>

                <Card>
                    <DataTable
                        kolom={kolom}
                        baris={daftarTugas.data}
                        kunciBaris="id_item_perbaikan"
                        kosong={
                            <EmptyState
                                judul={q ? 'Tugas tidak ditemukan' : 'Tidak ada tugas aktif'}
                                deskripsi={
                                    q
                                        ? 'Tidak ditemukan tugas perbaikan yang cocok dengan kata kunci pencarian.'
                                        : 'Saat ini belum ada tugas perbaikan baru yang ditugaskan kepada Anda. Tugas akan muncul di sini setelah operator menugaskan perbaikan.'
                                }
                            />
                        }
                    />
                    <Pagination
                        links={daftarTugas.links}
                        from={daftarTugas.from}
                        to={daftarTugas.to}
                        total={daftarTugas.total}
                    />
                </Card>
            </div>

            {/* Modal Perbarui Progres / Selesaikan */}
            <Modal show={modalBuka} onClose={tutupModal} maxWidth="2xl">
                {targetTugas && (
                    <div className="p-6">
                        {/* Header Modal */}
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Pembaruan Progres & Hasil Perbaikan
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">{targetTugas.nomor_pengajuan}</h3>
                                <p className="text-xs text-ink-600">
                                    Pengusul: {targetTugas.pemohon_nama} &mdash; {targetTugas.unit_nama}
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-info-50 px-3 py-1 text-xs font-semibold text-info-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-info-500 animate-pulse" />
                                Sedang Dikerjakan
                            </span>
                        </div>

                        <div className="my-5 space-y-4">
                            {/* Rincian Aset */}
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge nada="info">{targetTugas.kode_aset}</Badge>
                                        <span className="font-semibold text-ink-900 text-sm">{targetTugas.nama_barang}</span>
                                        {targetTugas.merek_tipe && (
                                            <span className="text-ink-500">({targetTugas.merek_tipe})</span>
                                        )}
                                    </div>
                                    <KondisiBadge kondisi={targetTugas.kondisi_aset} />
                                </div>

                                <div className="border-t border-line/60 pt-2">
                                    <span className="font-medium text-ink-500 block mb-1">Keluhan / Deskripsi Kerusakan dari Pemohon:</span>
                                    <p className="text-ink-800 whitespace-pre-wrap leading-relaxed">
                                        {targetTugas.deskripsi_kerusakan}
                                    </p>
                                </div>

                                {targetTugas.foto_url && (
                                    <div className="border-t border-line/60 pt-2">
                                        <span className="font-medium text-ink-500 block mb-1">Bukti Foto Kerusakan:</span>
                                        <a href={targetTugas.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                            <img
                                                src={targetTugas.foto_url}
                                                alt="Foto Kerusakan"
                                                className="h-28 w-28 rounded-lg object-cover border border-line group-hover:opacity-90 shadow-sm"
                                            />
                                            <span className="block text-[11px] text-brand-600 group-hover:underline mt-1 font-medium">
                                                Lihat foto ukuran penuh ↗
                                            </span>
                                        </a>
                                    </div>
                                )}

                                {targetTugas.estimasi_biaya > 0 && (
                                    <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                                        <span className="text-ink-500">Estimasi biaya perbaikan:</span>
                                        <span className="font-semibold text-ink-900">{formatRupiah(targetTugas.estimasi_biaya)}</span>
                                    </div>
                                )}

                                <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                                    <span className="text-ink-500">Mulai ditugaskan:</span>
                                    <span className="font-medium text-ink-900">{targetTugas.tanggal_mulai}</span>
                                </div>
                            </div>

                            {/* Formulir Update Teknisi */}
                            <form id="form-update-teknisi" onSubmit={kirimUpdate} className="space-y-4">
                                {/* Pilih status */}
                                <Field label="Status Penanganan Perbaikan" htmlFor="status_perbaikan">
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {[
                                            {
                                                value: 'selesai',
                                                label: 'Selesai',
                                                sub: 'Aset kembali berfungsi normal',
                                                nada: 'sukses',
                                            },
                                            {
                                                value: 'dalam_perbaikan',
                                                label: 'Masih Dikerjakan',
                                                sub: 'Simpan progres sementara',
                                                nada: 'info',
                                            },
                                            {
                                                value: 'perlu_vendor',
                                                label: 'Perlu Vendor',
                                                sub: 'Kerusakan butuh pihak luar',
                                                nada: 'peringatan',
                                            },
                                        ].map((opt) => (
                                            <label
                                                key={opt.value}
                                                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                                                    formUpdate.data.status_perbaikan === opt.value
                                                        ? opt.nada === 'sukses'
                                                            ? 'border-brand-500 bg-brand-50/60'
                                                            : opt.nada === 'peringatan'
                                                              ? 'border-warn-500 bg-warn-50/60'
                                                              : 'border-info-500 bg-info-50/60'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="status_perbaikan"
                                                    value={opt.value}
                                                    checked={formUpdate.data.status_perbaikan === opt.value}
                                                    onChange={(e) => formUpdate.setData('status_perbaikan', e.target.value)}
                                                    className="mt-0.5 text-brand-600 focus:ring-brand-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">{opt.label}</p>
                                                    <p className="text-[11px] text-ink-500">{opt.sub}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </Field>

                                {/* Alert perlu vendor */}
                                {isPerluVendor && (
                                    <div className="rounded-lg border border-warn-200 bg-warn-50 p-3 text-xs text-warn-800">
                                        <strong>Catatan:</strong> Setelah disimpan, Operator Aset akan menerima notifikasi dan dapat menugaskan vendor eksternal untuk menyelesaikan perbaikan ini.
                                    </div>
                                )}

                                <Field
                                    label="Analisis / Hasil Pemeriksaan Fisik"
                                    htmlFor="hasil_pemeriksaan"
                                    error={formUpdate.errors.hasil_pemeriksaan}
                                    petunjuk="Tuliskan temuan penyebab kerusakan dari hasil pengecekan teknis Anda."
                                >
                                    <textarea
                                        id="hasil_pemeriksaan"
                                        rows={3}
                                        className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        value={formUpdate.data.hasil_pemeriksaan}
                                        onChange={(e) => formUpdate.setData('hasil_pemeriksaan', e.target.value)}
                                        placeholder="Contoh: Terjadi korsleting pada adaptor daya internal dan kabel fleksibel aus..."
                                    />
                                </Field>

                                <Field
                                    label={isSelesai ? 'Tindakan / Hasil Perbaikan (Wajib)' : 'Tindakan / Hasil Perbaikan (Opsional)'}
                                    htmlFor="hasil_perbaikan"
                                    error={formUpdate.errors.hasil_perbaikan}
                                    petunjuk={isSelesai ? 'Wajib diisi — jelaskan tindakan yang dilakukan hingga aset kembali berfungsi.' : undefined}
                                >
                                    <textarea
                                        id="hasil_perbaikan"
                                        rows={3}
                                        className="block w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        value={formUpdate.data.hasil_perbaikan}
                                        onChange={(e) => formUpdate.setData('hasil_perbaikan', e.target.value)}
                                        placeholder="Contoh: Penggantian kapasitor power supply dan pembersihan kipas pendingin..."
                                    />
                                </Field>

                                <Field
                                    label="Biaya Aktual Komponen / Suku Cadang (Opsional)"
                                    htmlFor="biaya_aktual"
                                    error={formUpdate.errors.biaya_aktual}
                                    petunjuk="Isikan total biaya pembelian suku cadang jika ada."
                                >
                                    <TextInput
                                        id="biaya_aktual"
                                        type="number"
                                        min="0"
                                        className="block w-full"
                                        value={formUpdate.data.biaya_aktual}
                                        onChange={(e) => formUpdate.setData('biaya_aktual', e.target.value)}
                                        placeholder="Contoh: 150000"
                                    />
                                </Field>
                            </form>
                        </div>

                        <div className="flex items-center justify-between border-t border-line pt-4">
                            <p className="text-xs text-ink-500">
                                {isSelesai
                                    ? '✓ Status aset akan diperbarui menjadi "Aktif / Baik" setelah disimpan.'
                                    : isPerluVendor
                                      ? '⚠ Operator akan diberitahu untuk menugaskan vendor eksternal.'
                                      : 'Progres sementara akan disimpan tanpa mengubah status pengajuan.'}
                            </p>
                            <div className="flex items-center gap-3">
                                <SecondaryButton onClick={tutupModal} disabled={formUpdate.processing}>
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
                                    form="form-update-teknisi"
                                    disabled={formUpdate.processing}
                                >
                                    {formUpdate.processing
                                        ? 'Menyimpan...'
                                        : isSelesai
                                          ? 'Tandai Selesai'
                                          : isPerluVendor
                                            ? 'Laporkan ke Operator'
                                            : 'Simpan Progres'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
