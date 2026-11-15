import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import Field from '@/Components/ui/Field';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Timeline from '@/Components/ui/Timeline';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

function formatRupiah(angka) {
    if (!angka || angka === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka);
}

export default function KepalaKantorShow({ pengajuan }) {
    const formRekomendasi = useForm({
        keputusan: 'rekomendasikan',
        catatan: '',
    });

    const handleKirimRekomendasi = (e) => {
        e.preventDefault();
        formRekomendasi.post(route('kepala-kantor.pengajuan.proses', pengajuan.id_pengajuan), {
            preserveScroll: true,
        });
    };

    const timelineItems = pengajuan.riwayat.map((r) => {
        const isSelesai = ['disetujui_pimpinan', 'selesai', 'disetujui_kadep'].includes(r.status_baru);

        return {
            ikon: isSelesai ? 'selesai' : 'jadwal',
            judul: `${r.pengguna_nama} (${r.pengguna_peran})`,
            detail: r.catatan,
            waktu: r.waktu,
        };
    });

    const sudahDiverifikasiOperator = Boolean(pengajuan.sudah_diverifikasi_operator);
    const bisaDiproses = pengajuan.status === 'diajukan' && sudahDiverifikasiOperator;

    return (
        <AuthenticatedLayout>
            <Head title={`Tinjauan ${pengajuan.nomor_pengajuan}`} />

            <PageHeader
                breadcrumb={['FTI', 'Daftar pengajuan', pengajuan.nomor_pengajuan]}
                judul={pengajuan.nomor_pengajuan}
                deskripsi={`Tinjauan usulan ${pengajuan.jenis_label} • Pengusul: ${pengajuan.pemohon.nama_lengkap}`}
            >
                <div className="flex items-center gap-2">
                    <Badge nada={pengajuan.status_nada}>{pengajuan.status_label}</Badge>
                    <TombolLink href={route('kepala-kantor.pengajuan')} varian="sekunder">
                        Kembali
                    </TombolLink>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Detail & Form Rekomendasi (8 Kolom) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* 1. Informasi Usulan */}
                    <Card
                        judul="Informasi usulan & pemohon"
                        deskripsi="Detail kebutuhan unit pengusul dan waktu pengajuan."
                    >
                        <IsiKartu className="space-y-4">
                            <InfoList
                                item={[
                                    { label: 'Pemohon', nilai: pengajuan.pemohon.nama_lengkap },
                                    { label: 'NIP', nilai: pengajuan.pemohon.nip || '-' },
                                    {
                                        label: 'Unit pengusul',
                                        nilai:
                                            pengajuan.pemohon.unit_nama +
                                            (pengajuan.pemohon.sub_unit_nama
                                                ? ` • ${pengajuan.pemohon.sub_unit_nama}`
                                                : ''),
                                    },
                                    { label: 'Jenis pengajuan', nilai: pengajuan.jenis_label },
                                    { label: 'Waktu pengajuan', nilai: pengajuan.tanggal_pengajuan },
                                ]}
                            />

                            <div className="border-t border-line pt-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Keterangan & Alasan Pengajuan
                                </p>
                                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-900">
                                    {pengajuan.keterangan}
                                </pre>
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* 2. Rincian Kebutuhan & Spesifikasi */}
                    <Card
                        judul="Rincian kebutuhan & spesifikasi"
                        deskripsi={`Daftar barang yang diusulkan (${pengajuan.items.length} item).`}
                    >
                        <div className="overflow-x-auto px-4 pb-4">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-line text-left text-xs font-semibold text-ink-500">
                                        <th className="py-2.5 pr-3">No</th>
                                        <th className="py-2.5 px-3">Kategori</th>
                                        <th className="py-2.5 px-3">Nama Barang / Aset</th>
                                        <th className="py-2.5 px-3">Spesifikasi</th>
                                        <th className="py-2.5 px-3 text-center">Jumlah</th>
                                        <th className="py-2.5 pl-3 text-right">Estimasi Anggaran</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {pengajuan.items.map((it, idx) => (
                                        <tr key={it.id ?? idx} className="align-top">
                                            <td className="py-3 pr-3 text-ink-500">{idx + 1}</td>
                                            <td className="py-3 px-3">
                                                <Badge nada="netral">{it.kategori}</Badge>
                                            </td>
                                            <td className="py-3 px-3 font-semibold text-ink-900">
                                                {it.nama_barang}
                                            </td>
                                            <td className="py-3 px-3 text-xs text-ink-600">
                                                {it.spesifikasi}
                                            </td>
                                            <td className="py-3 px-3 text-center font-medium text-ink-900">
                                                {it.jumlah}
                                            </td>
                                            <td className="py-3 pl-3 text-right font-medium text-ink-900">
                                                {formatRupiah(it.subtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-line font-bold text-ink-900">
                                        <td colSpan={5} className="py-3 text-right">
                                            Total Estimasi:
                                        </td>
                                        <td className="py-3 pl-3 text-right text-brand-700">
                                            {formatRupiah(pengajuan.total_estimasi)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>

                    {/* 3. Dokumen Terlampir */}
                    <Card
                        judul="Dokumen pendukung / RAB"
                        deskripsi="Berkas penawaran harga, spesifikasi teknis, atau proposal."
                    >
                        <IsiKartu>
                            {pengajuan.dokumen.length === 0 ? (
                                <p className="text-xs text-ink-500">
                                    Tidak ada dokumen lampiran yang diunggah.
                                </p>
                            ) : (
                                <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                                    {pengajuan.dokumen.map((doc) => (
                                        <li
                                            key={doc.id_dokumen}
                                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Badge nada="info" className="uppercase">
                                                    {doc.nama_file.split('.').pop()}
                                                </Badge>
                                                <span className="font-medium text-ink-900">
                                                    {doc.nama_file}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-ink-500">
                                                    {doc.tanggal_unggah}
                                                </span>
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-semibold text-brand-600 hover:underline"
                                                >
                                                    Unduh / Buka berkas ↗
                                                </a>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </IsiKartu>
                    </Card>

                    {/* 4. Formulir Rekomendasi Kepala Kantor */}
                    {bisaDiproses ? (
                        <Card
                            judul="Formulir verifikasi operasional & rekomendasi"
                            deskripsi="Tentukan apakah usulan direkomendasikan ke Pimpinan atau dikembalikan untuk revisi."
                        >
                            <form onSubmit={handleKirimRekomendasi}>
                                <IsiKartu className="space-y-4">
                                    <Field label="Keputusan verifikasi">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <label
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                                                    formRekomendasi.data.keputusan === 'rekomendasikan'
                                                        ? 'border-brand-600 bg-brand-50/50'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="keputusan"
                                                    value="rekomendasikan"
                                                    checked={
                                                        formRekomendasi.data.keputusan ===
                                                        'rekomendasikan'
                                                    }
                                                    onChange={(e) =>
                                                        formRekomendasi.setData(
                                                            'keputusan',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="mt-0.5 text-brand-600 focus:ring-brand-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">
                                                        Rekomendasikan ke Pimpinan
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        Usulan sesuai RKT dan siap diputuskan Pimpinan.
                                                    </p>
                                                </div>
                                            </label>

                                            <label
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                                                    formRekomendasi.data.keputusan === 'kembalikan'
                                                        ? 'border-warn-700 bg-warn-50/50'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="keputusan"
                                                    value="kembalikan"
                                                    checked={
                                                        formRekomendasi.data.keputusan ===
                                                        'kembalikan'
                                                    }
                                                    onChange={(e) =>
                                                        formRekomendasi.setData(
                                                            'keputusan',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="mt-0.5 text-warn-700 focus:ring-warn-700"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">
                                                        Kembalikan untuk revisi
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        Memerlukan penyesuaian anggaran atau spesifikasi.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </Field>

                                    <Field
                                        label="Catatan rekomendasi / perbaikan"
                                        error={formRekomendasi.errors.catatan}
                                        petunjuk="Wajib diisi sebagai catatan pertimbangan bagi Pimpinan atau instruksi perbaikan bagi pemohon."
                                    >
                                        <textarea
                                            rows={3}
                                            value={formRekomendasi.data.catatan}
                                            onChange={(e) =>
                                                formRekomendasi.setData('catatan', e.target.value)
                                            }
                                            placeholder="Tuliskan analisis ketersediaan pagu anggaran, kesesuaian rencana kerja tahunan (RKT), serta rekomendasi..."
                                            className="w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        />
                                    </Field>

                                    <div className="flex justify-end pt-2">
                                        <PrimaryButton
                                            type="submit"
                                            disabled={formRekomendasi.processing}
                                        >
                                            Simpan rekomendasi
                                        </PrimaryButton>
                                    </div>
                                </IsiKartu>
                            </form>
                        </Card>
                    ) : pengajuan.status === 'diajukan' && !sudahDiverifikasiOperator ? (
                        <Alert nada="peringatan">
                            Pengajuan ini belum diverifikasi kelengkapan berkasnya oleh Operator Aset Fakultas. Form rekomendasi akan aktif setelah Operator meneruskan pengajuan.
                        </Alert>
                    ) : (
                        <Alert nada="info">
                            Pengajuan ini saat ini berstatus{' '}
                            <strong>{pengajuan.status_label}</strong> dan tidak memerlukan tindakan
                            rekomendasi baru dari Kepala Kantor.
                        </Alert>
                    )}
                </div>

                {/* Kolom Kanan: Catatan Operator & Timeline (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Ringkasan Anggaran */}
                    <Card judul="Ringkasan anggaran">
                        <IsiKartu className="space-y-3">
                            <div className="rounded-lg border border-line bg-surface p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Total Estimasi Usulan
                                </p>
                                <p className="mt-1 text-2xl font-bold tracking-tight text-brand-700">
                                    {formatRupiah(pengajuan.total_estimasi)}
                                </p>
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* Hasil Pemeriksaan Operator */}
                    {pengajuan.catatan_operator && (
                        <Card judul="Pemeriksaan Operator Aset">
                            <IsiKartu>
                                <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-xs leading-relaxed text-ink-900">
                                    <p className="font-semibold text-brand-800">
                                        Catatan Verifikasi Berkas:
                                    </p>
                                    <p className="mt-1">{pengajuan.catatan_operator}</p>
                                </div>
                            </IsiKartu>
                        </Card>
                    )}

                    {/* Riwayat Proses */}
                    <Card judul="Riwayat proses" deskripsi="Jejak penanganan pengajuan.">
                        <IsiKartu>
                            <Timeline item={timelineItems} />
                        </IsiKartu>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
