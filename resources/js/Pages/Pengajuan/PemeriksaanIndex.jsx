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
import Timeline from '@/Components/ui/Timeline';
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

    useEffect(() => {
        if (detailAktif) {
            bukaModalPemeriksaan(detailAktif);
        }
    }, [detailAktif]);

    const timelineItems = (targetPengajuan?.riwayat || []).map((r) => {
        const isSelesai = ['disetujui_pimpinan', 'selesai', 'disetujui_kadep'].includes(r.status_baru);

        return {
            ikon: isSelesai ? 'selesai' : 'jadwal',
            judul: `${r.pengguna_nama} (${r.pengguna_peran})`,
            detail: r.catatan,
            waktu: r.waktu,
        };
    });

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
                b.jenis_pengajuan === 'mutasi' || b.jenis_pengajuan === 'penghapusan' ? (
                    <span className="text-xs text-ink-500">Non-anggaran</span>
                ) : (
                    <span className="font-medium text-ink-900">{formatRupiah(b.total_estimasi)}</span>
                )
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
                    <div className="max-h-[85vh] overflow-y-auto p-6">
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
                                <p className="font-semibold text-ink-600 uppercase tracking-wider">Perihal & Keterangan Usulan:</p>
                                <p className="mt-1 font-medium text-ink-900">{targetPengajuan.keterangan_singkat}</p>
                                {targetPengajuan.keterangan && targetPengajuan.keterangan !== targetPengajuan.keterangan_singkat && (
                                    <pre className="mt-2 border-t border-line/60 pt-2 font-sans whitespace-pre-wrap text-ink-700">
                                        {targetPengajuan.keterangan}
                                    </pre>
                                )}
                                {targetPengajuan.jenis_pengajuan === 'mutasi' ? (
                                    <p className="mt-2 text-xs font-semibold text-brand-700">
                                        Jenis: Pengajuan Mutasi Aset (Non-anggaran)
                                    </p>
                                ) : targetPengajuan.jenis_pengajuan === 'penghapusan' ? (
                                    <p className="mt-2 text-xs font-semibold text-brand-700">
                                        Jenis: Pengajuan Penghapusan Aset (Nilai Buku: {formatRupiah(targetPengajuan.total_nilai_perolehan || 0)})
                                    </p>
                                ) : (
                                    targetPengajuan.total_estimasi > 0 && (
                                        <p className="mt-2 font-semibold text-brand-700">
                                            Total Estimasi: {formatRupiah(targetPengajuan.total_estimasi)}
                                        </p>
                                    )
                                )}
                            </div>

                            {/* Rincian Objek Usulan */}
                            <div className="rounded-lg border border-line p-3.5 bg-white">
                                <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-700">
                                        {targetPengajuan.jenis_pengajuan === 'mutasi'
                                            ? `Rincian Objek Usulan Mutasi (${targetPengajuan.items?.length || 0} Aset)`
                                            : targetPengajuan.jenis_pengajuan === 'pengadaan'
                                            ? `Rincian Barang yang Diusulkan (${targetPengajuan.items?.length || 0} Item)`
                                            : targetPengajuan.jenis_pengajuan === 'perbaikan'
                                            ? `Rincian Aset yang Memerlukan Perbaikan (${targetPengajuan.items?.length || 0} Aset)`
                                            : targetPengajuan.jenis_pengajuan === 'penghapusan'
                                            ? `Rincian Aset yang Diusulkan Dihapus (${targetPengajuan.items?.length || 0} Aset)`
                                            : `Rincian Objek Usulan (${targetPengajuan.items?.length || 0})`}
                                    </h4>
                                    {targetPengajuan.jenis_pengajuan === 'mutasi' && targetPengajuan.mutasi_meta?.jenis_mutasi && (
                                        <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                                            {targetPengajuan.mutasi_meta.jenis_mutasi}
                                        </span>
                                    )}
                                </div>

                                {(!targetPengajuan.items || targetPengajuan.items.length === 0) ? (
                                    <p className="py-2 text-xs text-ink-400">Tidak ada rincian objek/barang yang tercatat.</p>
                                ) : targetPengajuan.jenis_pengajuan === 'mutasi' ? (
                                    <div className="space-y-3">
                                        {targetPengajuan.items.map((item, idx) => (
                                            <div key={item.id || idx} className="rounded-lg border border-line bg-surface/60 p-3 text-xs">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="font-semibold text-ink-900">{item.nama_barang}</span>
                                                        {item.kode_aset && item.kode_aset !== '-' && (
                                                            <span className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink-600">
                                                                {item.kode_aset}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Badge nada="info">{item.kategori || 'Mutasi'}</Badge>
                                                </div>

                                                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <div className="rounded border border-line/60 bg-white p-2">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Lokasi & PJ Asal</p>
                                                        <p className="mt-1 font-medium text-ink-900">{item.ruangan_asal || '-'}</p>
                                                        <p className="text-[11px] text-ink-600">PJ: {item.pj_asal || '-'}</p>
                                                    </div>
                                                    <div className="rounded border border-brand-200 bg-brand-50/40 p-2">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">Lokasi & PJ Tujuan</p>
                                                        <p className="mt-1 font-medium text-brand-900">{item.ruangan_tujuan || '-'}</p>
                                                        <p className="text-[11px] text-brand-700">PJ: {item.pj_tujuan || '-'}</p>
                                                    </div>
                                                </div>

                                                {(item.tanggal_mutasi || item.alasan_mutasi) && (
                                                    <div className="mt-2 flex flex-col gap-1 border-t border-line/40 pt-2 text-[11px] text-ink-600">
                                                        {item.tanggal_mutasi && item.tanggal_mutasi !== '-' && (
                                                            <p><span className="font-semibold text-ink-700">Usulan Pemindahan:</span> {item.tanggal_mutasi}</p>
                                                        )}
                                                        {item.alasan_mutasi && item.alasan_mutasi !== '-' && (
                                                            <p><span className="font-semibold text-ink-700">Alasan:</span> {item.alasan_mutasi}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : targetPengajuan.jenis_pengajuan === 'pengadaan' ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-line text-ink-500">
                                                    <th className="pb-1.5 font-semibold">No</th>
                                                    <th className="pb-1.5 font-semibold">Nama Barang & Spesifikasi</th>
                                                    <th className="pb-1.5 font-semibold text-center">Jumlah</th>
                                                    <th className="pb-1.5 font-semibold text-right">Estimasi Satuan</th>
                                                    <th className="pb-1.5 font-semibold text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line/60">
                                                {targetPengajuan.items.map((item, idx) => (
                                                    <tr key={item.id || idx}>
                                                        <td className="py-2 text-ink-500">{idx + 1}</td>
                                                        <td className="py-2">
                                                            <p className="font-medium text-ink-900">{item.nama_barang}</p>
                                                            <p className="text-[11px] text-ink-500">{item.spesifikasi || '-'}</p>
                                                            {item.kategori && (
                                                                <span className="mt-0.5 inline-block text-[10px] text-ink-400">
                                                                    Kategori: {item.kategori}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 text-center font-medium text-ink-900">{item.jumlah} unit</td>
                                                        <td className="py-2 text-right text-ink-600">{formatRupiah(item.harga_satuan)}</td>
                                                        <td className="py-2 text-right font-medium text-ink-900">{formatRupiah(item.subtotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : targetPengajuan.jenis_pengajuan === 'perbaikan' ? (
                                    <div className="space-y-2.5">
                                        {targetPengajuan.items.map((item, idx) => (
                                            <div key={item.id || idx} className="rounded-lg border border-line bg-surface/50 p-2.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-semibold text-ink-900">{item.nama_barang}</span>
                                                        {item.kode_aset && item.kode_aset !== '-' && (
                                                            <span className="ml-2 font-mono text-[11px] text-ink-500">({item.kode_aset})</span>
                                                        )}
                                                        {item.merek_tipe && item.merek_tipe !== '-' && (
                                                            <span className="ml-1 text-ink-500">({item.merek_tipe})</span>
                                                        )}
                                                    </div>
                                                    <span className="font-semibold text-brand-700">
                                                        {formatRupiah(item.estimasi_biaya || item.subtotal)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[11px] text-ink-600">
                                                    <span className="font-semibold text-ink-700">Gejala Kerusakan:</span> {item.spesifikasi || item.deskripsi_kerusakan || '-'}
                                                </p>
                                                {item.foto_url && (
                                                    <div className="mt-2 border-t border-line/60 pt-2">
                                                        <a href={item.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                                            <img src={item.foto_url} alt="Foto Kerusakan" className="h-20 w-20 rounded-lg object-cover border border-line group-hover:opacity-90 shadow-sm" />
                                                            <span className="block text-[11px] text-brand-600 group-hover:underline mt-1 font-medium">Lihat foto ↗</span>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : targetPengajuan.jenis_pengajuan === 'penghapusan' ? (
                                    <div className="space-y-2.5">
                                        {targetPengajuan.items.map((item, idx) => (
                                            <div key={item.id || idx} className="rounded-lg border border-line bg-surface/50 p-2.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-semibold text-ink-900">{item.nama_barang}</span>
                                                        {item.kode_aset && item.kode_aset !== '-' && (
                                                            <span className="ml-2 font-mono text-[11px] text-ink-500">({item.kode_aset})</span>
                                                        )}
                                                    </div>
                                                    {item.jalur_penghapusan && (
                                                        <Badge nada="peringatan">
                                                            {item.jalur_penghapusan.replace('_', ' ')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-[11px] text-ink-600">
                                                    <span className="font-semibold text-ink-700">Keterangan:</span> {item.spesifikasi || '-'}
                                                </p>
                                                {item.pihak_penerima && (
                                                    <p className="text-[11px] text-ink-600">
                                                        <span className="font-semibold text-ink-700">Penerima/Mitra:</span> {item.pihak_penerima}
                                                    </p>
                                                )}
                                                {item.nilai_penjualan > 0 && (
                                                    <p className="text-[11px] font-semibold text-brand-700">
                                                        Nilai Penjualan: {formatRupiah(item.nilai_penjualan)}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {targetPengajuan.items.map((item, idx) => (
                                            <div key={item.id || idx} className="flex items-center justify-between border-b border-line/50 py-1.5 text-xs">
                                                <div>
                                                    <p className="font-medium text-ink-900">{item.nama_barang}</p>
                                                    <p className="text-[11px] text-ink-500">{item.spesifikasi || '-'}</p>
                                                </div>
                                                <span className="font-semibold text-ink-900">{item.jumlah || 1} unit</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                            {/* Riwayat Proses */}
                            <div className="rounded-lg border border-line p-3">
                                <p className="mb-2 text-xs font-semibold text-ink-600">
                                    Riwayat Proses Penanganan:
                                </p>
                                {timelineItems.length === 0 ? (
                                    <p className="text-xs text-ink-400">Belum ada riwayat proses tercatat.</p>
                                ) : (
                                    <div className="max-h-56 overflow-y-auto pr-1">
                                        <Timeline item={timelineItems} />
                                    </div>
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
