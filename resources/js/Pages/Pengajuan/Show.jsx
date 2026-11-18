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

// Langkah-langkah progres pengajuan
const LANGKAH_STATUS = [
    { status: ['draft'], label: 'Draf', keterangan: 'Pengajuan dibuat' },
    { status: ['diajukan'], label: 'Diajukan', keterangan: 'Menunggu pemeriksaan Operator' },
    { status: ['disetujui_kadep'], label: 'Rekomendasi Kepala Kantor', keterangan: 'Diteruskan ke Pimpinan' },
    { status: ['disetujui_pimpinan', 'diproses'], label: 'Disetujui Pimpinan', keterangan: 'Sedang diproses' },
    { status: ['selesai'], label: 'Selesai', keterangan: 'Pengajuan telah selesai' },
];

const STATUS_URUTAN = ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses', 'selesai'];

function StatusStepper({ status }) {
    const isDitolak = status === 'ditolak';

    if (isDitolak) {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-bahaya-200 bg-bahaya-50 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bahaya-600 text-white text-xs font-bold">✕</div>
                <div>
                    <p className="text-sm font-semibold text-bahaya-800">Pengajuan Ditolak</p>
                    <p className="text-xs text-bahaya-600">Pimpinan telah menolak pengajuan ini. Lihat catatan di riwayat status.</p>
                </div>
            </div>
        );
    }

    const urutan = STATUS_URUTAN.indexOf(status);

    return (
        <div className="relative">
            <div className="flex items-start gap-0">
                {LANGKAH_STATUS.map((langkah, idx) => {
                    const indeksLangkah = STATUS_URUTAN.indexOf(langkah.status[0]);
                    const aktif = langkah.status.includes(status);
                    const selesai = urutan > indeksLangkah;
                    const isLast = idx === LANGKAH_STATUS.length - 1;

                    return (
                        <div key={idx} className="flex flex-1 flex-col items-center">
                            <div className="flex w-full items-center">
                                {/* Garis kiri */}
                                {idx > 0 && (
                                    <div className={`h-0.5 flex-1 ${selesai || aktif ? 'bg-brand-500' : 'bg-line'}`} />
                                )}
                                {/* Lingkaran */}
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                                    aktif
                                        ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                                        : selesai
                                          ? 'border-brand-400 bg-brand-100 text-brand-700'
                                          : 'border-line bg-white text-ink-400'
                                }`}>
                                    {selesai ? '✓' : idx + 1}
                                </div>
                                {/* Garis kanan */}
                                {!isLast && (
                                    <div className={`h-0.5 flex-1 ${selesai ? 'bg-brand-500' : 'bg-line'}`} />
                                )}
                            </div>
                            <div className="mt-1.5 text-center">
                                <p className={`text-[10px] font-semibold leading-tight ${aktif ? 'text-brand-700' : selesai ? 'text-brand-500' : 'text-ink-400'}`}>
                                    {langkah.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Render tabel item sesuai jenis pengajuan
function TabelItem({ pengajuan }) {
    const jenis = pengajuan.jenis_pengajuan;

    if (jenis === 'perbaikan') {
        return (
            <div className="overflow-x-auto px-4 pb-4">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-line text-left text-xs font-semibold text-ink-500">
                            <th className="py-2.5 pr-3">No</th>
                            <th className="py-2.5 px-3">Aset</th>
                            <th className="py-2.5 px-3">Deskripsi Kerusakan</th>
                            <th className="py-2.5 px-3">Foto</th>
                            <th className="py-2.5 px-3 text-center">Status Perbaikan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {pengajuan.items.map((it, idx) => (
                            <tr key={it.id ?? idx} className="align-top">
                                <td className="py-3 pr-3 text-ink-500">{idx + 1}</td>
                                <td className="py-3 px-3">
                                    <p className="font-semibold text-ink-900">{it.nama_barang}</p>
                                    <p className="text-xs text-ink-500 font-mono">{it.kode_aset}</p>
                                    <p className="text-xs text-ink-400">{it.merek_tipe}</p>
                                </td>
                                <td className="py-3 px-3 text-xs text-ink-700 max-w-xs">
                                    {it.spesifikasi || '-'}
                                </td>
                                <td className="py-3 px-3">
                                    {it.foto_url ? (
                                        <a href={it.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                            <img src={it.foto_url} alt="Foto Kerusakan" className="h-14 w-14 rounded object-cover border border-line group-hover:opacity-90" />
                                            <span className="block text-[10px] text-brand-600 group-hover:underline mt-0.5">Lihat foto ↗</span>
                                        </a>
                                    ) : (
                                        <span className="text-xs italic text-ink-400">Tidak ada foto</span>
                                    )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                    <StatusPerbaikanBadge status={it.status_perbaikan} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // Default: pengadaan, mutasi, penghapusan
    return (
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
                                <div>{it.spesifikasi}</div>
                                {it.foto_url && (
                                    <div className="mt-2">
                                        <a href={it.foto_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                            <img src={it.foto_url} alt="Foto Kerusakan" className="h-16 w-16 rounded object-cover border border-line group-hover:opacity-90" />
                                            <span className="block text-[10px] text-brand-600 group-hover:underline mt-0.5">Lihat foto ↗</span>
                                        </a>
                                    </div>
                                )}
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
    );
}

function StatusPerbaikanBadge({ status }) {
    const map = {
        menunggu: { label: 'Menunggu', nada: 'netral' },
        diperiksa: { label: 'Diperiksa', nada: 'peringatan' },
        disetujui: { label: 'Disetujui', nada: 'info' },
        dalam_perbaikan: { label: 'Dikerjakan', nada: 'info' },
        selesai: { label: 'Selesai', nada: 'sukses' },
        ditolak: { label: 'Ditolak', nada: 'bahaya' },
    };
    const meta = map[status] ?? { label: status, nada: 'netral' };
    return <Badge nada={meta.nada}>{meta.label}</Badge>;
}

export default function Show({ pengajuan }) {
    const { errors } = usePage().props;
    const [dialogKirim, setDialogKirim] = useState(false);
    const [memproses, setMemproses] = useState(false);

    const perluDokumen = pengajuan.jenis_pengajuan === 'pengadaan';
    const belumAdaDokumen = perluDokumen && (!pengajuan.dokumen || pengajuan.dokumen.length === 0);

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

        return {
            ikon: isSelesai ? 'selesai' : 'jadwal',
            judul: `${r.pengguna_nama} (${r.pengguna_peran})`,
            detail: r.catatan,
            waktu: r.waktu,
        };
    });

    const judulItem = {
        pengadaan: 'Rincian kebutuhan aset',
        perbaikan: 'Detail aset yang diperbaiki',
        mutasi: 'Rincian aset yang dimutasi',
        penghapusan: 'Rincian aset yang dihapuskan',
    }[pengajuan.jenis_pengajuan] ?? 'Rincian item';

    const deskripsiItem = {
        pengadaan: `Daftar barang yang diusulkan (${pengajuan.items.length} item).`,
        perbaikan: `Aset yang diajukan perbaikan (${pengajuan.items.length} item).`,
        mutasi: `Aset yang diajukan mutasi (${pengajuan.items.length} item).`,
        penghapusan: `Aset yang diajukan penghapusan (${pengajuan.items.length} item).`,
    }[pengajuan.jenis_pengajuan] ?? `${pengajuan.items.length} item`;

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

            {/* Stepper Progres Status */}
            {pengajuan.status !== 'draft' && (
                <div className="mb-6">
                    <Card judul="Progres pengajuan" deskripsi="Posisi pengajuan Anda dalam alur verifikasi dan persetujuan.">
                        <IsiKartu>
                            <StatusStepper status={pengajuan.status} />
                        </IsiKartu>
                    </Card>
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
                                    <strong>Peringatan Dokumen Wajib:</strong> Dokumen permohonan atau RAB belum dilampirkan. Anda wajib melampirkan minimal satu berkas dokumen sebelum dapat mengirim ulang usulan ini. Silakan klik tombol <strong>Edit pengajuan</strong> untuk mengunggah berkas.
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
                                    <strong>Peringatan Dokumen Wajib:</strong> Dokumen permohonan atau RAB belum dilampirkan. Anda wajib melampirkan minimal satu berkas dokumen sebelum dapat mengirimkan usulan ini ke antrean verifikasi. Silakan klik tombol <strong>Edit pengajuan</strong> untuk mengunggah berkas.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Alert status ditolak/diproses/selesai */}
            {['ditolak', 'diproses', 'selesai'].includes(pengajuan.status) && (
                <div className="mb-6">
                    <Alert nada={
                        pengajuan.status === 'ditolak' ? 'bahaya'
                        : pengajuan.status === 'selesai' ? 'sukses'
                        : 'info'
                    }>
                        {pengajuan.status === 'ditolak' && 'Pengajuan ini telah ditolak oleh Pimpinan. Lihat catatan alasan penolakan di riwayat status di bawah.'}
                        {pengajuan.status === 'diproses' && 'Pengajuan telah disetujui dan saat ini sedang dalam tahap pemrosesan oleh Operator Aset (penugasan teknisi/vendor).'}
                        {pengajuan.status === 'selesai' && 'Pengajuan ini telah selesai diproses sepenuhnya.'}
                    </Alert>
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
                    <Card
                        judul={judulItem}
                        deskripsi={deskripsiItem}
                    >
                        <TabelItem pengajuan={pengajuan} />
                    </Card>

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
                    {/* Ringkasan Usulan */}
                    <Card judul="Ringkasan usulan">
                        <IsiKartu className="space-y-3">
                            {pengajuan.jenis_pengajuan !== 'perbaikan' && (
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
                            <div className="flex items-center justify-between text-xs text-ink-600">
                                <span>Jenis Pengajuan:</span>
                                <Badge nada="netral">{pengajuan.jenis_label}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-ink-600">
                                <span>Jumlah Item:</span>
                                <span className="font-semibold text-ink-900">{pengajuan.items.length} item</span>
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
