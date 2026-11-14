import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import BarChart from '@/Components/ui/BarChart';
import Breadcrumb from '@/Components/ui/Breadcrumb';
import Card, { IsiKartu } from '@/Components/ui/Card';
import CheckboxGroup from '@/Components/ui/CheckboxGroup';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import FloatingInput from '@/Components/ui/FloatingInput';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import ProgressList from '@/Components/ui/ProgressList';
import QuickActions from '@/Components/ui/QuickActions';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TabNav from '@/Components/ui/TabNav';
import TautanAksi from '@/Components/ui/TautanAksi';
import Timeline from '@/Components/ui/Timeline';
import TombolLink from '@/Components/ui/TombolLink';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

function Contoh({ judul, berkas, kode, children }) {
    return (
        <section className="rounded-kartu border border-line bg-white">
            <header className="border-b border-line px-6 py-4">
                <h2 className="text-lg font-semibold text-ink-900">{judul}</h2>
                <p className="mt-0.5 text-xs text-ink-500">{berkas}</p>
            </header>
            <div className="bg-surface p-6">{children}</div>
            <pre className="overflow-x-auto border-t border-line bg-ink-900 px-6 py-4 text-xs leading-relaxed text-brand-100">
                <code>{kode}</code>
            </pre>
        </section>
    );
}

