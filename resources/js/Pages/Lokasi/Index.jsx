import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Alert from '@/Components/ui/Alert';
import Card, { IsiKartu } from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import StatusText from '@/Components/ui/StatusText';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function KotakInput({ id, label, wajib = false, error, className = '', ...props }) {
    return (
        <div className={className}>
            <div
                className={`rounded-lg border bg-white px-4 py-2.5 transition ${
                    error
                        ? 'border-bahaya-600'
                        : 'border-line focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600'
                }`}
            >
                <label htmlFor={id} className="block text-xs text-ink-500">
                    {label}
                    {wajib && <span className="text-ink-500"> *</span>}
                </label>
                <input
                    id={id}
                    className="mt-0.5 block w-full border-0 bg-transparent p-0 text-sm font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:ring-0"
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-bahaya-600">{error}</p>}
        </div>
    );
}

function KotakSelect({ id, label, wajib = false, error, className = '', children, ...props }) {
    return (
        <div className={className}>
            <div
                className={`rounded-lg border bg-white px-4 py-2.5 transition ${
                    error
                        ? 'border-bahaya-600'
                        : 'border-line focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600'
                }`}
            >
                <label htmlFor={id} className="block text-xs text-ink-500">
                    {label}
                    {wajib && <span className="text-ink-500"> *</span>}
                </label>
                <select
                    id={id}
                    className="mt-0.5 block w-full border-0 bg-transparent p-0 pr-6 text-sm font-medium text-ink-900 focus:ring-0"
                    {...props}
                >
                    {children}
                </select>
            </div>
            {error && <p className="mt-1 text-xs text-bahaya-600">{error}</p>}
        </div>
    );
}

