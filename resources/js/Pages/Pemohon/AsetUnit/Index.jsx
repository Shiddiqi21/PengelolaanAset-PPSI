import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const TAB_KONDISI = [
    { nilai: '', label: 'Semua aset unit' },
    { nilai: 'baik', label: 'Baik' },
    { nilai: 'kurang_baik', label: 'Rusak ringan' },
    { nilai: 'rusak_berat', label: 'Rusak berat' },
];

export default function Index({ unitInfo, kpi = [], aset, filter, opsiKategori = [], opsiLokasi = [] }) {
    const [q, setQ] = useState(filter.q ?? '');
    const [kategori, setKategori] = useState(filter.kategori ?? '');
    const [kondisi, setKondisi] = useState(filter.kondisi ?? '');
    const [lokasi, setLokasi] = useState(filter.lokasi ?? '');
    const timerCari = useRef(null);

    const adaFilter = q !== '' || kategori !== '' || kondisi !== '' || lokasi !== '';

    const terapkan = (nilaiBaru) => {
        const params = Object.fromEntries(
            Object.entries(nilaiBaru).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );

        router.get(route('pemohon.aset-unit'), params, {
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
            terapkan({ q: nilai, kategori, kondisi, lokasi });
        }, 300);
    };

    const cari = (e) => {
        e.preventDefault();
        if (timerCari.current) {
            clearTimeout(timerCari.current);
        }
        terapkan({ q, kategori, kondisi, lokasi });
    };

    const pilihTabKondisi = (nilaiKondisi) => {
        setKondisi(nilaiKondisi);
        terapkan({ q, kategori, kondisi: nilaiKondisi, lokasi });
    };

    const aturUlang = () => {
        setQ('');
        setKategori('');
        setKondisi('');
        setLokasi('');
        terapkan({});
    };

    const kolom = [
        {
            kunci: 'kode_aset',
            judul: 'Kode aset',
            className: 'font-semibold whitespace-nowrap',
        },
        {
            kunci: 'nama_barang',
            judul: 'Nama aset',
        },
        {
            kunci: 'lokasi',
            judul: 'Lokasi',
        },
        {
            judul: 'Kondisi',
            render: (b) => <StatusText nada={b.kondisi_nada}>{b.kondisi_label}</StatusText>,
        },
        {
            kunci: 'harga_perolehan_label',
            judul: 'Nilai perolehan',
            className: 'whitespace-nowrap',
        },
        {
            judul: 'Aksi',
            render: (b) => <TautanAksi href={route('pemohon.aset-unit.show', b.id_aset)}>Lihat</TautanAksi>,
        },
    ];

    const namaUnitRingkas = unitInfo?.nama_ringkas ?? 'Sistem Informasi';
    const namaUnitLengkap = unitInfo?.nama_unit ?? 'Program Studi Sistem Informasi';

    return (
        <AuthenticatedLayout>
            <Head title="Daftar aset unit" />

            <PageHeader
                breadcrumb={['FTI', 'Daftar aset unit']}
                judul="Daftar aset unit"
                deskripsi={`Inventaris ${namaUnitLengkap} yang dapat dijadikan referensi pengajuan.`}
            />

            <StatGrid>
                {kpi.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
            </StatGrid>

            <section className="mt-6 rounded-kartu border border-line bg-white">
                <header className="px-6 pt-6">
                    <h2 className="text-lg font-semibold text-ink-900">Inventaris {namaUnitRingkas}</h2>

                    <nav aria-label="Filter kondisi aset unit" className="mt-4 flex flex-wrap gap-6 border-b border-line">
                        {TAB_KONDISI.map((t) => {
                            const aktif = kondisi === t.nilai;

                            return (
                                <button
                                    key={t.label}
                                    type="button"
                                    onClick={() => pilihTabKondisi(t.nilai)}
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

                <form onSubmit={cari} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
                    <div className="flex-1">
                        <SearchInput
                            id="cari-aset-unit"
                            value={q}
                            onChange={(e) => ubahKataKunci(e.target.value)}
                            placeholder="Cari kode atau nama aset..."
                            aria-label="Cari kode atau nama aset"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <SelectInput
                            id="filter-kategori-unit"
                            value={kategori}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKategori(val);
                                terapkan({ q, kategori: val, kondisi, lokasi });
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
                            id="filter-kondisi-unit"
                            value={kondisi}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKondisi(val);
                                terapkan({ q, kategori, kondisi: val, lokasi });
                            }}
                            aria-label="Filter kondisi"
                            className="py-2.5 text-sm"
                        >
                            <option value="">Semua kondisi</option>
                            <option value="baik">Baik</option>
                            <option value="kurang_baik">Rusak ringan</option>
                            <option value="rusak_berat">Rusak berat</option>
                        </SelectInput>

                        <SelectInput
                            id="filter-lokasi-unit"
                            value={lokasi}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLokasi(val);
                                terapkan({ q, kategori, kondisi, lokasi: val });
                            }}
                            aria-label="Filter ruangan unit"
                            className="py-2.5 text-sm"
                        >
                            <option value="">Seluruh ruang unit</option>
                            {opsiLokasi.map((r) => (
                                <option key={r.id_ruangan} value={r.id_ruangan}>
                                    {r.nama_ruangan ?? r.nomor_ruangan}
                                </option>
                            ))}
                        </SelectInput>

                        {adaFilter && (
                            <SecondaryButton type="button" onClick={aturUlang}>
                                Atur ulang
                            </SecondaryButton>
                        )}
                    </div>
                </form>

                <DataTable
                    kolom={kolom}
                    baris={aset.data}
                    kunciBaris="id_aset"
                    kosong={
                        <EmptyState
                            judul="Tidak ada aset unit yang cocok"
                            deskripsi={
                                adaFilter
                                    ? 'Ubah kata kunci pencarian atau pilihan filter untuk menampilkan inventaris unit.'
                                    : 'Belum ada aset yang ditempatkan pada unit kerja Anda.'
                            }
                        />
                    }
                />

                <Pagination links={aset.links} from={aset.from} to={aset.to} total={aset.total} />
            </section>

            <Alert nada="info" className="mt-6">
                Pemohon dapat melihat aset unit dan mengajukan kebutuhan. Perubahan data inventaris hanya dilakukan oleh Operator Aset Fakultas.
            </Alert>
        </AuthenticatedLayout>
    );
}