export default function Galeri() {
    const [terpilih, setTerpilih] = useState([1]);
    const [dialog, setDialog] = useState(false);

    const baris = [
        { nomor: 'PGD-2026-0087', jenis: 'Pengadaan • 10 PC', status: 'Menunggu persetujuan', nada: 'peringatan', href: '#' },
        { nomor: 'PRB-2026-0031', jenis: 'Perbaikan • Proyektor', status: 'Dikerjakan', nada: 'info', href: '#' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Galeri komponen" />

            <PageHeader
                breadcrumb={['FTI', 'Galeri komponen']}
                judul="Galeri komponen UI"
                deskripsi="Semua komponen bersama untuk halaman baru. Halaman ini hanya muncul di environment local. Salin kode di bawah tiap contoh."
            />

            <div className="space-y-6">
                <Contoh
                    judul="Kerangka halaman"
                    berkas="Layouts/AuthenticatedLayout.jsx, Components/ui/PageHeader.jsx"
                    kode={`<AuthenticatedLayout>
    <Head title="Master aset" />
    <PageHeader breadcrumb={['FTI', 'Master aset']} judul="Master aset" deskripsi="...">
        <TombolLink href={route('aset.create')}>+ Tambah aset</TombolLink>
    </PageHeader>
    {/* isi halaman */}
</AuthenticatedLayout>`}
                >
                    <PageHeader breadcrumb={['FTI', 'Master aset']} judul="Master aset" deskripsi="Daftar seluruh aset tetap fakultas.">
                        <TombolLink href="#">+ Tambah aset</TombolLink>
                    </PageHeader>
                    <Breadcrumb butir={['FTI', 'Dashboard']} />
                </Contoh>

                <Contoh
                    judul="Tombol"
                    berkas="Components/PrimaryButton, SecondaryButton, DangerButton, ui/TombolLink"
                    kode={`<PrimaryButton>Simpan</PrimaryButton>
<SecondaryButton onClick={...}>Batal</SecondaryButton>
<DangerButton>Hapus</DangerButton>
<TombolLink href={route('aset.index')} varian="sekunder">Lihat aset</TombolLink>  {/* untuk berpindah halaman */}`}
                >
                    <div className="flex flex-wrap gap-3">
                        <PrimaryButton>Simpan</PrimaryButton>
                        <SecondaryButton>Batal</SecondaryButton>
                        <DangerButton>Hapus</DangerButton>
                        <TombolLink href="#" varian="sekunder">
                            Lihat aset
                        </TombolLink>
                    </div>
                </Contoh>

                <Contoh
                    judul="Banner dan status"
                    berkas="ui/Alert, ui/Badge, ui/StatusText"
                    kode={`<Alert nada="peringatan">2 dokumen penerimaan belum lengkap.</Alert>   {/* info | sukses | peringatan | bahaya */}
<Badge nada="sukses">Aktif</Badge>
<StatusText nada="peringatan">Menunggu persetujuan</StatusText>`}
                >
                    <div className="space-y-3">
                        <Alert nada="info">Informasi umum untuk pengguna.</Alert>
                        <Alert nada="peringatan">2 dokumen penerimaan belum lengkap.</Alert>
                        <Alert nada="bahaya">Aksi gagal. Periksa isian Anda.</Alert>
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge nada="sukses">Aktif</Badge>
                            <Badge nada="netral">Nonaktif</Badge>
                            <Badge nada="bahaya">Rusak berat</Badge>
                            <StatusText nada="peringatan">Menunggu persetujuan</StatusText>
                            <StatusText nada="info">Dikerjakan</StatusText>
                            <StatusText nada="sukses">Disetujui</StatusText>
                        </div>
                    </div>
                </Contoh>

                <Contoh
                    judul="Kartu indikator"
                    berkas="ui/StatCard (StatCard, StatGrid)"
                    kode={`<StatGrid>
    {kpi.map((k) => <StatCard key={k.label} {...k} />)}   {/* { label, nilai, keterangan, nada } */}
</StatGrid>`}
                >
                    <StatGrid>
                        <StatCard label="Master aset" nilai="1.248" keterangan="6 aset ditambahkan bulan ini" nada="sukses" />
                        <StatCard label="Perlu verifikasi" nilai="8" keterangan="6 pengajuan + 2 penerimaan" nada="peringatan" />
                    </StatGrid>
                </Contoh>

                <Contoh
                    judul="Kartu, tabel, dan pagination"
                    berkas="ui/Card, ui/DataTable, ui/Pagination, ui/TautanAksi, ui/EmptyState"
                    kode={`<Card judul="Antrean pekerjaan" tautan={{ label: 'Lihat semua', href: route('x.index') }}>
    <div className="pt-3">
        <DataTable
            kolom={[
                { kunci: 'nomor', judul: 'Nomor', className: 'font-semibold' },
                { judul: 'Status', render: (b) => <StatusText nada={b.nada}>{b.status}</StatusText> },
                { judul: 'Aksi', render: (b) => <TautanAksi href={b.href}>Lihat</TautanAksi> },
            ]}
            baris={data.data}            // hasil paginate()->through(...)
            kunciBaris="nomor"
            kosong={<EmptyState judul="Belum ada data" />}
        />
    </div>
    <Pagination links={data.links} from={data.from} to={data.to} total={data.total} />
</Card>`}
                >
                    <Card judul="Antrean pekerjaan" tautan={{ label: 'Lihat semua', href: '#' }}>
                        <div className="pt-3">
                            <DataTable
                                kolom={[
                                    { kunci: 'nomor', judul: 'Nomor', className: 'font-semibold' },
                                    { kunci: 'jenis', judul: 'Jenis / perihal' },
                                    { judul: 'Status', render: (b) => <StatusText nada={b.nada}>{b.status}</StatusText> },
                                    { judul: 'Aksi', render: (b) => <TautanAksi href={b.href}>Lihat</TautanAksi> },
                                ]}
                                baris={baris}
                                kunciBaris="nomor"
                            />
                        </div>
                        <Pagination from={1} to={2} total={2} />
                    </Card>
                    <Card className="mt-4">
                        <EmptyState judul="Belum ada aset" deskripsi="Aset muncul setelah penerimaan dicatat." />
                    </Card>
                </Contoh>

                <Contoh
                    judul="Form"
                    berkas="ui/Field, ui/SelectInput, ui/SearchInput, ui/CheckboxGroup, ui/FloatingInput, Components/TextInput"
                    kode={`<Field label="Nama lengkap" htmlFor="nama" error={errors.nama} petunjuk="Sesuai KTP">
    <TextInput id="nama" className="block w-full" value={data.nama} onChange={(e) => setData('nama', e.target.value)} />
</Field>
<SelectInput value={...} onChange={...}><option value="">Semua</option></SelectInput>
<SearchInput placeholder="Cari nomor pengajuan..." value={q} onChange={...} />
<CheckboxGroup pilihan={[{ nilai: 1, label: 'Pemohon' }]} terpilih={ids} onChange={setIds} />
<FloatingInput id="username" label="Nama pengguna" wajib value={...} onChange={...} />   {/* gaya halaman login */}`}
                >
                    <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
                        <Field label="Nama lengkap" htmlFor="g-nama" petunjuk="Sesuai identitas">
                            <TextInput id="g-nama" className="block w-full" />
                        </Field>
                        <Field label="Unit" htmlFor="g-unit">
                            <SelectInput id="g-unit" className="block w-full">
                                <option>Pilih unit</option>
                            </SelectInput>
                        </Field>
                        <SearchInput placeholder="Cari nomor pengajuan..." aria-label="Cari" />
                        <CheckboxGroup
                            pilihan={[
                                { nilai: 1, label: 'Pemohon', deskripsi: 'Mengajukan kebutuhan aset' },
                                { nilai: 2, label: 'Pegawai/Dosen' },
                            ]}
                            terpilih={terpilih}
                            onChange={setTerpilih}
                        />
                        <FloatingInput id="g-user" label="Nama pengguna" wajib />
                    </div>
                </Contoh>

                <Contoh
                    judul="Dialog konfirmasi"
                    berkas="ui/ConfirmDialog"
                    kode={`<ConfirmDialog show={!!target} judul="Hapus aset ini?" pesan="Aset tidak dapat dikembalikan."
    labelKonfirmasi="Hapus" nada="bahaya" memproses={proses} onKonfirmasi={kirim} onTutup={() => setTarget(null)} />`}
                >
                    <DangerButton onClick={() => setDialog(true)}>Coba dialog</DangerButton>
                    <ConfirmDialog
                        show={dialog}
                        judul="Hapus aset ini?"
                        pesan="Aset yang dihapus tidak dapat dikembalikan."
                        labelKonfirmasi="Hapus"
                        nada="bahaya"
                        onKonfirmasi={() => setDialog(false)}
                        onTutup={() => setDialog(false)}
                    />
                </Contoh>

                <Contoh
                    judul="Ringkasan visual"
                    berkas="ui/ProgressList, ui/BarChart, ui/Timeline, ui/QuickActions, ui/InfoList"
                    kode={`<ProgressList item={[{ label: 'Baik', nilai: '1.106 aset • 88,6%', persen: 88.6, nada: 'sukses' }]} />
<BarChart data={[{ label: 'Mei', a: 78, b: 20 }]} namaA="Perolehan aset" namaB="Penyusutan" satuan="Dalam juta rupiah" />
<Timeline item={[{ ikon: 'selesai', judul: '...', detail: '...', waktu: '...' }]} />   {/* ikon: selesai | jadwal */}
<QuickActions item={[{ label: 'Pengadaan', href: route('pemohon.pengadaan') }]} />
<InfoList item={[{ label: 'Jam layanan', nilai: 'Senin–Jumat, 08.00–16.00 WIB' }]} />`}
                >
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card judul="Kondisi inventaris">
                            <IsiKartu>
                                <ProgressList
                                    item={[
                                        { label: 'Baik', nilai: '1.106 aset • 88,6%', persen: 88.6, nada: 'sukses' },
                                        { label: 'Rusak ringan', nilai: '108 aset • 8,7%', persen: 8.7, nada: 'peringatan' },
                                    ]}
                                />
                            </IsiKartu>
                        </Card>
                        <Card judul="Perolehan">
                            <IsiKartu>
                                <BarChart
                                    data={[
                                        { label: 'Mei', a: 78, b: 20 },
                                        { label: 'Jun', a: 89, b: 28 },
                                        { label: 'Jul', a: 68, b: 24 },
                                    ]}
                                    namaA="Perolehan aset"
                                    namaB="Penyusutan"
                                    satuan="Dalam juta rupiah"
                                />
                            </IsiKartu>
                        </Card>
                        <Card judul="Aktivitas">
                            <IsiKartu>
                                <Timeline
                                    item={[
                                        { ikon: 'selesai', judul: 'PGD-2026-0087 diteruskan', detail: 'Kepala Kantor telah memberi rekomendasi', waktu: '20 Okt 2026, 14.30 WIB' },
                                        { ikon: 'jadwal', judul: 'Pemeliharaan AC', detail: 'FTI-2022-0018', waktu: '23 Okt 2026, 09.00 WIB' },
                                    ]}
                                />
                            </IsiKartu>
                        </Card>
                        <Card judul="Pintasan dan info">
                            <IsiKartu className="space-y-6">
                                <QuickActions item={[{ label: 'Pengadaan', href: '#' }, { label: 'Perbaikan', href: '#' }]} />
                                <InfoList item={[{ label: 'Jam layanan', nilai: 'Senin–Jumat, 08.00–16.00 WIB' }]} />
                            </IsiKartu>
                        </Card>
                    </div>
                </Contoh>

                <Contoh
                    judul="Tab navigasi"
                    berkas="ui/TabNav"
                    kode={`<TabNav tab={[{ label: 'Akun pengguna', href: route('pengguna.index'), aktif: true }, { label: 'Hak akses', href: route('hak-akses.index'), aktif: false }]} />`}
                >
                    <TabNav
                        tab={[
                            { label: 'Akun pengguna', href: '#a', aktif: true },
                            { label: 'Hak akses', href: '#b', aktif: false },
                        ]}
                    />
                </Contoh>
            </div>
        </AuthenticatedLayout>
    );
}
