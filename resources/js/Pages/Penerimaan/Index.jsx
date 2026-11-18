import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import EmptyState from '@/Components/ui/EmptyState';
import Field from '@/Components/ui/Field';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import SelectInput from '@/Components/ui/SelectInput';
import StatCard, { StatGrid } from '@/Components/ui/StatCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function formatTanggal(tanggalString) {
    if (!tanggalString) return '-';
    try {
        const d = new Date(tanggalString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(d);
    } catch {
        return tanggalString;
    }
}

export default function PenerimaanIndex({
    daftarPengajuan = [],
    riwayatPenerimaan,
    daftarVendor = [],
    daftarRuangan = [],
    daftarPengguna = [],
    statistik = {},
    filters = {},
}) {
    const { flash } = usePage().props;

    // Filter pencarian tabel
    const [q, setQ] = useState(filters.q || '');
    const [filterHasil, setFilterHasil] = useState(filters.hasil_verifikasi || '');
    const isFirstRender = useRef(true);

    // Modal detail riwayat
    const [modalDetailBuka, setModalDetailBuka] = useState(false);
    const [detailPenerimaan, setDetailPenerimaan] = useState(null);

    // Alert peringatan formulir
    const [formPeringatan, setFormPeringatan] = useState(null);

    // Form Inertia
    const form = useForm({
        id_pengajuan: '',
        id_vendor: '',
        tanggal_terima: new Date().toISOString().slice(0, 10),
        nomor_nota: '',
        catatan: '',
        registrasi_aset: true,
        id_ruangan: '',
        id_pengguna_pj: '',
        items: [],
    });

    // Debounced search tabel riwayat
    const terapkanFilter = (keyword, hasil) => {
        router.get(
            route('penerimaan.index'),
            {
                q: keyword || undefined,
                hasil_verifikasi: hasil || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            terapkanFilter(q, filterHasil);
        }, 350);

        return () => clearTimeout(timer);
    }, [q, filterHasil]);

    // Handler memilih pengajuan pengadaan
    const handlePilihPengajuan = (e) => {
        const id = e.target.value;
        const selected = daftarPengajuan.find((p) => String(p.id_pengajuan) === String(id));

        const itemBaru = selected
            ? selected.item_pengadaan.map((item) => {
                  const sisa = item.sisa_jumlah ?? item.jumlah;
                  return {
                      id_item_pengadaan: item.id_item_pengadaan,
                      nama_barang: item.nama_barang,
                      kategori_nama: item.kategori?.nama_kategori || '-',
                      spesifikasi_diminta: item.spesifikasi || '-',
                      jumlah_diminta: item.jumlah,
                      sisa_jumlah: sisa,
                      jumlah_diterima: sisa > 0 ? sisa : item.jumlah,
                      spesifikasi_diterima: item.spesifikasi || '',
                      hasil_verifikasi: 'sesuai',
                      catatan_kekurangan: '',
                  };
              })
            : [];

        form.setData({
            ...form.data,
            id_pengajuan: id,
            items: itemBaru,
        });
        setFormPeringatan(null);
    };

    // Handler ubah field per item
    const updateItem = (index, field, value) => {
        const nextItems = [...form.data.items];
        nextItems[index] = {
            ...nextItems[index],
            [field]: value,
        };

        // Jika jumlah diterima kurang dari sisa atau jumlah diajukan, otomatis ubah hasil verifikasi jika masih sesuai
        if (field === 'jumlah_diterima') {
            const jml = parseInt(value, 10) || 0;
            if (jml < nextItems[index].sisa_jumlah && nextItems[index].hasil_verifikasi === 'sesuai') {
                nextItems[index].hasil_verifikasi = 'kurang';
            }
        }

        form.setData('items', nextItems);
    };

    // Handler submit form verifikasi
    const handleSubmit = (e) => {
        e.preventDefault();
        setFormPeringatan(null);

        if (!form.data.id_pengajuan) {
            setFormPeringatan('Silakan pilih pengajuan pengadaan yang akan diverifikasi.');
            return;
        }

        if (!form.data.id_vendor) {
            setFormPeringatan('Vendor pemasok wajib dipilih.');
            return;
        }

        if (!form.data.nomor_nota.trim()) {
            setFormPeringatan('Nomor nota / surat jalan vendor wajib diisi.');
            return;
        }

        if (form.data.items.length === 0) {
            setFormPeringatan('Daftar item pengadaan tidak ditemukan untuk pengajuan yang dipilih.');
            return;
        }

        // Cek validasi catatan kekurangan
        for (let i = 0; i < form.data.items.length; i++) {
            const itm = form.data.items[i];
            const isKurang = itm.hasil_verifikasi === 'kurang';
            const isTidakSesuai = itm.hasil_verifikasi === 'tidak_sesuai';
            const jmlDiterima = parseInt(itm.jumlah_diterima, 10) || 0;
            const kurangJumlah = jmlDiterima < itm.jumlah_diminta;

            if ((isKurang || isTidakSesuai || kurangJumlah) && !itm.catatan_kekurangan.trim()) {
                setFormPeringatan(
                    `Catatan kekurangan wajib diisi untuk barang "${itm.nama_barang}" karena berstatus ${itm.hasil_verifikasi} atau jumlah diterima (${jmlDiterima}) kurang dari usulan (${itm.jumlah_diminta}).`
                );
                return;
            }
        }

        form.post(route('penerimaan.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                form.setData('items', []);
                setFormPeringatan(null);
            },
            onError: (errs) => {
                const pesan = Object.values(errs);
                if (pesan.length > 0) {
                    setFormPeringatan(pesan[0]);
                }
            },
        });
    };

    const pengajuanTerpilih = daftarPengajuan.find(
        (p) => String(p.id_pengajuan) === String(form.data.id_pengajuan)
    );

    // Kolom tabel riwayat verifikasi
    const kolomRiwayat = [
        {
            kunci: 'nomor_nota',
            judul: 'Nomor Nota / Surat Jalan',
            className: 'font-semibold text-ink-900 whitespace-nowrap',
            render: (r) => (
                <div>
                    <span className="font-semibold text-ink-900">{r.nomor_nota}</span>
                    <p className="text-xs text-ink-500">{formatTanggal(r.tanggal_terima)}</p>
                </div>
            ),
        },
        {
            judul: 'Pengajuan Asal',
            render: (r) => (
                <div className="max-w-xs">
                    <p className="font-medium text-ink-900">{r.pengajuan?.nomor_pengajuan || '-'}</p>
                    <p className="line-clamp-1 text-xs text-ink-600">{r.pengajuan?.perihal || '-'}</p>
                    <p className="text-[11px] text-ink-400">
                        {r.pengajuan?.pemohon?.nama_lengkap} • {r.pengajuan?.pemohon?.unit?.nama_unit || 'FTI'}
                    </p>
                </div>
            ),
        },
        {
            judul: 'Vendor Pemasok',
            render: (r) => (
                <div>
                    <p className="font-medium text-ink-900">{r.vendor?.nama_vendor || '-'}</p>
                    {r.vendor?.kontak && <p className="text-xs text-ink-500">{r.vendor?.kontak}</p>}
                </div>
            ),
        },
        {
            judul: 'Hasil Verifikasi Item',
            render: (r) => {
                const items = r.item_penerimaan || [];
                if (items.length === 0) return <span className="text-xs text-ink-400">-</span>;

                return (
                    <div className="flex flex-wrap gap-1">
                        {items.map((item, idx) => {
                            let nada = 'sukses';
                            let label = 'Sesuai';
                            if (item.hasil_verifikasi === 'kurang') {
                                nada = 'peringatan';
                                label = 'Kurang';
                            } else if (item.hasil_verifikasi === 'tidak_sesuai') {
                                nada = 'bahaya';
                                label = 'Tidak sesuai';
                            }
                            return (
                                <Badge key={idx} nada={nada}>
                                    {item.item_pengadaan?.nama_barang || 'Barang'}: {item.jumlah_diterima} ({label})
                                </Badge>
                            );
                        })}
                    </div>
                );
            },
        },
        {
            judul: 'Verifikator',
            className: 'whitespace-nowrap',
            render: (r) => (
                <span className="text-xs font-medium text-ink-700">
                    {r.verifikator?.nama_lengkap || 'Operator'}
                </span>
            ),
        },
        {
            judul: 'Status BAST',
            className: 'whitespace-nowrap',
            render: (r) => {
                const adaBast = r.berita_acara && r.berita_acara.length > 0;
                return (
                    <Badge nada={adaBast ? 'sukses' : 'netral'}>
                        {adaBast ? r.berita_acara[0].nomor_bast || 'Sudah BAST' : 'Belum BAST'}
                    </Badge>
                );
            },
        },
        {
            judul: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (r) => (
                <SecondaryButton
                    onClick={() => {
                        setDetailPenerimaan(r);
                        setModalDetailBuka(true);
                    }}
                    className="!py-1 !px-3 text-xs"
                >
                    Detail
                </SecondaryButton>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Verifikasi Penerimaan Aset — Operator" />

            <PageHeader
                breadcrumb={['FTI', 'Penerimaan aset']}
                judul="Verifikasi penerimaan aset"
                deskripsi="Pencatatan kedatangan fisik barang dari vendor serta verifikasi kesesuaian jumlah dan spesifikasi sebelum didaftarkan ke master aset."
            />

            <div className="space-y-6">
                {/* Notifikasi Flash Sukses */}
                {flash?.status && (
                    <Alert nada="sukses" className="border border-brand-200">
                        {flash.status}
                    </Alert>
                )}

                {/* Ringkasan Statistik KPI */}
                <StatGrid>
                    <StatCard
                        label="Menunggu penerimaan"
                        nilai={String(statistik.menunggu_penerimaan ?? 0)}
                        keterangan="Pengadaan disetujui Pimpinan"
                        nada="peringatan"
                    />
                    <StatCard
                        label="Dalam proses / kurang"
                        nilai={String(statistik.dalam_proses ?? 0)}
                        keterangan="Penerimaan bertahap / catatan kurang"
                        nada="netral"
                    />
                    <StatCard
                        label="Total berita penerimaan"
                        nilai={String(statistik.total_penerimaan ?? 0)}
                        keterangan="Surat jalan & nota tercatat"
                        nada="sukses"
                    />
                    <StatCard
                        label="Unit aset teregistrasi"
                        nilai={String(statistik.total_aset_teregistrasi ?? 0)}
                        keterangan="Unit aktif di Master Aset"
                        nada="sukses"
                    />
                </StatGrid>

                {/* Kartu Form: Pencatatan & Verifikasi Barang Datang */}
                <Card
                    judul="Pencatatan & verifikasi barang datang"
                    deskripsi="Pilih usulan pengadaan yang telah disetujui, lalu periksa fisik barang yang diantar oleh vendor pemasok."
                >
                    <IsiKartu>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {formPeringatan && (
                                <Alert nada="bahaya" className="border border-bahaya-200">
                                    {formPeringatan}
                                </Alert>
                            )}

                            {/* Pilihan Pengajuan */}
                            <Field
                                label="Pilih pengajuan pengadaan disetujui"
                                htmlFor="id_pengajuan"
                                petunjuk="Hanya menampilkan pengajuan pengadaan berstatus Disetujui Pimpinan atau Sedang Diproses."
                                error={form.errors.id_pengajuan}
                            >
                                <SelectInput
                                    id="id_pengajuan"
                                    value={form.data.id_pengajuan}
                                    onChange={handlePilihPengajuan}
                                    className="w-full"
                                >
                                    <option value="">-- Pilih pengajuan pengadaan --</option>
                                    {daftarPengajuan.map((p) => (
                                        <option key={p.id_pengajuan} value={p.id_pengajuan}>
                                            {p.nomor_pengajuan} • {p.perihal} ({p.pemohon?.nama_lengkap || '-'} • Sisa {p.total_sisa} unit)
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>

                            {/* Ringkasan Pengajuan Terpilih */}
                            {pengajuanTerpilih && (
                                <div className="rounded-lg border border-line bg-surface p-4 text-sm">
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <div>
                                            <p className="text-xs text-ink-500">Nomor & Perihal</p>
                                            <p className="font-semibold text-ink-900">{pengajuanTerpilih.nomor_pengajuan}</p>
                                            <p className="text-xs text-ink-700">{pengajuanTerpilih.perihal}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-ink-500">Pemohon / Unit Kerja</p>
                                            <p className="font-medium text-ink-900">{pengajuanTerpilih.pemohon?.nama_lengkap || '-'}</p>
                                            <p className="text-xs text-ink-600">{pengajuanTerpilih.pemohon?.unit?.nama_unit || 'FTI'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-ink-500">Status Saat Ini</p>
                                            <Badge nada={pengajuanTerpilih.status === 'disetujui_pimpinan' ? 'peringatan' : 'info'}>
                                                {pengajuanTerpilih.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabel Pemeriksaan Item Barang */}
                            {form.data.items.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-ink-900">
                                            Daftar barang & verifikasi fisik
                                        </h3>
                                        <span className="text-xs text-ink-500">
                                            {form.data.items.length} item pengadaan
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border border-line">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-surface text-left text-xs font-semibold text-ink-600">
                                                <tr>
                                                    <th className="px-4 py-3">Barang & Kategori</th>
                                                    <th className="px-4 py-3 text-center">Diajukan</th>
                                                    <th className="px-4 py-3 text-center">Sisa</th>
                                                    <th className="px-4 py-3 w-32">Jml Diterima</th>
                                                    <th className="px-4 py-3 w-40">Hasil Verifikasi</th>
                                                    <th className="px-4 py-3">Spesifikasi Fisik & Catatan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                                {form.data.items.map((item, idx) => {
                                                    const isKurang = item.hasil_verifikasi === 'kurang';
                                                    const isTidakSesuai = item.hasil_verifikasi === 'tidak_sesuai';
                                                    const butuhCatatan =
                                                        isKurang || isTidakSesuai || parseInt(item.jumlah_diterima, 10) < item.jumlah_diminta;

                                                    return (
                                                        <tr key={item.id_item_pengadaan} className="align-top hover:bg-surface/50">
                                                            <td className="px-4 py-3">
                                                                <p className="font-semibold text-ink-900">{item.nama_barang}</p>
                                                                <p className="text-xs text-ink-500">{item.kategori_nama}</p>
                                                                <p className="mt-1 text-xs text-ink-600 italic">
                                                                    Minta: {item.spesifikasi_diminta}
                                                                </p>
                                                            </td>
                                                            <td className="px-4 py-3 text-center font-medium text-ink-800">
                                                                {item.jumlah_diminta}
                                                            </td>
                                                            <td className="px-4 py-3 text-center font-medium text-brand-700">
                                                                {item.sisa_jumlah}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <TextInput
                                                                    type="number"
                                                                    min="0"
                                                                    value={item.jumlah_diterima}
                                                                    onChange={(e) => updateItem(idx, 'jumlah_diterima', e.target.value)}
                                                                    className="w-full text-center text-sm font-semibold"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <SelectInput
                                                                    value={item.hasil_verifikasi}
                                                                    onChange={(e) => updateItem(idx, 'hasil_verifikasi', e.target.value)}
                                                                    className={`w-full text-xs font-medium ${
                                                                        item.hasil_verifikasi === 'sesuai'
                                                                            ? 'text-brand-700 border-brand-300'
                                                                            : item.hasil_verifikasi === 'kurang'
                                                                            ? 'text-warn-700 border-warn-300'
                                                                            : 'text-bahaya-600 border-bahaya-300'
                                                                    }`}
                                                                >
                                                                    <option value="sesuai">Sesuai</option>
                                                                    <option value="kurang">Kurang</option>
                                                                    <option value="tidak_sesuai">Tidak sesuai</option>
                                                                </SelectInput>
                                                            </td>
                                                            <td className="px-4 py-3 space-y-2">
                                                                <TextInput
                                                                    type="text"
                                                                    placeholder="Spesifikasi fisik barang..."
                                                                    value={item.spesifikasi_diterima}
                                                                    onChange={(e) => updateItem(idx, 'spesifikasi_diterima', e.target.value)}
                                                                    className="w-full text-xs"
                                                                />
                                                                <div className="relative">
                                                                    <TextInput
                                                                        type="text"
                                                                        placeholder={
                                                                            butuhCatatan
                                                                                ? 'Catatan kekurangan/alasan wajib diisi...'
                                                                                : 'Catatan tambahan (opsional)...'
                                                                        }
                                                                        value={item.catatan_kekurangan}
                                                                        onChange={(e) => updateItem(idx, 'catatan_kekurangan', e.target.value)}
                                                                        className={`w-full text-xs ${
                                                                            butuhCatatan && !item.catatan_kekurangan.trim()
                                                                                ? 'border-bahaya-500 bg-bahaya-50/30'
                                                                                : ''
                                                                        }`}
                                                                    />
                                                                    {butuhCatatan && !item.catatan_kekurangan.trim() && (
                                                                        <span className="text-[11px] text-bahaya-600 font-medium">
                                                                            * Wajib diisi karena status {item.hasil_verifikasi}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Metadata Pengiriman & Vendor */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field
                                    label="Vendor pemasok"
                                    htmlFor="id_vendor"
                                    error={form.errors.id_vendor}
                                >
                                    <SelectInput
                                        id="id_vendor"
                                        value={form.data.id_vendor}
                                        onChange={(e) => form.setData('id_vendor', e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">-- Pilih vendor pemasok --</option>
                                        {daftarVendor.map((v) => (
                                            <option key={v.id_vendor} value={v.id_vendor}>
                                                {v.nama_vendor}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </Field>

                                <Field
                                    label="Nomor nota / surat jalan"
                                    htmlFor="nomor_nota"
                                    error={form.errors.nomor_nota}
                                >
                                    <TextInput
                                        id="nomor_nota"
                                        type="text"
                                        placeholder="Contoh: SJ-2026-0891"
                                        value={form.data.nomor_nota}
                                        onChange={(e) => form.setData('nomor_nota', e.target.value)}
                                        className="w-full"
                                    />
                                </Field>

                                <Field
                                    label="Tanggal terima"
                                    htmlFor="tanggal_terima"
                                    error={form.errors.tanggal_terima}
                                >
                                    <TextInput
                                        id="tanggal_terima"
                                        type="date"
                                        value={form.data.tanggal_terima}
                                        onChange={(e) => form.setData('tanggal_terima', e.target.value)}
                                        className="w-full"
                                    />
                                </Field>
                            </div>

                            {/* Catatan Umum */}
                            <Field
                                label="Catatan umum penerimaan (opsional)"
                                htmlFor="catatan"
                                error={form.errors.catatan}
                            >
                                <textarea
                                    id="catatan"
                                    rows={2}
                                    placeholder="Keterangan tambahan proses serah terima atau kondisi pengemasan..."
                                    value={form.data.catatan}
                                    onChange={(e) => form.setData('catatan', e.target.value)}
                                    className="w-full rounded-lg border-line text-sm text-ink-900 focus:border-brand-600 focus:ring-brand-600"
                                />
                            </Field>

                            {/* Opsi Registrasi Master Aset & Penempatan Awal */}
                            <div className="rounded-lg border border-line bg-surface/60 p-4 space-y-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.registrasi_aset}
                                        onChange={(e) => form.setData('registrasi_aset', e.target.checked)}
                                        className="rounded border-line text-brand-600 focus:ring-brand-600"
                                    />
                                    <span className="text-sm font-semibold text-ink-900">
                                        Daftarkan unit yang sesuai secara otomatis ke Master Aset (Kode: FTI-YYYY-XXXX)
                                    </span>
                                </label>

                                {form.data.registrasi_aset && (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-line/70">
                                        <Field
                                            label="Ruangan penempatan awal (opsional)"
                                            htmlFor="id_ruangan"
                                            petunjuk="Pilih ruangan jika aset langsung ditempatkan."
                                            error={form.errors.id_ruangan}
                                        >
                                            <SelectInput
                                                id="id_ruangan"
                                                value={form.data.id_ruangan}
                                                onChange={(e) => form.setData('id_ruangan', e.target.value)}
                                                className="w-full"
                                            >
                                                <option value="">-- Tanpa penempatan awal (Gudang/Penyimpanan) --</option>
                                                {daftarRuangan.map((r) => (
                                                    <option key={r.id_ruangan} value={r.id_ruangan}>
                                                        {r.nomor_ruangan ? `${r.nomor_ruangan} - ` : ''}{r.nama_ruangan}
                                                    </option>
                                                ))}
                                            </SelectInput>
                                        </Field>

                                        <Field
                                            label="Penanggung jawab awal (opsional)"
                                            htmlFor="id_pengguna_pj"
                                            petunjuk="Pegawai / dosen yang bertanggung jawab atas aset baru."
                                            error={form.errors.id_pengguna_pj}
                                        >
                                            <SelectInput
                                                id="id_pengguna_pj"
                                                value={form.data.id_pengguna_pj}
                                                onChange={(e) => form.setData('id_pengguna_pj', e.target.value)}
                                                className="w-full"
                                            >
                                                <option value="">-- Pilih penanggung jawab --</option>
                                                {daftarPengguna.map((u) => (
                                                    <option key={u.id_pengguna} value={u.id_pengguna}>
                                                        {u.nama_lengkap} {u.nip ? `(${u.nip})` : ''}
                                                    </option>
                                                ))}
                                            </SelectInput>
                                        </Field>
                                    </div>
                                )}
                            </div>

                            {/* Tombol Simpan */}
                            <div className="flex justify-end pt-2">
                                <PrimaryButton disabled={form.processing}>
                                    {form.processing ? 'Menyimpan...' : 'Simpan hasil verifikasi'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </IsiKartu>
                </Card>

                {/* Kartu Tabel: Riwayat Verifikasi Penerimaan */}
                <Card
                    judul="Riwayat verifikasi penerimaan"
                    deskripsi="Daftar penerimaan fisik barang dari vendor dan status pemeriksaan oleh Operator Aset."
                >
                    <IsiKartu className="space-y-4">
                        {/* Filter Toolbar */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="w-full sm:max-w-xs">
                                <SearchInput
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Cari nota, pengajuan, vendor..."
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-ink-600 whitespace-nowrap">Filter hasil:</span>
                                <SelectInput
                                    value={filterHasil}
                                    onChange={(e) => setFilterHasil(e.target.value)}
                                    className="!py-1.5 text-xs"
                                >
                                    <option value="">Semua hasil</option>
                                    <option value="sesuai">Sesuai</option>
                                    <option value="kurang">Kurang</option>
                                    <option value="tidak_sesuai">Tidak sesuai</option>
                                </SelectInput>
                            </div>
                        </div>

                        {/* Tabel Data Riwayat */}
                        <DataTable
                            kolom={kolomRiwayat}
                            baris={riwayatPenerimaan?.data || []}
                            kunciBaris="id_penerimaan"
                            kosong={
                                <EmptyState
                                    judul="Data tidak ditemukan"
                                    deskripsi="Belum ada riwayat verifikasi penerimaan atau tidak ada data yang cocok dengan kriteria pencarian."
                                />
                            }
                        />

                        {/* Pagination */}
                        {riwayatPenerimaan && (
                            <Pagination
                                links={riwayatPenerimaan.links}
                                from={riwayatPenerimaan.from}
                                to={riwayatPenerimaan.to}
                                total={riwayatPenerimaan.total}
                            />
                        )}
                    </IsiKartu>
                </Card>
            </div>

            {/* Modal Detail Verifikasi Penerimaan */}
            <Modal
                show={modalDetailBuka}
                onClose={() => setModalDetailBuka(false)}
                maxWidth="2xl"
            >
                <div className="p-6 space-y-6">
                    <header className="border-b border-line pb-4">
                        <h3 className="text-lg font-bold text-ink-900">
                            Rincian verifikasi penerimaan aset
                        </h3>
                        <p className="mt-1 text-xs text-ink-600">
                            Nomor nota: <span className="font-semibold">{detailPenerimaan?.nomor_nota}</span> • Tanggal: {formatTanggal(detailPenerimaan?.tanggal_terima)}
                        </p>
                    </header>

                    {detailPenerimaan && (
                        <div className="space-y-6">
                            {/* Info Ringkas */}
                            <InfoList
                                item={[
                                    {
                                        label: 'Pengajuan asal',
                                        nilai: `${detailPenerimaan.pengajuan?.nomor_pengajuan || '-'} — ${detailPenerimaan.pengajuan?.perihal || '-'}`,
                                    },
                                    {
                                        label: 'Pemohon / Unit',
                                        nilai: `${detailPenerimaan.pengajuan?.pemohon?.nama_lengkap || '-'} (${detailPenerimaan.pengajuan?.pemohon?.unit?.nama_unit || 'FTI'})`,
                                    },
                                    {
                                        label: 'Vendor pemasok',
                                        nilai: `${detailPenerimaan.vendor?.nama_vendor || '-'} ${detailPenerimaan.vendor?.kontak ? `(${detailPenerimaan.vendor.kontak})` : ''}`,
                                    },
                                    {
                                        label: 'Verifikator',
                                        nilai: detailPenerimaan.verifikator?.nama_lengkap || 'Operator',
                                    },
                                    {
                                        label: 'Catatan umum',
                                        nilai: detailPenerimaan.catatan || 'Tidak ada catatan umum.',
                                    },
                                ]}
                            />

                            {/* Daftar Item yang Diverifikasi */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                                    Item barang diterima & hasil verifikasi
                                </h4>

                                <div className="space-y-3">
                                    {(detailPenerimaan.item_penerimaan || []).map((it, idx) => {
                                        let nada = 'sukses';
                                        let labelHasil = 'Sesuai';
                                        if (it.hasil_verifikasi === 'kurang') {
                                            nada = 'peringatan';
                                            labelHasil = 'Kurang';
                                        } else if (it.hasil_verifikasi === 'tidak_sesuai') {
                                            nada = 'bahaya';
                                            labelHasil = 'Tidak sesuai';
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                className="rounded-lg border border-line bg-surface/50 p-3 text-sm space-y-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-semibold text-ink-900">
                                                            {it.item_pengadaan?.nama_barang || 'Barang'}
                                                        </span>
                                                        <span className="ml-2 text-xs text-ink-500">
                                                            ({it.item_pengadaan?.kategori?.nama_kategori || 'Kategori'})
                                                        </span>
                                                    </div>
                                                    <Badge nada={nada}>
                                                        {labelHasil} • {it.jumlah_diterima} unit
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-ink-500">Spesifikasi diterima: </span>
                                                        <span className="text-ink-800">
                                                            {it.spesifikasi_diterima || it.item_pengadaan?.spesifikasi || '-'}
                                                        </span>
                                                    </div>
                                                    {it.catatan_kekurangan && (
                                                        <div className="text-bahaya-700 bg-bahaya-50/60 p-1.5 rounded">
                                                            <span className="font-medium">Catatan kekurangan: </span>
                                                            {it.catatan_kekurangan}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Kode Aset Teregistrasi */}
                                                {it.aset && it.aset.length > 0 && (
                                                    <div className="pt-2 border-t border-line/60">
                                                        <span className="text-xs font-medium text-ink-600">
                                                            Unit aset teregistrasi ({it.aset.length}):
                                                        </span>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {it.aset.map((a) => (
                                                                <span
                                                                    key={a.id_aset}
                                                                    className="rounded bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700"
                                                                >
                                                                    {a.kode_aset}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-line">
                        <SecondaryButton onClick={() => setModalDetailBuka(false)}>
                            Tutup
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
