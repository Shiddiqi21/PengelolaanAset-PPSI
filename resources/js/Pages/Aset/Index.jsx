import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import TautanAksi from '@/Components/ui/TautanAksi';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const TAB_STATUS = [
    { nilai: '', label: 'Semua aset' },
    { nilai: 'aktif', label: 'Aktif' },
    { nilai: 'dalam_perbaikan', label: 'Dalam pemeliharaan' },
    { nilai: 'dihapus', label: 'Dihapus' },
];

export default function Index({ kpi, aset, filter, opsiKategori, opsiLokasi }) {
    const [q, setQ] = useState(filter.q ?? '');
    const [status, setStatus] = useState(filter.status ?? '');
    const [kategori, setKategori] = useState(filter.kategori ?? '');
    const [kondisi, setKondisi] = useState(filter.kondisi ?? '');
    const [lokasi, setLokasi] = useState(filter.lokasi ?? '');
    const [modalImpor, setModalImpor] = useState(false);
    const timerCari = useRef(null);

    const imporForm = useForm({
        berkas: null,
    });

    const adaFilter = q !== '' || status !== '' || kategori !== '' || kondisi !== '' || lokasi !== '';

    const terapkan = (nilaiBaru) => {
        const params = Object.fromEntries(
            Object.entries(nilaiBaru).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );

        router.get(route('aset.index'), params, {
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
            terapkan({ q: nilai, status, kategori, kondisi, lokasi });
        }, 300);
    };

    const cari = (e) => {
        e.preventDefault();
        if (timerCari.current) {
            clearTimeout(timerCari.current);
        }
        terapkan({ q, status, kategori, kondisi, lokasi });
    };

    const pilihTabStatus = (nilaiStatus) => {
        setStatus(nilaiStatus);
        terapkan({ q, status: nilaiStatus, kategori, kondisi, lokasi });
    };

    const aturUlang = () => {
        setQ('');
        setStatus('');
        setKategori('');
        setKondisi('');
        setLokasi('');
        terapkan({});
    };

    const kirimImpor = (e) => {
        e.preventDefault();
        imporForm.post(route('aset.import'), {
            forceFormData: true,
            onSuccess: () => {
                setModalImpor(false);
                imporForm.reset();
            },
        });
    };

    const paramEkspor = Object.fromEntries(
        Object.entries({ q, status, kategori, kondisi, lokasi }).filter(([, v]) => v !== '')
    );

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
            render: (b) => <TautanAksi href={route('aset.show', b.id_aset)}>Lihat</TautanAksi>,
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Master aset" />

            <PageHeader
                breadcrumb={['FTI', 'Master aset']}
                judul="Master aset"
                deskripsi="Sumber data inventaris tetap Fakultas Teknologi Informasi."
            >
                <TombolLink href={route('aset.create')}>+ Tambah aset</TombolLink>
            </PageHeader>

            <StatGrid>
                {kpi.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
            </StatGrid>

            <section className="mt-6 rounded-kartu border border-line bg-white">
                <header className="px-6 pt-6">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h2 className="text-lg font-semibold text-ink-900">Daftar inventaris</h2>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-brand-600">
                            <button
                                type="button"
                                onClick={() => setModalImpor(true)}
                                className="hover:underline focus:outline-none"
                            >
                                Impor data
                            </button>
                            <span aria-hidden="true">·</span>
                            <a href={route('aset.export', paramEkspor)} className="hover:underline">
                                Ekspor Excel
                            </a>
                        </div>
                    </div>

                    <nav aria-label="Filter status aset" className="mt-4 flex flex-wrap gap-6 border-b border-line">
                        {TAB_STATUS.map((t) => {
                            const aktif = status === t.nilai;

                            return (
                                <button
                                    key={t.label}
                                    type="button"
                                    onClick={() => pilihTabStatus(t.nilai)}
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
                            id="cari-aset"
                            value={q}
                            onChange={(e) => ubahKataKunci(e.target.value)}
                            placeholder="Cari kode atau nama aset..."
                            aria-label="Cari kode atau nama aset"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <SelectInput
                            id="filter-kategori"
                            value={kategori}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKategori(val);
                                terapkan({ q, status, kategori: val, kondisi, lokasi });
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
                            id="filter-kondisi"
                            value={kondisi}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKondisi(val);
                                terapkan({ q, status, kategori, kondisi: val, lokasi });
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
                            id="filter-lokasi"
                            value={lokasi}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLokasi(val);
                                terapkan({ q, status, kategori, kondisi, lokasi: val });
                            }}
                            aria-label="Filter lokasi"
                            className="py-2.5 text-sm"
                        >
                            <option value="">Semua lokasi</option>
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
                            judul="Tidak ada data aset yang cocok"
                            deskripsi={
                                adaFilter
                                    ? 'Ubah kata kunci pencarian atau pilihan filter untuk menampilkan inventaris.'
                                    : 'Tambahkan aset pertama menggunakan tombol + Tambah aset di kanan atas.'
                            }
                        >
                            {!adaFilter && <TombolLink href={route('aset.create')}>+ Tambah aset</TombolLink>}
                        </EmptyState>
                    }
                />

                <Pagination links={aset.links} from={aset.from} to={aset.to} total={aset.total} />
            </section>

            <Alert nada="info" className="mt-6">
                Gunakan kode inventaris unik. Riwayat perubahan, lokasi, dan penanggung jawab tetap tersimpan ketika data aset diperbarui.
            </Alert>

            <Modal show={modalImpor} maxWidth="md" onClose={() => setModalImpor(false)}>
                <form onSubmit={kirimImpor} className="p-6">
                    <h2 className="text-lg font-semibold text-ink-900">Impor data inventaris aset</h2>
                    <p className="mt-1.5 text-sm text-ink-600">
                        Unggah berkas CSV dengan urutan kolom:{' '}
                        <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-ink-900">
                            kode_aset, nama_barang, kode_kategori, merek_tipe, nomor_seri, tahun_perolehan, harga_perolehan, kondisi, status_aset, nama_ruangan
                        </code>
                    </p>

                    <div className="mt-4">
                        <Field label="Berkas CSV" htmlFor="berkas-impor" error={imporForm.errors.berkas}>
                            <input
                                id="berkas-impor"
                                type="file"
                                accept=".csv,text/csv"
                                onChange={(e) => imporForm.setData('berkas', e.target.files?.[0] ?? null)}
                                className="block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-900 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                                required
                            />
                        </Field>
                    </div>

                    <div className="mt-6 flex justify-end gap-2.5">
                        <SecondaryButton type="button" onClick={() => setModalImpor(false)}>
                            Batal
                        </SecondaryButton>
                        <PrimaryButton disabled={imporForm.processing}>Impor sekarang</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
