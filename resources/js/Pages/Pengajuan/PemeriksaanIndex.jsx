import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import TabNav from '@/Components/ui/TabNav';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function formatRupiah(angka) {
    if (!angka || angka === 0) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka);
}

export default function PemeriksaanIndex({ daftarPemeriksaan, detailAktif, tabAktif, filters }) {
    const [q, setQ] = useState(filters.q || '');
    const [jenis, setJenis] = useState(filters.jenis || '');
    const [modalBuka, setModalBuka] = useState(false);
    const [targetPengajuan, setTargetPengajuan] = useState(null);
    const isFirstRender = useRef(true);

    const formPemeriksaan = useForm({
        keputusan: 'teruskan',
        catatan: '',
    });

    const terapkanFilter = (pencarian, filterJenis, tab) => {
        router.get(
            route('pemeriksaan.index'),
            {
                q: pencarian,
                jenis: filterJenis,
                tab: tab,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    // Live search dengan debounce ~350ms
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            terapkanFilter(q, jenis, tabAktif);
        }, 350);

        return () => clearTimeout(timer);
    }, [q, jenis]);

    const handleSearch = (e) => {
        e.preventDefault();
        terapkanFilter(q, jenis, tabAktif);
    };

    const handleGantiJenis = (e) => {
        const val = e.target.value;
        setJenis(val);
    };

    const handleGantiTab = (tabBaru) => {
        terapkanFilter(q, jenis, tabBaru);
    };

    const bukaModalPemeriksaan = (item) => {
        setTargetPengajuan(item);
        formPemeriksaan.reset();
        formPemeriksaan.clearErrors();
        formPemeriksaan.setData({
            keputusan: 'teruskan',
            catatan: '',
        });
        setModalBuka(true);
    };

    const tutupModal = () => {
        if (!formPemeriksaan.processing) {
            setModalBuka(false);
            setTargetPengajuan(null);
        }
    };

    const simpanKeputusan = (e) => {
        e.preventDefault();
        if (!targetPengajuan) return;

        formPemeriksaan.post(route('pemeriksaan.proses', targetPengajuan.id_pengajuan), {
            preserveScroll: true,
            onSuccess: () => {
                tutupModal();
            },
        });
    };

    const kolom = [
        {
            kunci: 'nomor_pengajuan',
            judul: 'Nomor Pengajuan',
            className: 'font-semibold text-ink-900 whitespace-nowrap',
        },
        {
            kunci: 'pemohon_nama',
            judul: 'Pemohon',
            render: (b) => (
                <div>
                    <p className="font-medium text-ink-900">{b.pemohon_nama}</p>
                    <p className="text-xs text-ink-500">{b.unit_nama}</p>
                </div>
            ),
        },
        {
            judul: 'Jenis',
            render: (b) => <Badge nada="netral">{b.jenis_label}</Badge>,
        },
        {
            kunci: 'tanggal_pengajuan',
            judul: 'Tanggal',
            className: 'whitespace-nowrap text-ink-600',
        },
        {
            kunci: 'keterangan_singkat',
            judul: 'Perihal Pengajuan',
            className: 'max-w-xs truncate',
        },
        {
            judul: 'Estimasi Nilai',
            render: (b) => (
                <span className="font-medium text-ink-900">{formatRupiah(b.total_estimasi)}</span>
            ),
        },
        {
            judul: 'Status',
            render: (b) => <Badge nada={b.status_nada}>{b.status_label}</Badge>,
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (b) => (
                <button
                    type="button"
                    onClick={() => bukaModalPemeriksaan(b)}
                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        b.bisa_diperiksa
                            ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                            : 'border border-line bg-white text-ink-700 hover:bg-surface'
                    }`}
                >
                    {b.bisa_diperiksa ? 'Periksa berkas' : 'Lihat detail'}
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Pemeriksaan pengajuan" />

            <PageHeader
                breadcrumb={['FTI', 'Pemeriksaan pengajuan']}
                judul="Pemeriksaan pengajuan"
                deskripsi="Verifikasi kelengkapan berkas, spesifikasi aset, dan kelaikan usulan pengajuan dari unit kerja."
            />

            <div className="space-y-4">
                {/* Tab Status */}
                <TabNav
                    tab={[
                        {
                            label: 'Menunggu pemeriksaan',
                            href: route('pemeriksaan.index', {
                                tab: 'antrean',
                                ...(q ? { q } : {}),
                                ...(jenis ? { jenis } : {}),
                            }),
                            aktif: tabAktif === 'antrean',
                        },
                        {
                            label: 'Semua pengajuan',
                            href: route('pemeriksaan.index', {
                                tab: 'semua',
                                ...(q ? { q } : {}),
                                ...(jenis ? { jenis } : {}),
                            }),
                            aktif: tabAktif === 'semua',
                        },
                    ]}
                />

                {/* Filter dan Pencarian */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <form onSubmit={handleSearch} className="w-full sm:max-w-xs">
                        <SearchInput
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari nomor, pemohon, perihal..."
                        />
                    </form>

                    <div className="flex items-center gap-2">
                        <SelectInput
                            value={jenis}
                            onChange={handleGantiJenis}
                            className="text-xs"
                        >
                            <option value="">Semua jenis pengajuan</option>
                            <option value="pengadaan">Pengadaan</option>
                            <option value="perbaikan">Perbaikan</option>
                            <option value="mutasi">Mutasi</option>
                            <option value="penghapusan">Penghapusan</option>
                        </SelectInput>

                        {(q || jenis) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQ('');
                                    setJenis('');
                                    terapkanFilter('', '', tabAktif);
                                }}
                                className="text-xs font-semibold text-brand-600 hover:underline"
                            >
                                Reset filter
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabel Pemeriksaan */}
                <Card>
                    <DataTable
                        kolom={kolom}
                        baris={daftarPemeriksaan.data}
                        kunciBaris="id_pengajuan"
                        kosong={
                            <EmptyState
                                judul={
                                    (q || jenis)
                                        ? 'Data tidak ditemukan'
                                        : tabAktif === 'antrean'
                                        ? 'Tidak ada pengajuan untuk diperiksa'
                                        : 'Belum ada pengajuan'
                                }
                                deskripsi={
                                    (q || jenis)
                                        ? 'Tidak ada pengajuan yang cocok dengan kata kunci atau filter yang dipilih.'
                                        : 'Seluruh antrean pengajuan telah selesai diperiksa.'
                                }
                            />
                        }
                    />
                    <Pagination
                        links={daftarPemeriksaan.links}
                        from={daftarPemeriksaan.from}
                        to={daftarPemeriksaan.to}
                        total={daftarPemeriksaan.total}
                    />
                </Card>
            </div>

            {/* Modal Pemeriksaan Berkas */}
            <Modal show={modalBuka} onClose={tutupModal} maxWidth="2xl">
                {targetPengajuan && (
                    <div className="p-6">
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    {targetPengajuan.bisa_diperiksa ? 'Pemeriksaan Operator Aset' : 'Detail Pemeriksaan'}
                                </span>
                                <h3 className="text-xl font-bold text-ink-900">
                                    {targetPengajuan.nomor_pengajuan}
                                </h3>
                                <p className="text-sm text-ink-600">
                                    {targetPengajuan.pemohon_nama} • {targetPengajuan.unit_nama}
                                </p>
                            </div>
                            <Badge nada={targetPengajuan.status_nada}>
                                {targetPengajuan.status_label}
                            </Badge>
                        </div>

                        <div className="my-5 space-y-4">
                            <div className="rounded-lg border border-line bg-surface p-4 text-xs leading-relaxed text-ink-900">
                                <p className="font-semibold text-ink-600">Perihal / Keterangan Usulan:</p>
                                <p className="mt-1">{targetPengajuan.keterangan_singkat}</p>
                                <p className="mt-2 font-semibold text-brand-700">
                                    Total Estimasi: {formatRupiah(targetPengajuan.total_estimasi)}
                                </p>
                            </div>

                            {/* Dokumen Terlampir */}
                            <div className="rounded-lg border border-line p-3">
                                <p className="mb-2 text-xs font-semibold text-ink-600">
                                    Dokumen Lampiran ({targetPengajuan.dokumen?.length || 0}):
                                </p>
                                {!targetPengajuan.dokumen || targetPengajuan.dokumen.length === 0 ? (
                                    <p className="text-xs text-ink-400">Tidak ada berkas dokumen lampiran yang diunggah.</p>
                                ) : (
                                    <ul className="divide-y divide-line rounded border border-line bg-white text-xs">
                                        {targetPengajuan.dokumen.map((doc) => (
                                            <li key={doc.id_dokumen} className="flex items-center justify-between p-2.5">
                                                <span className="font-medium text-ink-900 truncate max-w-xs">{doc.nama_file}</span>
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-semibold text-brand-600 hover:underline"
                                                >
                                                    Unduh / Buka berkas ↗
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Catatan Operator Sebelumnya (Jika Sudah Diperiksa) */}
                            {!targetPengajuan.bisa_diperiksa && targetPengajuan.catatan_operator && (
                                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3.5 text-xs text-ink-900">
                                    <p className="font-semibold text-brand-800">Catatan Pemeriksaan Operator Sebelumnya:</p>
                                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{targetPengajuan.catatan_operator}</p>
                                </div>
                            )}

                            {/* Form Keputusan (Hanya Muncul Jika Status Masih Menunggu Pemeriksaan) */}
                            {targetPengajuan.bisa_diperiksa ? (
                                <form id="form-keputusan-operator" onSubmit={simpanKeputusan} className="space-y-4">
                                    <Field label="Keputusan pemeriksaan berkas">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <label
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                                                    formPemeriksaan.data.keputusan === 'teruskan'
                                                        ? 'border-brand-600 bg-brand-50/50'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="keputusan"
                                                    value="teruskan"
                                                    checked={formPemeriksaan.data.keputusan === 'teruskan'}
                                                    onChange={(e) =>
                                                        formPemeriksaan.setData('keputusan', e.target.value)
                                                    }
                                                    className="mt-0.5 text-brand-600 focus:ring-brand-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">
                                                        Teruskan ke Kepala Kantor
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        Berkas lengkap, spesifikasi valid, dan siap ditinjau.
                                                    </p>
                                                </div>
                                            </label>

                                            <label
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                                                    formPemeriksaan.data.keputusan === 'kembalikan'
                                                        ? 'border-bahaya-600 bg-bahaya-50/50'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="keputusan"
                                                    value="kembalikan"
                                                    checked={formPemeriksaan.data.keputusan === 'kembalikan'}
                                                    onChange={(e) =>
                                                        formPemeriksaan.setData('keputusan', e.target.value)
                                                    }
                                                    className="mt-0.5 text-bahaya-600 focus:ring-bahaya-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">
                                                        Kembalikan ke Pemohon
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        Berkas belum lengkap atau memerlukan perbaikan.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </Field>

                                    <Field
                                        label="Catatan pemeriksaan operator"
                                        error={formPemeriksaan.errors.catatan}
                                        petunjuk={
                                            formPemeriksaan.data.keputusan === 'kembalikan'
                                                ? 'Wajib diisi untuk menjelaskan kekurangan atau revisi yang harus dilengkapi pemohon.'
                                                : 'Tambahkan catatan jika terdapat rekomendasi spesifikasi teknis.'
                                        }
                                    >
                                        <textarea
                                            rows={3}
                                            value={formPemeriksaan.data.catatan}
                                            onChange={(e) =>
                                                formPemeriksaan.setData('catatan', e.target.value)
                                            }
                                            placeholder={
                                                formPemeriksaan.data.keputusan === 'kembalikan'
                                                    ? 'Jelaskan rincian kekurangan dokumen atau spesifikasi...'
                                                    : 'Catatan pemeriksaan operasional (opsional)...'
                                            }
                                            className="w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        />
                                    </Field>
                                </form>
                            ) : (
                                <Alert nada="info">
                                    Pengajuan ini sudah diverifikasi atau telah diteruskan ke tahap lanjutan. Mode hanya baca aktif.
                                </Alert>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                            {targetPengajuan.bisa_diperiksa ? (
                                <>
                                    <SecondaryButton
                                        type="button"
                                        onClick={tutupModal}
                                        disabled={formPemeriksaan.processing}
                                    >
                                        Batal
                                    </SecondaryButton>
                                    <PrimaryButton
                                        type="submit"
                                        form="form-keputusan-operator"
                                        disabled={formPemeriksaan.processing}
                                    >
                                        Simpan keputusan
                                    </PrimaryButton>
                                </>
                            ) : (
                                <SecondaryButton
                                    type="button"
                                    onClick={tutupModal}
                                >
                                    Tutup
                                </SecondaryButton>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
