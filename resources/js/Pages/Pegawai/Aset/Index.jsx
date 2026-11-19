import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import Card, { IsiKartu } from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import Badge from '@/Components/ui/Badge';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Index({ pj, jumlahAktif, aset, riwayat = [], dokumen = [], tab = 'aktif', filter, opsiKategori = [] }) {
    const [tabAktif, setTabAktif] = useState(tab);
    const [q, setQ] = useState(filter.q ?? '');
    const [kategori, setKategori] = useState(filter.kategori ?? '');
    const [kondisi, setKondisi] = useState(filter.kondisi ?? '');
    const timerCari = useRef(null);

    const adaFilter = q !== '' || kategori !== '' || kondisi !== '';

    const terapkan = (nilaiBaru) => {
        const params = Object.fromEntries(
            Object.entries(nilaiBaru).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );

        router.get(route('pegawai.aset'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        return () => {
            if (timerCari.current) {
                clearTimeout(timerCari.current);
            }
        };
    }, []);

    const ubahKataKunci = (nilai) => {
        setQ(nilai);
        if (timerCari.current) {
            clearTimeout(timerCari.current);
        }
        timerCari.current = setTimeout(() => {
            terapkan({ q: nilai, kategori, kondisi });
        }, 300);
    };

    const aturUlang = () => {
        setQ('');
        setKategori('');
        setKondisi('');
        terapkan({});
    };

    const kolom = [
        { kunci: 'kode_aset', judul: 'Kode aset', className: 'font-semibold whitespace-nowrap' },
        { kunci: 'nama_barang', judul: 'Nama barang' },
        { kunci: 'tanggal_penetapan', judul: 'Tanggal penetapan', className: 'whitespace-nowrap' },
        {
            judul: 'Kondisi',
            render: (b) => <StatusText nada={b.kondisi_nada}>{b.kondisi_label}</StatusText>,
        },
        { kunci: 'harga_perolehan_label', judul: 'Nilai perolehan', className: 'whitespace-nowrap' },
        {
            judul: 'Aksi',
            render: (b) => <TautanAksi href={route('pegawai.aset.show', b.id_aset)}>Lihat</TautanAksi>,
        },
    ];

    const kolomRiwayat = [
        { kunci: 'kode_aset', judul: 'Kode aset', className: 'font-semibold whitespace-nowrap' },
        { kunci: 'nama_barang', judul: 'Nama barang' },
        { kunci: 'ruangan', judul: 'Lokasi' },
        { kunci: 'tanggal_mulai', judul: 'Mulai', className: 'whitespace-nowrap' },
        {
            judul: 'Status',
            render: (b) =>
                b.aktif ? (
                    <Badge nada="sukses">Aktif</Badge>
                ) : (
                    <span className="text-ink-600">Berakhir {b.tanggal_selesai}</span>
                ),
        },
        {
            judul: 'Aksi',
            render: (b) =>
                b.aktif ? <TautanAksi href={route('pegawai.aset.show', b.id_aset)}>Lihat</TautanAksi> : '-',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Aset tanggung jawab pribadi" />

            <PageHeader
                breadcrumb={['FTI', 'Aset tanggung jawab pribadi']}
                judul="Daftar aset tanggung jawab pribadi"
                deskripsi={`Inventaris atas nama ${pj.nama} • ${pj.unit_lengkap}`}
            />

            <Card judul="Penanggung jawab inventaris">
                <IsiKartu>
                    <InfoList
                        item={[
                            { label: 'Nama / unit', nilai: `${pj.nama} / ${pj.unit}` },
                            { label: 'Lokasi penggunaan', nilai: pj.lokasi },
                            { label: 'Dasar penetapan', nilai: pj.dasar },
                        ]}
                    />
                </IsiKartu>
            </Card>

            <section className="mt-6 rounded-kartu border border-line bg-white">
                <header className="px-6 pt-6">
                    <h2 className="text-lg font-semibold text-ink-900">{jumlahAktif} aset dalam tanggung jawab Anda</h2>

                    <nav aria-label="Bagian daftar aset" className="mt-4 flex flex-wrap gap-6 border-b border-line">
                        {[
                            { kunci: 'aktif', label: `Aset aktif (${jumlahAktif})` },
                            { kunci: 'riwayat', label: 'Riwayat penetapan' },
                        ].map((t) => {
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
                </header>

                {tabAktif === 'aktif' ? (
                    <>
                        <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
                            <div className="flex-1">
                                <SearchInput
                                    value={q}
                                    onChange={(e) => ubahKataKunci(e.target.value)}
                                    placeholder="Cari aset pribadi berdasarkan nama atau kode..."
                                    aria-label="Cari aset pribadi"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <SelectInput
                                    value={kategori}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setKategori(val);
                                        terapkan({ q, kategori: val, kondisi });
                                    }}
                                    aria-label="Filter kategori"
                                    className="py-2.5 text-sm"
                                >
                                    <option value="">Semua kategori</option>
                                    {opsiKategori.map((k) => (
                                        <option key={k.id_kategori} value={k.id_kategori}>
                                            {k.nama_kategori}
                                        </option>
                                    ))}
                                </SelectInput>

                                <SelectInput
                                    value={kondisi}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setKondisi(val);
                                        terapkan({ q, kategori, kondisi: val });
                                    }}
                                    aria-label="Filter kondisi"
                                    className="py-2.5 text-sm"
                                >
                                    <option value="">Semua kondisi</option>
                                    <option value="baik">Baik</option>
                                    <option value="kurang_baik">Rusak ringan</option>
                                    <option value="rusak_berat">Rusak berat</option>
                                </SelectInput>

                                {adaFilter && (
                                    <SecondaryButton type="button" onClick={aturUlang}>
                                        Atur ulang
                                    </SecondaryButton>
                                )}
                            </div>
                        </div>

                        <DataTable
                            kolom={kolom}
                            baris={aset.data}
                            kunciBaris="id_aset"
                            kosong={
                                <EmptyState
                                    judul="Tidak ada aset yang cocok"
                                    deskripsi={
                                        adaFilter
                                            ? 'Ubah kata kunci atau filter untuk menampilkan aset pribadi Anda.'
                                            : 'Belum ada aset yang ditetapkan atas nama Anda.'
                                    }
                                />
                            }
                        />

                        <Pagination links={aset.links} from={aset.from} to={aset.to} total={aset.total} />
                    </>
                ) : (
                    <div className="pt-3">
                        <DataTable
                            kolom={kolomRiwayat}
                            baris={riwayat}
                            kunciBaris="id_penempatan"
                            kosong={<EmptyState judul="Belum ada riwayat penetapan" />}
                        />
                        <div className="pb-4" />
                    </div>
                )}
            </section>

            <Card judul="Dokumen penetapan" className="mt-6">
                <IsiKartu className="space-y-2.5">
                    {dokumen.length === 0 ? (
                        <p className="text-sm text-ink-600">Belum ada dokumen penetapan.</p>
                    ) : (
                        <div className="space-y-2 rounded-lg bg-surface px-4 py-3">
                            {dokumen.map((d) => (
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
                    )}
                </IsiKartu>
            </Card>

            <Alert nada="info" className="mt-6">
                Periksa kesesuaian aset dengan kondisi fisik secara berkala. Hubungi Operator Aset Fakultas bila terdapat ketidaksesuaian data.
            </Alert>
        </AuthenticatedLayout>
    );
}
