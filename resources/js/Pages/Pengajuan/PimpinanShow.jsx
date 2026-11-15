import DangerButton from '@/Components/DangerButton';
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

export default function PimpinanShow({ pengajuan, dapatDiputuskan = false }) {
    const formKeputusan = useForm({
        keputusan: 'setujui',
        catatan: '',
    });

    const handleKirimKeputusan = (e) => {
        e.preventDefault();
        formKeputusan.post(route('pimpinan.persetujuan.proses', pengajuan.id_pengajuan), {
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

    const bolehMemutuskan = typeof dapatDiputuskan !== 'undefined'
        ? Boolean(dapatDiputuskan)
        : pengajuan.status === 'disetujui_kadep';

    let alertStatus = {
        nada: 'info',
        pesan: `Keputusan final untuk pengajuan ini telah ditetapkan dengan status ${pengajuan.status_label}.`,
    };

    if (pengajuan.status === 'diajukan') {
        alertStatus = {
            nada: 'peringatan',
            pesan: 'Pengajuan ini masih dalam tahap pemeriksaan Operator / Kepala Kantor. Form keputusan Pimpinan akan aktif setelah direkomendasikan oleh Kepala Kantor.',
        };
    } else if (['disetujui_pimpinan', 'selesai'].includes(pengajuan.status)) {
        alertStatus = {
            nada: 'sukses',
            pesan: `Keputusan final untuk pengajuan ini telah ditetapkan (${pengajuan.status_label}) dan tidak memerlukan tindakan keputusan baru.`,
        };
    } else if (pengajuan.status === 'ditolak') {
        alertStatus = {
            nada: 'bahaya',
            pesan: 'Keputusan final untuk pengajuan ini telah ditetapkan: Pengajuan ditolak dan tidak dapat diproses lebih lanjut.',
        };
    } else if (pengajuan.status === 'diproses') {
        alertStatus = {
            nada: 'info',
            pesan: 'Pengajuan ini telah disetujui dan sedang dalam tahap tindak lanjut pemrosesan aset.',
        };
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Keputusan ${pengajuan.nomor_pengajuan}`} />

            <PageHeader
                breadcrumb={['FTI', 'Persetujuan pimpinan', pengajuan.nomor_pengajuan]}
                judul={pengajuan.nomor_pengajuan}
                deskripsi={`Tinjauan persetujuan akhir ${pengajuan.jenis_label} • Pengusul: ${pengajuan.pemohon.nama_lengkap}`}
            >
                <div className="flex items-center gap-2">
                    <Badge nada={pengajuan.status_nada}>{pengajuan.status_label}</Badge>
                    <TombolLink href={route('pimpinan.persetujuan')} varian="sekunder">
                        Kembali
                    </TombolLink>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Detail & Form Keputusan Pimpinan (8 Kolom) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* 1. Informasi Usulan */}
                    <Card
                        judul="Informasi usulan & pemohon"
                        deskripsi="Detail unit pengusul dan identitas usulan aset."
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

                    {/* 2. Rincian Kebutuhan & Anggaran */}
                    <Card
                        judul="Rincian barang & usulan anggaran"
                        deskripsi={`Daftar barang yang dimohonkan persetujuan (${pengajuan.items.length} item).`}
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
                                            Total Komitmen Anggaran:
                                        </td>
                                        <td className="py-3 pl-3 text-right text-brand-700">
                                            {formatRupiah(pengajuan.total_estimasi)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>

                    {/* 3. Dokumen Pendukung */}
                    <Card
                        judul="Dokumen pendukung & spesifikasi teknis"
                        deskripsi="Dokumen penawaran, proposal, atau kajian teknis yang dilampirkan."
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

                    {/* 4. Keputusan Pimpinan */}
                    {bolehMemutuskan ? (
                        <Card
                            judul="Keputusan persetujuan pimpinan"
                            deskripsi="Pilih keputusan akhir atas pengajuan ini beserta arahan atau catatan persetujuan."
                        >
                            <form onSubmit={handleKirimKeputusan}>
                                <IsiKartu className="space-y-4">
                                    <Field label="Pilihan keputusan">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <label
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                                                    formKeputusan.data.keputusan === 'setujui'
                                                        ? 'border-brand-600 bg-brand-50/50'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="keputusan"
                                                    value="setujui"
                                                    checked={
                                                        formKeputusan.data.keputusan === 'setujui'
                                                    }
                                                    onChange={(e) =>
                                                        formKeputusan.setData(
                                                            'keputusan',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="mt-0.5 text-brand-600 focus:ring-brand-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">
                                                        Setujui pengajuan
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        Alokasikan anggaran & teruskan proses pengadaan.
                                                    </p>
                                                </div>
                                            </label>

                                            <label
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                                                    formKeputusan.data.keputusan === 'kembalikan'
                                                        ? 'border-warn-700 bg-warn-50/50'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="keputusan"
                                                    value="kembalikan"
                                                    checked={
                                                        formKeputusan.data.keputusan === 'kembalikan'
                                                    }
                                                    onChange={(e) =>
                                                        formKeputusan.setData(
                                                            'keputusan',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="mt-0.5 text-warn-700 focus:ring-warn-700"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">
                                                        Kembalikan revisi
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        Perlu penyesuaian anggaran / spesifikasi.
                                                    </p>
                                                </div>
                                            </label>

                                            <label
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                                                    formKeputusan.data.keputusan === 'tolak'
                                                        ? 'border-bahaya-600 bg-bahaya-50/50'
                                                        : 'border-line hover:bg-surface'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="keputusan"
                                                    value="tolak"
                                                    checked={
                                                        formKeputusan.data.keputusan === 'tolak'
                                                    }
                                                    onChange={(e) =>
                                                        formKeputusan.setData(
                                                            'keputusan',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="mt-0.5 text-bahaya-600 focus:ring-bahaya-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-ink-900">
                                                        Tolak pengajuan
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-ink-500">
                                                        Usulan ditolak dan tidak dilanjutkan.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </Field>

                                    <Field
                                        label={
                                            formKeputusan.data.keputusan === 'setujui'
                                                ? 'Catatan / Instruksi Pimpinan (Opsional)'
                                                : 'Alasan penolakan / Instruksi revisi (Wajib)'
                                        }
                                        error={formKeputusan.errors.catatan}
                                        petunjuk={
                                            formKeputusan.data.keputusan === 'setujui'
                                                ? 'Tuliskan arahan pelaksanaan pengadaan atau alokasi sumber dana.'
                                                : 'Jelaskan alasan pengembalian/penolakan agar pemohon dapat menindaklanjuti.'
                                        }
                                    >
                                        <textarea
                                            rows={3}
                                            value={formKeputusan.data.catatan}
                                            onChange={(e) =>
                                                formKeputusan.setData('catatan', e.target.value)
                                            }
                                            placeholder={
                                                formKeputusan.data.keputusan === 'setujui'
                                                    ? 'Usulan disetujui sesuai pagu anggaran FTI tahun berjalan...'
                                                    : 'Tuliskan alasan penolakan atau poin revisi yang diperlukan...'
                                            }
                                            className="w-full rounded-lg border-line text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:ring-brand-600"
                                        />
                                    </Field>

                                    <div className="flex justify-end gap-3 pt-2">
                                        {formKeputusan.data.keputusan === 'setujui' && (
                                            <PrimaryButton
                                                type="submit"
                                                disabled={formKeputusan.processing}
                                            >
                                                Setujui pengajuan
                                            </PrimaryButton>
                                        )}
                                        {formKeputusan.data.keputusan === 'kembalikan' && (
                                            <SecondaryButton
                                                type="submit"
                                                disabled={formKeputusan.processing}
                                                className="border-warn-600 text-warn-800 hover:bg-warn-50"
                                            >
                                                Kembalikan untuk perbaikan
                                            </SecondaryButton>
                                        )}
                                        {formKeputusan.data.keputusan === 'tolak' && (
                                            <DangerButton
                                                type="submit"
                                                disabled={formKeputusan.processing}
                                            >
                                                Tolak pengajuan
                                            </DangerButton>
                                        )}
                                    </div>
                                </IsiKartu>
                            </form>
                        </Card>
                    ) : (
                        <Alert nada={alertStatus.nada}>
                            {alertStatus.pesan}
                        </Alert>
                    )}
                </div>

                {/* Kolom Kanan: Rekomendasi Kepala Kantor & Timeline (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Ringkasan Anggaran */}
                    <Card judul="Komitmen anggaran">
                        <IsiKartu className="space-y-3">
                            <div className="rounded-lg border border-line bg-surface p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Total Anggaran Diusulkan
                                </p>
                                <p className="mt-1 text-2xl font-bold tracking-tight text-brand-700">
                                    {formatRupiah(pengajuan.total_estimasi)}
                                </p>
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* Rekomendasi Kepala Kantor */}
                    {pengajuan.catatan_kepala_kantor && (
                        <Card judul="Rekomendasi Kepala Kantor">
                            <IsiKartu>
                                <div className="rounded-lg border border-info-200 bg-info-50 p-4 text-xs leading-relaxed text-ink-900">
                                    <p className="font-semibold text-info-800">
                                        Catatan Verifikasi & RKT:
                                    </p>
                                    <p className="mt-1">{pengajuan.catatan_kepala_kantor}</p>
                                </div>
                            </IsiKartu>
                        </Card>
                    )}

                    {/* Pemeriksaan Operator */}
                    {pengajuan.catatan_operator && (
                        <Card judul="Pemeriksaan Operator Aset">
                            <IsiKartu>
                                <div className="rounded-lg border border-line bg-surface p-4 text-xs leading-relaxed text-ink-900">
                                    <p className="font-semibold text-ink-800">
                                        Pemeriksaan Kelengkapan Berkas:
                                    </p>
                                    <p className="mt-1">{pengajuan.catatan_operator}</p>
                                </div>
                            </IsiKartu>
                        </Card>
                    )}

                    {/* Riwayat Proses */}
                    <Card judul="Riwayat proses" deskripsi="Jejak penanganan berjenjang.">
                        <IsiKartu>
                            <Timeline item={timelineItems} />
                        </IsiKartu>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
