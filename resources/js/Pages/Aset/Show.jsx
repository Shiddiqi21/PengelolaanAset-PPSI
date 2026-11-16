import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

const DAFTAR_TAB = [
    { kunci: 'informasi', label: 'Informasi aset' },
    { kunci: 'lokasi', label: 'Riwayat lokasi' },
    { kunci: 'pemeliharaan', label: 'Pemeliharaan' },
    { kunci: 'dokumen', label: 'Dokumen' },
];

function IkonVisualAset({ fotoUrl, nama, onClick }) {
    if (fotoUrl) {
        return (
            <button
                type="button"
                onClick={onClick}
                title="Klik untuk memperbesar gambar aset"
                className="group relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
                <img
                    src={fotoUrl}
                    alt={nama}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                />
            </button>
        );
    }

    return (
        <div
            className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-700"
            aria-hidden="true"
        >
            <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 7v3M14 9l1.5 2.2M26 9l-1.5 2.2" strokeLinecap="round" />
                <rect x="7" y="15" width="26" height="14" rx="3.5" />
                <circle cx="17" cy="22" r="3.5" />
                <path d="M24.5 22h4.5" strokeLinecap="round" />
            </svg>
        </div>
    );
}

export default function Show({ aset, modePemohon = false }) {
    const [tabAktif, setTabAktif] = useState('informasi');
    const [pratinjauFoto, setPratinjauFoto] = useState(false);

    const kolomPengelolaan = [
        {
            kunci: 'tanggal',
            judul: 'Tanggal',
            className: 'font-semibold whitespace-nowrap w-40',
        },
        {
            kunci: 'kegiatan',
            judul: 'Kegiatan',
        },
        {
            kunci: 'referensi',
            judul: 'Referensi',
            className: 'whitespace-nowrap',
        },
        {
            judul: 'Pelaksana',
            render: (b) =>
                b.pelaksana_tujuan ? (
                    <span className="font-semibold text-brand-600">
                        {b.pelaksana} → {b.pelaksana_tujuan}
                    </span>
                ) : (
                    <span className="font-semibold text-ink-900">{b.pelaksana}</span>
                ),
        },
    ];

    const kolomPenempatan = [
        { kunci: 'ruangan', judul: 'Lokasi ruangan', className: 'font-semibold' },
        { kunci: 'gedung', judul: 'Gedung' },
        { kunci: 'penanggung_jawab', judul: 'Penanggung jawab' },
        { kunci: 'tanggal_mulai', judul: 'Mulai' },
        {
            judul: 'Selesai / Status',
            render: (b) =>
                b.aktif ? (
                    <Badge nada="sukses">Lokasi aktif</Badge>
                ) : (
                    <span className="text-ink-600">{b.tanggal_selesai}</span>
                ),
        },
        {
            kunci: 'keterangan',
            judul: 'Keterangan',
            render: (b) => b.keterangan || '-',
        },
    ];

    const kolomPemeliharaan = [
        { kunci: 'tanggal', judul: 'Tanggal', className: 'font-semibold' },
        { kunci: 'jenis', judul: 'Jenis pemeliharaan' },
        { kunci: 'pelaksana', judul: 'Pelaksana' },
        { kunci: 'status', judul: 'Status' },
        { kunci: 'biaya', judul: 'Biaya' },
    ];

    const kpiPenyusutan = [
        {
            label: 'Nilai perolehan',
            nilai: aset.harga_perolehan_label,
            keterangan: `Tahun perolehan ${aset.tahun_perolehan ?? '-'}`,
            nada: 'sukses',
        },
        {
            label: 'Penyusutan per tahun',
            nilai: aset.penyusutan.penyusutan_per_tahun_label,
            keterangan: `Masa manfaat ${aset.penyusutan.masa_manfaat_tahun} tahun (garis lurus)`,
            nada: 'netral',
        },
        {
            label: 'Akumulasi penyusutan',
            nilai: aset.penyusutan.akumulasi_penyusutan_label,
            keterangan: `Umur pakai ${aset.penyusutan.umur_pemakaian} dari ${aset.penyusutan.masa_manfaat_tahun} tahun`,
            nada: 'peringatan',
        },
        {
            label: 'Nilai buku saat ini',
            nilai: aset.penyusutan.nilai_buku_label,
            keterangan: aset.status_label,
            nada: 'sukses',
        },
    ];

    const jumlahRiwayat = aset.riwayat_pengelolaan?.length ?? 0;

    return (
        <AuthenticatedLayout>
            <Head title="Detail aset" />

            <PageHeader
                breadcrumb={modePemohon ? ['FTI', 'Daftar aset unit', aset.kode_aset] : ['FTI', 'Master aset']}
                judul="Detail aset"
                deskripsi="Informasi inventaris, dokumen, serta riwayat pengelolaan aset."
            >
                {modePemohon ? (
                    <>
                        <TombolLink href={route('pemohon.aset-unit')} varian="sekunder">
                            ← Daftar aset unit
                        </TombolLink>
                        <TombolLink href={route('pemohon.perbaikan')}>Ajukan perbaikan</TombolLink>
                    </>
                ) : (
                    <TombolLink href={route('aset.edit', aset.id_aset)}>+ Edit aset</TombolLink>
                )}
            </PageHeader>

            <Card
                judul={aset.kode_aset}
                tautan={
                    modePemohon
                        ? { label: 'Ajukan mutasi', href: route('pemohon.mutasi') }
                        : { label: 'Cetak label', href: route('label.index') }
                }
            >
                <IsiKartu>
                    <div className="flex flex-wrap items-center gap-5">
                        <IkonVisualAset
                            fotoUrl={aset.foto_url}
                            nama={aset.nama_barang}
                            onClick={() => setPratinjauFoto(true)}
                        />
                        <div>
                            <p className="text-xs font-semibold text-brand-700">{aset.kode_aset}</p>
                            <p className="mt-0.5 text-2xl font-bold text-ink-900">{aset.nama_barang}</p>
                            <p className="mt-0.5 text-sm text-ink-600">
                                {aset.kategori?.nama_kategori} • {aset.lokasi_ringkas}
                            </p>
                            <div className="mt-2">
                                <Badge nada={aset.kondisi_nada}>{aset.kondisi_label}</Badge>
                            </div>
                        </div>
                    </div>
                </IsiKartu>
            </Card>

            <nav aria-label="Bagian detail aset" className="mb-6 mt-6 flex flex-wrap gap-6 border-b border-line">
                {DAFTAR_TAB.map((t) => {
                    const aktif = tabAktif === t.kunci;

                    return (
                        <button
                            key={t.kunci}
                            type="button"
                            onClick={() => setTabAktif(t.kunci)}
                            aria-current={aktif ? 'page' : undefined}
                            className={`-mb-px border-b-2 pb-2.5 text-sm transition ${
                                aktif
                                    ? 'border-brand-600 font-semibold text-brand-700'
                                    : 'border-transparent text-ink-600 hover:border-line hover:text-ink-900'
                            }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </nav>

            {tabAktif === 'informasi' && (
                <>
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card judul="Data aset" className="lg:col-span-2">
                            <IsiKartu>
                                <InfoList
                                    item={[
                                        { label: 'Kode inventaris', nilai: aset.kode_aset },
                                        {
                                            label: 'Kategori / NUP',
                                            nilai: `${aset.kategori?.nama_kategori} / ${aset.nup}`,
                                        },
                                        { label: 'Merek / tipe', nilai: aset.merek_tipe },
                                        { label: 'Nomor seri', nilai: aset.nomor_seri },
                                        { label: 'Tanggal perolehan', nilai: aset.tanggal_perolehan },
                                        { label: 'Nilai perolehan', nilai: aset.harga_perolehan_label },
                                        { label: 'Sumber dana', nilai: aset.sumber_dana },
                                        { label: 'Penanggung jawab', nilai: aset.penanggung_jawab },
                                        { label: 'Lokasi', nilai: aset.lokasi_lengkap },
                                    ]}
                                />
                            </IsiKartu>
                        </Card>

                        <div className="space-y-6">
                            <Card judul="Perbaikan berjalan">
                                <IsiKartu>
                                    {aset.perbaikan_berjalan ? (
                                        <>
                                            <InfoList
                                                item={[
                                                    { label: 'Nomor', nilai: aset.perbaikan_berjalan.nomor },
                                                    { label: 'Teknisi', nilai: aset.perbaikan_berjalan.teknisi },
                                                    { label: 'Status', nilai: aset.perbaikan_berjalan.status },
                                                ]}
                                            />
                                            <Alert nada="info" className="mt-4">
                                                {aset.perbaikan_berjalan.catatan}
                                            </Alert>
                                        </>
                                    ) : (
                                        <>
                                            <InfoList
                                                item={[
                                                    { label: 'Status', nilai: 'Tidak ada perbaikan berjalan' },
                                                    { label: 'Kondisi fisik', nilai: aset.kondisi_label },
                                                    { label: 'Nilai buku', nilai: aset.penyusutan.nilai_buku_label },
                                                ]}
                                            />
                                            <Alert nada="info" className="mt-4">
                                                Aset dalam kondisi siap operasional dan tidak sedang berada dalam antrean perbaikan.
                                            </Alert>
                                        </>
                                    )}
                                </IsiKartu>
                            </Card>

                            <Card judul="Dokumen aset">
                                <IsiKartu className="space-y-2.5">
                                    {(aset.dokumen_aset ?? []).map((d) => (
                                        <div
                                            key={d.id_dokumen}
                                            className="rounded-lg bg-surface px-4 py-2.5 text-xs font-semibold text-brand-700"
                                        >
                                            {d.url ? (
                                                <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">
                                                    ↕ {d.nama_file} • {d.ukuran_label}
                                                </a>
                                            ) : (
                                                <span>
                                                    ↕ {d.nama_file} • {d.ukuran_label}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </IsiKartu>
                            </Card>
                        </div>
                    </div>

                    <Card judul="Riwayat pengelolaan terbaru" className="mt-6">
                        <div className="pt-3">
                            <DataTable
                                kolom={kolomPengelolaan}
                                baris={aset.riwayat_pengelolaan}
                                kunciBaris="id"
                                kosong={<EmptyState judul="Belum ada riwayat pengelolaan" />}
                            />
                        </div>
                        <Pagination
                            links={[
                                { label: '‹', url: null, active: false },
                                { label: '1', url: '#', active: true },
                                { label: '›', url: null, active: false },
                            ]}
                            from={jumlahRiwayat > 0 ? 1 : 0}
                            to={jumlahRiwayat}
                            total={jumlahRiwayat}
                        />
                    </Card>
                </>
            )}

            {tabAktif === 'lokasi' && (
                <Card
                    judul="Riwayat penempatan & perpindahan lokasi"
                    deskripsi="Seluruh histori lokasi ruangan dan penanggung jawab aset sejak penempatan awal."
                >
                    <div className="pt-3">
                        <DataTable
                            kolom={kolomPenempatan}
                            baris={aset.riwayat_penempatan}
                            kunciBaris="id_penempatan"
                            kosong={
                                <EmptyState
                                    judul="Belum ada riwayat penempatan"
                                    deskripsi="Riwayat lokasi muncul setelah aset ditempatkan pada ruangan."
                                />
                            }
                        />
                    </div>
                </Card>
            )}

            {tabAktif === 'pemeliharaan' && (
                <div className="space-y-6">
                    <StatGrid>
                        {kpiPenyusutan.map((item) => (
                            <StatCard key={item.label} {...item} />
                        ))}
                    </StatGrid>

                    <Card
                        judul="Jadwal & riwayat pemeliharaan berkala"
                        tautan={{ label: 'Buka modul pemeliharaan', href: route('pemeliharaan.index') }}
                    >
                        <div className="pt-3">
                            <DataTable
                                kolom={kolomPemeliharaan}
                                baris={aset.riwayat_pemeliharaan}
                                kunciBaris="id"
                                kosong={
                                    <EmptyState
                                        judul="Belum ada riwayat pemeliharaan berkala"
                                        deskripsi="Jadwal dan realisasi pemeliharaan berkala akan tercatat di sini."
                                    />
                                }
                            />
                        </div>
                    </Card>
                </div>
            )}

            {tabAktif === 'dokumen' && (
                <Card
                    judul="Arsip dokumen sumber & BAST aset"
                    deskripsi="Daftar dokumen berita acara serah terima (BAST), faktur perolehan, dan lampiran foto fisik aset."
                >
                    <IsiKartu className="space-y-3">
                        {(aset.dokumen_aset ?? []).map((d) => (
                            <div
                                key={d.id_dokumen}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3 text-sm"
                            >
                                <div>
                                    <p className="font-semibold text-brand-700">
                                        ↕ {d.nama_file} • {d.ukuran_label}
                                    </p>
                                    <p className="mt-0.5 text-xs text-ink-500">
                                        Jenis: {d.jenis_dokumen.toUpperCase()} • Diunggah: {d.tanggal_unggah ?? '-'}
                                    </p>
                                </div>
                                {d.url && (
                                    <a
                                        href={d.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold text-brand-600 hover:underline"
                                    >
                                        Buka dokumen →
                                    </a>
                                )}
                            </div>
                        ))}
                    </IsiKartu>
                </Card>
            )}

            <Modal show={pratinjauFoto} maxWidth="lg" onClose={() => setPratinjauFoto(false)}>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-brand-700">{aset.kode_aset}</p>
                            <h2 className="text-lg font-bold text-ink-900">{aset.nama_barang}</h2>
                        </div>
                        <SecondaryButton type="button" onClick={() => setPratinjauFoto(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                    {aset.foto_url && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
                            <img
                                src={aset.foto_url}
                                alt={aset.nama_barang}
                                className="max-h-96 w-full object-contain"
                            />
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
