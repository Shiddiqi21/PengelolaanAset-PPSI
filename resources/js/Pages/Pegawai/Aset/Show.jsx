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
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

function FotoAset({ fotoUrl, nama, onClick }) {
    if (fotoUrl) {
        return (
            <button
                type="button"
                onClick={onClick}
                title="Klik untuk memperbesar gambar aset"
                className="group h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
                <img src={fotoUrl} alt={nama} className="h-full w-full object-cover transition group-hover:scale-105" />
            </button>
        );
    }

    return (
        <div
            className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-700"
            aria-hidden="true"
        >
            <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="9" y="10" width="22" height="15" rx="2.5" />
                <path d="M5 29h30" strokeLinecap="round" />
            </svg>
        </div>
    );
}

export default function Show({ aset, pegawai }) {
    const [pratinjau, setPratinjau] = useState(false);

    const kolom = [
        { kunci: 'tanggal', judul: 'Tanggal', className: 'font-semibold whitespace-nowrap w-36' },
        { kunci: 'kegiatan', judul: 'Kegiatan' },
        { kunci: 'dokumen', judul: 'Dokumen', className: 'whitespace-nowrap' },
        {
            judul: 'Pelaksana',
            render: (b) => <span className="font-semibold text-ink-900">{b.pelaksana}</span>,
        },
    ];

    const jumlah = aset.riwayat_pencatatan?.length ?? 0;

    return (
        <AuthenticatedLayout>
            <Head title={`Detail aset ${aset.kode_aset}`} />

            <PageHeader
                breadcrumb={['FTI', 'Aset tanggung jawab pribadi']}
                judul="Detail aset"
                deskripsi={`${aset.kode_aset} • Aset dalam tanggung jawab ${pegawai.nama}`}
            >
                <TombolLink href={route('pegawai.aset')} varian="sekunder">
                    ← Daftar aset saya
                </TombolLink>
            </PageHeader>

            <Card judul="Aset kerja">
                <IsiKartu>
                    <div className="flex flex-wrap items-center gap-5">
                        <FotoAset fotoUrl={aset.foto_url} nama={aset.nama_barang} onClick={() => setPratinjau(true)} />
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

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card judul="Identitas aset pribadi" className="lg:col-span-2">
                    <IsiKartu>
                        <InfoList
                            item={[
                                { label: 'Kode aset', nilai: aset.kode_aset },
                                { label: 'Nama / tipe', nilai: `${aset.nama_barang}${aset.merek_tipe !== '-' ? ` (${aset.merek_tipe})` : ''}` },
                                { label: 'Spesifikasi', nilai: aset.spesifikasi },
                                { label: 'Nomor seri', nilai: aset.nomor_seri },
                                { label: 'Tanggal perolehan', nilai: aset.tanggal_perolehan },
                                { label: 'Nilai perolehan', nilai: aset.harga_perolehan_label },
                                { label: 'Lokasi', nilai: aset.kode_lokasi },
                                { label: 'Penanggung jawab', nilai: aset.penanggung_jawab },
                                { label: 'Kondisi terakhir', nilai: aset.kondisi_terakhir },
                            ]}
                        />
                    </IsiKartu>
                </Card>

                <div className="space-y-6">
                    <Card judul="Dokumen penetapan">
                        <IsiKartu>
                            <div className="space-y-2 rounded-lg bg-surface px-4 py-3">
                                {(aset.dokumen_aset ?? []).map((d) => (
                                    <p key={d.id_dokumen} className="text-xs font-semibold text-brand-700">
                                        {d.url ? (
                                            <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">
                                                ↕ {d.nama_file} • {d.ukuran_label}
                                            </a>
                                        ) : (
                                            <span>
                                                ↕ {d.nama_file} • {d.ukuran_label}
                                            </span>
                                        )}
                                    </p>
                                ))}
                            </div>
                        </IsiKartu>
                    </Card>

                    <Alert nada="info">
                        Aset digunakan untuk kegiatan akademik dan kedinasan. Penanggung jawab menjaga keamanan, kelengkapan, serta kesesuaian lokasi penggunaan aset.
                    </Alert>
                </div>
            </div>

            <Card judul="Riwayat pencatatan" className="mt-6">
                <div className="pt-3">
                    <DataTable
                        kolom={kolom}
                        baris={aset.riwayat_pencatatan}
                        kunciBaris="id"
                        kosong={<EmptyState judul="Belum ada riwayat pencatatan" />}
                    />
                </div>
                <Pagination from={jumlah > 0 ? 1 : 0} to={jumlah} total={jumlah} />
            </Card>

            <Modal show={pratinjau} maxWidth="lg" onClose={() => setPratinjau(false)}>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-brand-700">{aset.kode_aset}</p>
                            <h2 className="text-lg font-bold text-ink-900">{aset.nama_barang}</h2>
                        </div>
                        <SecondaryButton type="button" onClick={() => setPratinjau(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                    {aset.foto_url && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
                            <img src={aset.foto_url} alt={aset.nama_barang} className="max-h-96 w-full object-contain" />
                        </div>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
