import PrimaryButton from '@/Components/PrimaryButton';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Timeline from '@/Components/ui/Timeline';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

function formatRupiah(angka) {
    if (!angka || angka === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(angka);
}

export default function Show({ pengajuan }) {
    const { errors } = usePage().props;
    const [dialogKirim, setDialogKirim] = useState(false);
    const [memproses, setMemproses] = useState(false);

    const perluDokumen = ['pengadaan', 'mutasi', 'penghapusan'].includes(pengajuan.jenis_pengajuan);
    const belumAdaDokumen = perluDokumen && (!pengajuan.dokumen || pengajuan.dokumen.length === 0);

    const totalNilaiPerolehan =
        pengajuan.total_nilai_perolehan ||
        (pengajuan.items || []).reduce((acc, it) => acc + (Number(it.harga_perolehan) || 0), 0);

    const dasarUsulan =
        pengajuan.penghapusan_meta?.dasar_usulan ||
        (() => {
            if (typeof pengajuan.keterangan === 'string') {
                const match = pengajuan.keterangan.match(/Dasar Usulan:\s*(.*)/);
                if (match) return match[1].trim();
            }
            return 'Kerusakan berat / tidak ekonomis';
        })();

    const alasanPenghapusan =
        pengajuan.penghapusan_meta?.alasan_penghapusan ||
        (() => {
            if (typeof pengajuan.keterangan === 'string') {
                const match = pengajuan.keterangan.match(/Alasan & Penjelasan Kondisi:\s*([\s\S]*)/);
                if (match) return match[1].trim();
            }
            return pengajuan.keterangan || '-';
        })();

    const handleKirimDraft = () => {
        setMemproses(true);
        router.post(
            route('pemohon.pengajuan.kirim', pengajuan.id_pengajuan),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setMemproses(false);
                    setDialogKirim(false);
                },
            }
        );
    };

    const timelineItems = pengajuan.riwayat.map((r) => {
        const isSelesai = ['disetujui_pimpinan', 'selesai'].includes(r.status_baru);
        const isBatal = ['ditolak', 'draft'].includes(r.status_baru);

        return {
            ikon: isSelesai ? 'selesai' : 'jadwal',
            judul: `${r.pengguna_nama} (${r.pengguna_peran})`,
            detail: r.catatan,
            waktu: r.waktu,
        };
    });

    return (
        <AuthenticatedLayout>
            <Head title={`Pengajuan ${pengajuan.nomor_pengajuan}`} />

            <PageHeader
                breadcrumb={['FTI', 'Daftar pengajuan', pengajuan.nomor_pengajuan]}
                judul={pengajuan.nomor_pengajuan}
                deskripsi={`Usulan ${pengajuan.jenis_label} • Diajukan pada ${pengajuan.tanggal_pengajuan}`}
            >
                <div className="flex items-center gap-2">
                    <Badge nada={pengajuan.status_nada}>{pengajuan.status_label}</Badge>
                    <TombolLink href={route('pemohon.pengajuan')} varian="sekunder">
                        Kembali ke daftar
                    </TombolLink>
                </div>
            </PageHeader>

            {errors?.status && (
                <div className="mb-6">
                    <Alert nada="bahaya">{errors.status}</Alert>
                </div>
            )}

            {pengajuan.status === 'draft' && (
                <div className="mb-6 rounded-kartu border border-warn-700/20 bg-warn-50 p-4">
                    {pengajuan.is_revisi ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-base font-bold text-warn-800">
                                        Pengajuan Ini Perlu Revisi
                                    </p>
                                    <p className="text-xs text-ink-600">
                                        Pemeriksa telah mengembalikan usulan ini untuk diperbaiki sebelum diproses kembali.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TombolLink
                                        href={route('pemohon.pengajuan.edit', pengajuan.id_pengajuan)}
                                        varian="sekunder"
                                    >
                                        Edit pengajuan
                                    </TombolLink>
                                    <PrimaryButton
                                        type="button"
                                        disabled={belumAdaDokumen}
                                        onClick={() => setDialogKirim(true)}
                                        title={belumAdaDokumen ? 'Unggah berkas dokumen lampiran terlebih dahulu melalui Edit pengajuan' : undefined}
                                    >
                                        Kirim ulang pengajuan
                                    </PrimaryButton>
                                </div>
                            </div>

                            {pengajuan.catatan_revisi_terakhir && (
                                <div className="rounded-lg border border-warn-200 bg-white p-3.5 text-xs text-ink-900 shadow-sm">
                                    <p className="font-semibold text-warn-800">
                                        Catatan perbaikan dari pemeriksa:
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-ink-700">
                                        {pengajuan.catatan_revisi_terakhir}
                                    </p>
                                </div>
                            )}

                            {belumAdaDokumen && (
                                <div className="rounded-lg border border-bahaya-200 bg-bahaya-50/80 p-3 text-xs text-bahaya-800">
                                    <strong>Peringatan Dokumen Wajib:</strong> {pengajuan.jenis_pengajuan === 'penghapusan' ? 'Dokumen foto fisik atau surat usulan penghapusan belum dilampirkan.' : pengajuan.jenis_pengajuan === 'mutasi' ? 'Dokumen persetujuan penerima atau pendukung mutasi belum dilampirkan.' : 'Dokumen permohonan atau RAB belum dilampirkan.'} Anda wajib melampirkan minimal satu berkas dokumen sebelum dapat mengirim ulang usulan ini. Silakan klik tombol <strong>Edit pengajuan</strong> untuk mengunggah berkas.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-warn-700">Pengajuan ini masih berupa draf</p>
                                    <p className="text-xs text-ink-600">
                                        Usulan belum masuk ke antrean verifikasi Operator Aset Fakultas.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TombolLink
                                        href={route('pemohon.pengajuan.edit', pengajuan.id_pengajuan)}
                                        varian="sekunder"
                                    >
                                        Edit pengajuan
                                    </TombolLink>
                                    <PrimaryButton
                                        type="button"
                                        disabled={belumAdaDokumen}
                                        onClick={() => setDialogKirim(true)}
                                        title={belumAdaDokumen ? 'Unggah berkas dokumen lampiran terlebih dahulu melalui Edit pengajuan' : undefined}
                                    >
                                        Kirim pengajuan sekarang
                                    </PrimaryButton>
                                </div>
                            </div>

                            {belumAdaDokumen && (
                                <div className="rounded-lg border border-bahaya-200 bg-bahaya-50/80 p-3 text-xs text-bahaya-800">
                                    <strong>Peringatan Dokumen Wajib:</strong> {pengajuan.jenis_pengajuan === 'penghapusan' ? 'Dokumen foto fisik atau surat usulan penghapusan belum dilampirkan.' : pengajuan.jenis_pengajuan === 'mutasi' ? 'Dokumen persetujuan penerima atau pendukung mutasi belum dilampirkan.' : 'Dokumen permohonan atau RAB belum dilampirkan.'} Anda wajib melampirkan minimal satu berkas dokumen sebelum dapat mengirimkan usulan ini ke antrean verifikasi. Silakan klik tombol <strong>Edit pengajuan</strong> untuk mengunggah berkas.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Detail Isi Pengajuan (8 Kolom) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* 1. Informasi Pengajuan */}
                    <Card judul="Informasi pengajuan" deskripsi="Data permohonan dan unit pengusul.">
                        <IsiKartu className="space-y-4">
                            <InfoList
                                item={[
                                    { label: 'Pemohon', nilai: pengajuan.pemohon.nama_lengkap },
                                    { label: 'NIP', nilai: pengajuan.pemohon.nip || '-' },
                                    {
                                        label: 'Unit kerja',
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

                    {/* 2. Rincian Item Barang / Aset */}
                    {pengajuan.jenis_pengajuan === 'mutasi' ? (
                        <Card
                            judul="Rincian aset & tujuan mutasi"
                            deskripsi={`Daftar unit aset yang diusulkan untuk dipindahkan (${pengajuan.items.length} unit).`}
                        >
                            <div className="overflow-x-auto px-4 pb-4">
                                <table className="min-w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-line text-left font-semibold text-ink-500 uppercase tracking-wider text-[11px]">
                                            <th className="py-2.5 pr-2 w-8">No</th>
                                            <th className="py-2.5 px-3">Kode & Nama Aset</th>
                                            <th className="py-2.5 px-3">Lokasi & PJ Asal</th>
                                            <th className="py-2.5 px-3">Lokasi & PJ Tujuan</th>
                                            <th className="py-2.5 px-3">Jenis & Tgl Usulan</th>
                                            <th className="py-2.5 pl-3">Alasan Mutasi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {pengajuan.items.map((it, idx) => (
                                            <tr key={it.id ?? idx} className="align-top hover:bg-surface/40">
                                                <td className="py-3 pr-2 text-ink-400 font-mono">{idx + 1}</td>
                                                <td className="py-3 px-3">
                                                    <p className="font-bold text-ink-900">{it.nama_barang}</p>
                                                    <p className="font-mono text-ink-500 text-[11px]">{it.kode_aset || '-'}</p>
                                                    <Badge nada="netral" className="mt-1">{it.kategori}</Badge>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="font-semibold text-ink-800">{it.ruangan_asal || '-'}</p>
                                                    <p className="text-[11px] text-ink-500 mt-0.5">PJ: {it.pj_asal || '-'}</p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="font-semibold text-brand-800">{it.ruangan_tujuan || '-'}</p>
                                                    <p className="text-[11px] text-ink-500 mt-0.5">PJ Baru: {it.pj_tujuan || '-'}</p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Badge nada="info" className="text-[10px] whitespace-nowrap">
                                                        {it.jenis_mutasi || 'Antarruangan'}
                                                    </Badge>
                                                    <p className="text-[11px] text-ink-500 mt-1">{it.tanggal_mutasi || '-'}</p>
                                                </td>
                                                <td className="py-3 pl-3 text-ink-700 leading-relaxed max-w-xs">
                                                    {it.alasan_mutasi || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ) : pengajuan.jenis_pengajuan === 'penghapusan' ? (
                        <Card
                            judul="Rincian aset yang diusulkan dihapus"
                            deskripsi={`Daftar unit aset yang diusulkan untuk dihapus (${pengajuan.items.length} unit).`}
                        >
                            <div className="overflow-x-auto px-4 pb-4">
                                <table className="min-w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-line text-left font-semibold text-ink-500 uppercase tracking-wider text-[11px]">
                                            <th className="py-2.5 pr-2 w-8">No</th>
                                            <th className="py-2.5 px-3">Kode & Nama Aset</th>
                                            <th className="py-2.5 px-3">Kondisi Fisik</th>
                                            <th className="py-2.5 px-3 text-right">Nilai Perolehan / Buku</th>
                                            <th className="py-2.5 pl-3">Jalur / Dasar Usulan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {pengajuan.items.map((it, idx) => (
                                            <tr key={it.id ?? idx} className="align-top hover:bg-surface/40">
                                                <td className="py-3 pr-2 text-ink-400 font-mono">{idx + 1}</td>
                                                <td className="py-3 px-3">
                                                    <p className="font-bold text-ink-900">{it.nama_barang}</p>
                                                    <p className="font-mono text-ink-500 text-[11px]">{it.kode_aset || '-'}</p>
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <Badge nada="netral">{it.kategori}</Badge>
                                                        {it.tahun_perolehan && (
                                                            <span className="text-[10px] text-ink-400">
                                                                Tahun {it.tahun_perolehan}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Badge nada="peringatan" className="capitalize">
                                                        {(it.kondisi || 'rusak_berat').replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 text-right font-medium text-ink-900">
                                                    {formatRupiah(it.harga_perolehan)}
                                                </td>
                                                <td className="py-3 pl-3 text-ink-700 leading-relaxed max-w-xs">
                                                    {it.jalur_penghapusan ? (
                                                        <span className="inline-block rounded bg-surface px-2 py-0.5 font-semibold text-ink-800 border border-line">
                                                            {it.jalur_penghapusan.replace('_', ' ')}
                                                        </span>
                                                    ) : (
                                                        <span>{it.spesifikasi || dasarUsulan || '-'}</span>
                                                    )}
                                                    {it.pihak_penerima && (
                                                        <p className="mt-1 text-[11px] text-ink-500">Penerima: {it.pihak_penerima}</p>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-line font-bold text-ink-900">
                                            <td colSpan={3} className="py-3 text-right">
                                                Total Nilai Perolehan / Buku Aset:
                                            </td>
                                            <td className="py-3 px-3 text-right text-brand-700">
                                                {formatRupiah(totalNilaiPerolehan)}
                                            </td>
                                            <td className="py-3 pl-3 text-ink-500 font-normal text-[11px]">
                                                ({pengajuan.items.length} unit aset)
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </Card>
                    ) : (
                        <Card
                            judul="Rincian kebutuhan aset"
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
                    )}

                    {/* 3. Dokumen Terlampir */}
                    <Card
                        judul="Dokumen terlampir"
                        deskripsi="Berkas proposal, RAB, atau spesifikasi teknis pendukung."
                    >
                        <IsiKartu>
                            {pengajuan.dokumen.length === 0 ? (
                                <p className="text-xs text-ink-500">
                                    Tidak ada dokumen lampiran yang diunggah pada pengajuan ini.
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
                </div>

                {/* Kolom Kanan: Status & Lini Masa (4 Kolom) */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Ringkasan Anggaran / Usulan */}
                    <Card
                        judul={
                            pengajuan.jenis_pengajuan === 'mutasi'
                                ? 'Ringkasan mutasi'
                                : pengajuan.jenis_pengajuan === 'penghapusan'
                                ? 'Ringkasan penghapusan'
                                : 'Ringkasan usulan'
                        }
                    >
                        <IsiKartu className="space-y-3">
                            {pengajuan.jenis_pengajuan === 'mutasi' ? (
                                <div className="rounded-lg border border-line bg-surface p-4 space-y-2.5">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                                            Jumlah Unit Dimutasi
                                        </p>
                                        <p className="text-xl font-bold tracking-tight text-brand-700">
                                            {pengajuan.items.length} Unit Aset
                                        </p>
                                    </div>
                                    <div className="border-t border-line/60 pt-2 text-xs">
                                        <span className="text-ink-500">Jenis Mutasi:</span>
                                        <p className="font-semibold text-ink-800 mt-0.5">
                                            {pengajuan.mutasi_meta?.jenis_mutasi || 'Antarruangan dalam fakultas'}
                                        </p>
                                    </div>
                                    {pengajuan.mutasi_meta?.tanggal_mutasi && pengajuan.mutasi_meta.tanggal_mutasi !== '-' && (
                                        <div className="border-t border-line/60 pt-2 text-xs">
                                            <span className="text-ink-500">Usulan Pemindahan:</span>
                                            <p className="font-medium text-ink-800 mt-0.5">
                                                {pengajuan.mutasi_meta.tanggal_mutasi}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : pengajuan.jenis_pengajuan === 'penghapusan' ? (
                                <div className="rounded-lg border border-line bg-surface p-4 space-y-2.5">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                                            Total Nilai Perolehan / Buku
                                        </p>
                                        <p className="text-xl font-bold tracking-tight text-brand-700">
                                            {formatRupiah(totalNilaiPerolehan)}
                                        </p>
                                        <p className="text-[11px] text-ink-500 mt-0.5">
                                            {pengajuan.items.length} Unit Aset Diusulkan
                                        </p>
                                    </div>
                                    <div className="border-t border-line/60 pt-2 text-xs">
                                        <span className="text-ink-500">Dasar Usulan Penghapusan:</span>
                                        <p className="font-semibold text-ink-800 mt-0.5">
                                            {dasarUsulan}
                                        </p>
                                    </div>
                                    {alasanPenghapusan && alasanPenghapusan !== '-' && (
                                        <div className="border-t border-line/60 pt-2 text-xs">
                                            <span className="text-ink-500">Alasan & Kondisi:</span>
                                            <p className="text-ink-700 mt-0.5 leading-relaxed">
                                                {alasanPenghapusan}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-line bg-surface p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                        Total Estimasi Usulan
                                    </p>
                                    <p className="mt-1 text-2xl font-bold tracking-tight text-brand-700">
                                        {formatRupiah(pengajuan.total_estimasi)}
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-ink-600">
                                <span>Status Terakhir:</span>
                                <Badge nada={pengajuan.status_nada}>{pengajuan.status_label}</Badge>
                            </div>
                        </IsiKartu>
                    </Card>

                    {/* Lini Masa Pelacakan Status */}
                    <Card
                        judul="Lini masa status"
                        deskripsi="Jejak verifikasi dan riwayat penanganan."
                    >
                        <IsiKartu>
                            <Timeline item={timelineItems} />
                        </IsiKartu>
                    </Card>
                </div>
            </div>

            {/* Dialog Konfirmasi Kirim Draf */}
            <ConfirmDialog
                show={dialogKirim}
                judul={
                    pengajuan.is_revisi
                        ? 'Kirim ulang usulan pengajuan?'
                        : 'Kirim pengajuan sekarang?'
                }
                pesan={
                    pengajuan.is_revisi
                        ? 'Pengajuan yang telah Anda perbaiki akan dikirimkan kembali ke antrean verifikasi Operator Aset Fakultas.'
                        : 'Setelah dikirimkan, usulan akan masuk ke antrean verifikasi Operator Aset Fakultas dan tidak dapat disunting kembali oleh pemohon.'
                }
                labelKonfirmasi={pengajuan.is_revisi ? 'Ya, kirim ulang' : 'Ya, kirim pengajuan'}
                memproses={memproses}
                onKonfirmasi={handleKirimDraft}
                onTutup={() => setDialogKirim(false)}
            />
        </AuthenticatedLayout>
    );
}