export default function Index({
    kpi = [],
    ruangan,
    semuaRuangan = [],
    idTerpilih,
    filter,
    opsiGedung = [],
    opsiUnit = [],
    opsiSubUnit = [],
    opsiPengguna = [],
}) {
    const [q, setQ] = useState(filter.q ?? '');
    const [gedung, setGedung] = useState(filter.gedung ?? '');
    const [unit, setUnit] = useState(filter.unit ?? '');
    const [modalRuangan, setModalRuangan] = useState(false);
    const [modeModal, setModeModal] = useState('create');
    const timerCari = useRef(null);
    const kartuPenetapanRef = useRef(null);

    const ruanganAwal =
        semuaRuangan.find((r) => Number(r.id_ruangan) === Number(idTerpilih)) ?? semuaRuangan[0] ?? null;

    const penetapanForm = useForm({
        id_ruangan: ruanganAwal?.id_ruangan ?? '',
        id_pengguna_pj: ruanganAwal?.id_pengguna_pj ?? (opsiPengguna[0]?.id_pengguna ?? ''),
    });

    const ruanganForm = useForm({
        id_ruangan: null,
        id_gedung: opsiGedung[0]?.id_gedung ?? '',
        id_unit: opsiUnit[0]?.id_unit ?? '',
        id_sub_unit: '',
        lantai: 1,
        nomor_ruangan: '',
        nama_ruangan: '',
        id_pengguna_pj: opsiPengguna[0]?.id_pengguna ?? '',
    });

    const ruanganAktif =
        semuaRuangan.find((r) => String(r.id_ruangan) === String(penetapanForm.data.id_ruangan)) ?? ruanganAwal;

    const subUnitTersedia = opsiSubUnit.filter((s) => String(s.id_unit) === String(ruanganForm.data.id_unit));

    const adaFilter = q !== '' || gedung !== '' || unit !== '';

    useEffect(() => {
        return () => {
            if (timerCari.current) {
                clearTimeout(timerCari.current);
            }
        };
    }, []);

    const terapkanFilter = (nilaiBaru) => {
        const params = Object.fromEntries(
            Object.entries(nilaiBaru).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );

        router.get(route('lokasi.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const ubahKataKunci = (nilai) => {
        setQ(nilai);
        if (timerCari.current) {
            clearTimeout(timerCari.current);
        }
        timerCari.current = setTimeout(() => {
            terapkanFilter({ q: nilai, gedung, unit });
        }, 300);
    };

    const cari = (e) => {
        e.preventDefault();
        if (timerCari.current) {
            clearTimeout(timerCari.current);
        }
        terapkanFilter({ q, gedung, unit });
    };

    const aturUlang = () => {
        setQ('');
        setGedung('');
        setUnit('');
        terapkanFilter({});
    };

    const pilihRuanganDariTabel = (baris) => {
        penetapanForm.setData({
            id_ruangan: baris.id_ruangan,
            id_pengguna_pj: baris.id_pengguna_pj ?? (opsiPengguna[0]?.id_pengguna ?? ''),
        });

        kartuPenetapanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const gantiRuanganTerpilih = (idBaru) => {
        const target = semuaRuangan.find((r) => String(r.id_ruangan) === String(idBaru));
        penetapanForm.setData({
            id_ruangan: idBaru,
            id_pengguna_pj: target?.id_pengguna_pj ?? (opsiPengguna[0]?.id_pengguna ?? ''),
        });
    };

    const batalPenetapan = () => {
        if (!ruanganAktif) {
            return;
        }
        penetapanForm.setData({
            id_ruangan: ruanganAktif.id_ruangan,
            id_pengguna_pj: ruanganAktif.id_pengguna_pj ?? (opsiPengguna[0]?.id_pengguna ?? ''),
        });
        penetapanForm.clearErrors();
    };

    const simpanPenetapan = (e) => {
        e.preventDefault();
        penetapanForm.post(route('lokasi.penetapan-pj'), {
            preserveScroll: true,
        });
    };

    const bukaModalTambah = () => {
        const unitAwal = opsiUnit[0]?.id_unit ?? '';
        const subAwal = opsiSubUnit.find((s) => String(s.id_unit) === String(unitAwal))?.id_sub_unit ?? '';

        setModeModal('create');
        ruanganForm.clearErrors();
        ruanganForm.setData({
            id_ruangan: null,
            id_gedung: opsiGedung[0]?.id_gedung ?? '',
            id_unit: unitAwal,
            id_sub_unit: subAwal,
            lantai: 1,
            nomor_ruangan: '',
            nama_ruangan: '',
            id_pengguna_pj: opsiPengguna[0]?.id_pengguna ?? '',
        });
        setModalRuangan(true);
    };

    const bukaModalEdit = (target) => {
        if (!target) {
            return;
        }

        setModeModal('edit');
        ruanganForm.clearErrors();
        ruanganForm.setData({
            id_ruangan: target.id_ruangan,
            id_gedung: target.id_gedung,
            id_unit: target.id_unit,
            id_sub_unit: target.id_sub_unit,
            lantai: target.lantai,
            nomor_ruangan: target.kode_ruangan,
            nama_ruangan: target.nama_ruangan,
            id_pengguna_pj: target.id_pengguna_pj ?? (opsiPengguna[0]?.id_pengguna ?? ''),
        });
        setModalRuangan(true);
    };

    const simpanRuangan = (e) => {
        e.preventDefault();

        if (modeModal === 'edit' && ruanganForm.data.id_ruangan) {
            ruanganForm.put(route('lokasi.update', ruanganForm.data.id_ruangan), {
                preserveScroll: true,
                onSuccess: () => setModalRuangan(false),
            });
        } else {
            ruanganForm.post(route('lokasi.store'), {
                preserveScroll: true,
                onSuccess: () => setModalRuangan(false),
            });
        }
    };

    const hapusRuangan = () => {
        if (!ruanganForm.data.id_ruangan) {
            return;
        }

        ruanganForm.delete(route('lokasi.destroy', ruanganForm.data.id_ruangan), {
            preserveScroll: true,
            onSuccess: () => setModalRuangan(false),
        });
    };

    const paramEkspor = Object.fromEntries(
        Object.entries({ q, gedung, unit }).filter(([, v]) => v !== '')
    );

    const kolom = [
        {
            kunci: 'kode_ruangan',
            judul: 'Kode ruangan',
            className: 'font-semibold whitespace-nowrap',
        },
        {
            kunci: 'nama_ruangan',
            judul: 'Nama ruangan',
        },
        {
            judul: 'Penanggung jawab',
            render: (b) =>
                b.penanggung_jawab ? (
                    <span>{b.penanggung_jawab}</span>
                ) : (
                    <span className="text-warn-700">Belum ditetapkan</span>
                ),
        },
        {
            kunci: 'jumlah_aset',
            judul: 'Jumlah aset',
        },
        {
            judul: 'Status',
            render: (b) => <StatusText nada={b.status_nada}>{b.status_label}</StatusText>,
        },
        {
            judul: 'Aksi',
            render: (b) => (
                <button
                    type="button"
                    onClick={() => pilihRuanganDariTabel(b)}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                >
                    Edit →
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Lokasi dan penanggung jawab aset" />

            <PageHeader
                breadcrumb={['FTI', 'Lokasi & penanggung jawab']}
                judul="Lokasi dan penanggung jawab aset"
                deskripsi="Kelola referensi ruangan dan penanggung jawab inventaris fakultas."
            >
                <PrimaryButton type="button" onClick={bukaModalTambah}>
                    + Tambah lokasi
                </PrimaryButton>
            </PageHeader>

            <StatGrid>
                {kpi.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
            </StatGrid>

            <section className="mt-6 rounded-kartu border border-line bg-white">
                <header className="px-6 pt-6">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h2 className="text-lg font-semibold text-ink-900">Referensi lokasi</h2>
                        <a
                            href={route('lokasi.export', paramEkspor)}
                            className="text-xs font-medium text-brand-600 hover:underline"
                        >
                            Ekspor daftar
                        </a>
                    </div>
                </header>

                <form onSubmit={cari} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
                    <div className="flex-1">
                        <SearchInput
                            id="cari-lokasi"
                            value={q}
                            onChange={(e) => ubahKataKunci(e.target.value)}
                            placeholder="Cari kode ruangan atau penanggung jawab..."
                            aria-label="Cari kode ruangan atau penanggung jawab"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <SelectInput
                            id="filter-gedung"
                            value={gedung}
                            onChange={(e) => {
                                const val = e.target.value;
                                setGedung(val);
                                terapkanFilter({ q, gedung: val, unit });
                            }}
                            aria-label="Filter gedung"
                            className="py-2.5 text-sm"
                        >
                            <option value="">Semua gedung</option>
                            {opsiGedung.map((g) => (
                                <option key={g.id_gedung} value={g.id_gedung}>
                                    {g.nama_gedung}
                                </option>
                            ))}
                        </SelectInput>

                        <SelectInput
                            id="filter-unit"
                            value={unit}
                            onChange={(e) => {
                                const val = e.target.value;
                                setUnit(val);
                                terapkanFilter({ q, gedung, unit: val });
                            }}
                            aria-label="Filter unit"
                            className="py-2.5 text-sm"
                        >
                            <option value="">Semua unit</option>
                            {opsiUnit.map((u) => (
                                <option key={u.id_unit} value={u.id_unit}>
                                    {u.nama_unit}
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
                    baris={ruangan.data}
                    kunciBaris="id_ruangan"
                    kosong={
                        <EmptyState
                            judul="Tidak ada ruangan yang cocok"
                            deskripsi={
                                adaFilter
                                    ? 'Ubah kata kunci atau filter gedung/unit untuk melihat daftar lokasi.'
                                    : 'Tambahkan lokasi ruangan baru melalui tombol + Tambah lokasi.'
                            }
                        />
                    }
                />

                <Pagination links={ruangan.links} from={ruangan.from} to={ruangan.to} total={ruangan.total} />
            </section>

            <div ref={kartuPenetapanRef} className="mt-6">
                <Card
                    judul="Penetapan penanggung jawab ruangan"
                    deskripsi={`Referensi terpilih: ${ruanganAktif ? ruanganAktif.kode_ruangan : '-'}`}
                >
                    <IsiKartu>
                        <form onSubmit={simpanPenetapan}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <KotakSelect
                                    id="penetapan_id_ruangan"
                                    label="Ruangan"
                                    value={penetapanForm.data.id_ruangan}
                                    onChange={(e) => gantiRuanganTerpilih(e.target.value)}
                                    error={penetapanForm.errors.id_ruangan}
                                >
                                    {semuaRuangan.map((r) => (
                                        <option key={r.id_ruangan} value={r.id_ruangan}>
                                            {r.kode_ruangan} • {r.nama_ruangan}
                                        </option>
                                    ))}
                                </KotakSelect>

                                <KotakSelect
                                    id="penetapan_id_pengguna_pj"
                                    label="Penanggung jawab ruangan"
                                    value={penetapanForm.data.id_pengguna_pj}
                                    onChange={(e) => penetapanForm.setData('id_pengguna_pj', e.target.value)}
                                    error={penetapanForm.errors.id_pengguna_pj}
                                >
                                    {opsiPengguna.map((u) => (
                                        <option key={u.id_pengguna} value={u.id_pengguna}>
                                            {u.nama_lengkap}
                                        </option>
                                    ))}
                                </KotakSelect>
                            </div>

                            <Alert nada="info" className="mt-4">
                                Perubahan referensi ruangan tidak memindahkan aset. Gunakan mutasi untuk perubahan lokasi atau penguasaan aset individual.
                            </Alert>

                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                {ruanganAktif ? (
                                    <button
                                        type="button"
                                        onClick={() => bukaModalEdit(ruanganAktif)}
                                        className="text-xs font-semibold text-brand-600 hover:underline"
                                    >
                                        Ubah detail ruangan ({ruanganAktif.kode_ruangan}) →
                                    </button>
                                ) : (
                                    <span />
                                )}

                                <div className="flex items-center gap-3">
                                    <SecondaryButton type="button" onClick={batalPenetapan}>
                                        Batal
                                    </SecondaryButton>
                                    <PrimaryButton disabled={penetapanForm.processing}>
                                        ✓ Simpan penetapan
                                    </PrimaryButton>
                                </div>
                            </div>
                        </form>
                    </IsiKartu>
                </Card>
            </div>

            <Modal show={modalRuangan} maxWidth="lg" onClose={() => setModalRuangan(false)}>
                <form onSubmit={simpanRuangan} className="p-6">
                    <h2 className="text-lg font-semibold text-ink-900">
                        {modeModal === 'edit' ? 'Ubah lokasi ruangan' : 'Tambah lokasi ruangan'}
                    </h2>
                    <p className="mt-1 text-sm text-ink-600">
                        {modeModal === 'edit'
                            ? 'Perbarui identitas ruangan, lantai, dan unit kerja pengelola.'
                            : 'Daftarkan ruangan baru di lingkungan Fakultas Teknologi Informasi.'}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <KotakInput
                            id="modal_nomor_ruangan"
                            label="Kode / nomor ruangan"
                            wajib
                            value={ruanganForm.data.nomor_ruangan}
                            onChange={(e) => ruanganForm.setData('nomor_ruangan', e.target.value)}
                            placeholder="FTI-201"
                            error={ruanganForm.errors.nomor_ruangan}
                            required
                        />

                        <KotakInput
                            id="modal_nama_ruangan"
                            label="Nama ruangan"
                            wajib
                            value={ruanganForm.data.nama_ruangan}
                            onChange={(e) => ruanganForm.setData('nama_ruangan', e.target.value)}
                            placeholder="Lab. Sistem Informasi"
                            error={ruanganForm.errors.nama_ruangan}
                            required
                        />

                        <KotakSelect
                            id="modal_id_gedung"
                            label="Gedung"
                            wajib
                            value={ruanganForm.data.id_gedung}
                            onChange={(e) => ruanganForm.setData('id_gedung', e.target.value)}
                            error={ruanganForm.errors.id_gedung}
                            required
                        >
                            {opsiGedung.map((g) => (
                                <option key={g.id_gedung} value={g.id_gedung}>
                                    {g.nama_gedung}
                                </option>
                            ))}
                        </KotakSelect>

                        <KotakInput
                            id="modal_lantai"
                            label="Lantai"
                            wajib
                            type="number"
                            min="1"
                            max="20"
                            value={ruanganForm.data.lantai}
                            onChange={(e) => ruanganForm.setData('lantai', e.target.value)}
                            error={ruanganForm.errors.lantai}
                            required
                        />

                        <KotakSelect
                            id="modal_id_unit"
                            label="Unit kerja"
                            wajib
                            value={ruanganForm.data.id_unit}
                            onChange={(e) => {
                                const unitBaru = e.target.value;
                                const subBaru =
                                    opsiSubUnit.find((s) => String(s.id_unit) === String(unitBaru))?.id_sub_unit ?? '';
                                ruanganForm.setData((prev) => ({
                                    ...prev,
                                    id_unit: unitBaru,
                                    id_sub_unit: subBaru,
                                }));
                            }}
                            error={ruanganForm.errors.id_unit}
                            required
                        >
                            {opsiUnit.map((u) => (
                                <option key={u.id_unit} value={u.id_unit}>
                                    {u.nama_unit}
                                </option>
                            ))}
                        </KotakSelect>

                        <KotakSelect
                            id="modal_id_sub_unit"
                            label="Sub unit"
                            wajib
                            value={ruanganForm.data.id_sub_unit}
                            onChange={(e) => ruanganForm.setData('id_sub_unit', e.target.value)}
                            error={ruanganForm.errors.id_sub_unit}
                            required
                        >
                            {subUnitTersedia.map((s) => (
                                <option key={s.id_sub_unit} value={s.id_sub_unit}>
                                    {s.nama_sub_unit}
                                </option>
                            ))}
                        </KotakSelect>

                        <KotakSelect
                            id="modal_id_pengguna_pj"
                            label="Penanggung jawab ruangan"
                            value={ruanganForm.data.id_pengguna_pj}
                            onChange={(e) => ruanganForm.setData('id_pengguna_pj', e.target.value)}
                            error={ruanganForm.errors.id_pengguna_pj}
                            className="sm:col-span-2"
                        >
                            {opsiPengguna.map((u) => (
                                <option key={u.id_pengguna} value={u.id_pengguna}>
                                    {u.nama_lengkap}
                                </option>
                            ))}
                        </KotakSelect>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                        {modeModal === 'edit' && ruanganAktif?.jumlah_aset === 0 ? (
                            <DangerButton type="button" onClick={hapusRuangan} disabled={ruanganForm.processing}>
                                Hapus ruangan
                            </DangerButton>
                        ) : (
                            <span />
                        )}

                        <div className="flex items-center gap-2.5">
                            <SecondaryButton type="button" onClick={() => setModalRuangan(false)}>
                                Batal
                            </SecondaryButton>
                            <PrimaryButton disabled={ruanganForm.processing}>
                                {modeModal === 'edit' ? '✓ Simpan perubahan' : '✓ Tambah lokasi'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
