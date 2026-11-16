import PrimaryButton from '@/Components/PrimaryButton';
import Alert from '@/Components/ui/Alert';
import Badge from '@/Components/ui/Badge';
import Card, { IsiKartu } from '@/Components/ui/Card';
import InfoList from '@/Components/ui/InfoList';
import PageHeader from '@/Components/ui/PageHeader';
import Timeline from '@/Components/ui/Timeline';
import TombolLink from '@/Components/ui/TombolLink';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

function IkonVisualAset({ fotoUrl, nama }) {
    if (fotoUrl) {
        return (
            <img
                src={fotoUrl}
                alt={nama}
                className="h-20 w-24 shrink-0 rounded-xl border border-line bg-surface object-cover"
            />
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

function KotakInput({ id, label, wajib = false, readOnly = false, petunjuk, error, className = '', ...props }) {
    return (
        <div className={className}>
            <div
                className={`rounded-lg border px-4 py-2.5 transition ${error
                        ? 'border-bahaya-600 bg-white'
                        : readOnly
                            ? 'border-line bg-surface/50'
                            : 'border-line bg-white focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600'
                    }`}
            >
                <label htmlFor={id} className="block text-xs text-ink-500">
                    {label}
                    {wajib && <span className="text-ink-500"> *</span>}
                </label>
                <input
                    id={id}
                    readOnly={readOnly}
                    className="mt-0.5 block w-full border-0 bg-transparent p-0 text-sm font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:ring-0"
                    {...props}
                />
                {petunjuk && <p className="mt-0.5 text-[11px] text-ink-400">{petunjuk}</p>}
            </div>
            {error && <p className="mt-1 text-xs text-bahaya-600">{error}</p>}
        </div>
    );
}

function KotakSelect({ id, label, wajib = false, error, className = '', children, ...props }) {
    return (
        <div className={className}>
            <div
                className={`rounded-lg border bg-white px-4 py-2.5 transition ${error
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

function KotakTextarea({ id, label, wajib = false, error, className = '', ...props }) {
    return (
        <div className={className}>
            <div
                className={`rounded-lg border bg-white px-4 py-2.5 transition ${error
                        ? 'border-bahaya-600'
                        : 'border-line focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600'
                    }`}
            >
                <label htmlFor={id} className="block text-xs text-ink-500">
                    {label}
                    {wajib && <span className="text-ink-500"> *</span>}
                </label>
                <textarea
                    id={id}
                    className="mt-1 block w-full border-0 bg-transparent p-0 text-sm font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:ring-0"
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-bahaya-600">{error}</p>}
        </div>
    );
}

export default function Form({
    mode,
    aset,
    kodeOtomatis,
    tanggalHariIni,
    referensiPenerimaan,
    kategori = [],
    ruangan = [],
    pengguna = [],
    opsiSumberDana = [],
}) {
    const edit = mode === 'edit';
    const [pratinjauFoto, setPratinjauFoto] = useState(null);

    const { data, setData, post, processing, errors, transform } = useForm({
        _method: edit ? 'PUT' : 'POST',
        kode_aset: aset?.kode_aset ?? kodeOtomatis ?? '',
        id_kategori: aset?.id_kategori ?? (kategori[0]?.id_kategori ?? ''),
        nama_barang: aset?.nama_barang ?? '',
        merek_tipe: aset?.merek_tipe ?? '',
        nomor_seri: aset?.nomor_seri ?? '',
        kondisi: aset?.kondisi ?? 'baik',
        status_aset: aset?.status_aset ?? 'aktif',
        tanggal_perolehan: aset?.tanggal_perolehan ?? tanggalHariIni ?? '21 Oktober 2026',
        harga_perolehan: aset?.harga_perolehan ?? '',
        sumber_dana: aset?.sumber_dana ?? (opsiSumberDana[0] ?? 'RKAT FTI 2026'),
        id_ruangan: aset?.id_ruangan ?? (ruangan[0]?.id_ruangan ?? ''),
        id_pengguna_pj: aset?.id_pengguna_pj ?? (pengguna[0]?.id_pengguna ?? ''),
        nomor_dokumen_sumber: aset?.nomor_dokumen_sumber ?? referensiPenerimaan?.nomor_penerimaan ?? 'TER-2026-0021',
        alasan_perubahan: aset?.alasan_default ?? '',
        berkas_perolehan: null,
        foto: null,
    });

    const pilihFotoBaru = (berkas) => {
        if (!berkas) {
            return;
        }
        setData('foto', berkas);
        if (berkas.type?.startsWith('image/')) {
            setPratinjauFoto(URL.createObjectURL(berkas));
        }
    };

    const pilihBerkasPerolehan = (berkas) => {
        setData('berkas_perolehan', berkas);
        if (berkas && berkas.type?.startsWith('image/')) {
            setPratinjauFoto(URL.createObjectURL(berkas));
        }
    };

    const kirim = (e) => {
        e.preventDefault();

        transform((current) => {
            const payload = { ...current };
            if (!payload.berkas_perolehan) {
                delete payload.berkas_perolehan;
            }
            if (!payload.foto) {
                delete payload.foto;
            }
            return payload;
        });

        if (edit) {
            post(route('aset.update', aset.id_aset), {
                forceFormData: true,
            });
        } else {
            post(route('aset.store'), {
                forceFormData: true,
            });
        }
    };

    if (edit) {
        return (
            <AuthenticatedLayout>
                <Head title="Edit aset" />

                <PageHeader
                    breadcrumb={['FTI', 'Master aset']}
                    judul="Edit aset"
                    deskripsi={`Perbarui data ${aset.kode_aset} tanpa mengubah riwayat inventaris.`}
                />

                <div className="grid gap-6 lg:grid-cols-3">
                    <form onSubmit={kirim} className="space-y-6 lg:col-span-2">
                        <Card judul="Aset yang diperbarui">
                            <IsiKartu>
                                <div className="flex flex-wrap items-center gap-5">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <IkonVisualAset
                                            fotoUrl={pratinjauFoto || aset.foto_url}
                                            nama={aset.nama_barang}
                                        />
                                        <label
                                            htmlFor="foto_aset_edit"
                                            className="cursor-pointer text-[11px] font-semibold text-brand-600 hover:underline"
                                        >
                                            Ganti gambar
                                            <input
                                                id="foto_aset_edit"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => pilihFotoBaru(e.target.files?.[0] ?? null)}
                                                className="sr-only"
                                            />
                                        </label>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-brand-700">{aset.kode_aset}</p>
                                        <p className="mt-0.5 text-xl font-bold text-ink-900">
                                            {data.nama_barang || aset.nama_barang}
                                        </p>
                                        <p className="mt-0.5 text-sm text-ink-600">
                                            {aset.nama_kategori} • {aset.lokasi_ringkas}
                                        </p>
                                        <div className="mt-2">
                                            <Badge nada={aset.kondisi_nada}>{aset.kondisi_label}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </IsiKartu>
                        </Card>

                        <Card judul="Data inventaris">
                            <IsiKartu>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <KotakInput
                                        id="kode_aset"
                                        label="Kode aset (tidak dapat diubah)"
                                        value={data.kode_aset}
                                        readOnly
                                    />

                                    <KotakInput
                                        id="nama_barang"
                                        label="Nama aset"
                                        wajib
                                        value={data.nama_barang}
                                        onChange={(e) => setData('nama_barang', e.target.value)}
                                        error={errors.nama_barang}
                                        required
                                    />

                                    <KotakSelect
                                        id="id_kategori"
                                        label="Kategori"
                                        wajib
                                        value={data.id_kategori}
                                        onChange={(e) => setData('id_kategori', e.target.value)}
                                        error={errors.id_kategori}
                                        required
                                    >
                                        {kategori.map((k) => (
                                            <option key={k.id_kategori} value={k.id_kategori}>
                                                {k.nama_kategori}
                                            </option>
                                        ))}
                                    </KotakSelect>

                                    <KotakInput
                                        id="merek_tipe"
                                        label="Merek / tipe"
                                        value={data.merek_tipe}
                                        onChange={(e) => setData('merek_tipe', e.target.value)}
                                        error={errors.merek_tipe}
                                    />

                                    <KotakInput
                                        id="nomor_seri"
                                        label="Nomor seri"
                                        wajib
                                        value={data.nomor_seri}
                                        onChange={(e) => setData('nomor_seri', e.target.value)}
                                        error={errors.nomor_seri}
                                        required
                                    />

                                    <KotakSelect
                                        id="kondisi"
                                        label="Kondisi"
                                        wajib
                                        value={data.kondisi}
                                        onChange={(e) => setData('kondisi', e.target.value)}
                                        error={errors.kondisi}
                                        required
                                    >
                                        <option value="baik">Baik</option>
                                        <option value="kurang_baik">Rusak ringan</option>
                                        <option value="rusak_berat">Rusak berat</option>
                                    </KotakSelect>

                                    <KotakInput
                                        id="tanggal_perolehan"
                                        label="Tanggal perolehan"
                                        value={data.tanggal_perolehan}
                                        onChange={(e) => setData('tanggal_perolehan', e.target.value)}
                                        error={errors.tanggal_perolehan}
                                    />

                                    <KotakInput
                                        id="harga_perolehan"
                                        label="Nilai perolehan"
                                        value={data.harga_perolehan}
                                        onChange={(e) => setData('harga_perolehan', e.target.value)}
                                        error={errors.harga_perolehan}
                                    />

                                    <KotakTextarea
                                        id="alasan_perubahan"
                                        label="Alasan perubahan"
                                        wajib
                                        rows={3}
                                        value={data.alasan_perubahan}
                                        onChange={(e) => setData('alasan_perubahan', e.target.value)}
                                        placeholder="Jelaskan alasan pembaruan data atau kondisi aset (mis. mengacu nomor pengajuan perbaikan)..."
                                        error={errors.alasan_perubahan}
                                        className="sm:col-span-2"
                                        required
                                    />
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <TombolLink href={route('aset.show', aset.id_aset)} varian="sekunder">
                                        Batal
                                    </TombolLink>
                                    <PrimaryButton disabled={processing}>✓ Simpan perubahan</PrimaryButton>
                                </div>
                            </IsiKartu>
                        </Card>
                    </form>

                    <div className="space-y-6">
                        <Alert nada="peringatan">
                            Perubahan lokasi atau penanggung jawab dilakukan melalui pemrosesan mutasi, bukan melalui edit data aset.
                        </Alert>

                        <Card judul="Riwayat perubahan">
                            <IsiKartu>
                                <Timeline item={aset.riwayat_perubahan ?? []} />
                            </IsiKartu>
                        </Card>

                        <Card judul="Dokumen sumber">
                            <IsiKartu className="space-y-2.5">
                                {(aset.dokumen_sumber ?? []).slice(0, 2).map((d) => (
                                    <div
                                        key={d.id_dokumen}
                                        className="rounded-lg bg-surface px-4 py-3 text-xs font-semibold text-brand-700"
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
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title="Tambah aset" />

            <PageHeader
                breadcrumb={['FTI', 'Master aset']}
                judul="Tambah aset"
                deskripsi="Catat inventaris baru berdasarkan dokumen perolehan yang sah."
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <form onSubmit={kirim} className="space-y-6 lg:col-span-2">
                    <Card judul="Identitas aset" deskripsi="Tanda * menunjukkan isian wajib">
                        <IsiKartu>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <KotakInput
                                    id="kode_aset"
                                    label="Kode aset"
                                    value={data.kode_aset}
                                    onChange={(e) => setData('kode_aset', e.target.value)}
                                    petunjuk="Dibuat otomatis setelah disimpan"
                                    error={errors.kode_aset}
                                />

                                <KotakInput
                                    id="nama_barang"
                                    label="Nama aset"
                                    wajib
                                    value={data.nama_barang}
                                    onChange={(e) => setData('nama_barang', e.target.value)}
                                    placeholder="Nama Aset"
                                    error={errors.nama_barang}
                                    required
                                />

                                <KotakSelect
                                    id="id_kategori"
                                    label="Kategori"
                                    wajib
                                    value={data.id_kategori}
                                    onChange={(e) => setData('id_kategori', e.target.value)}
                                    error={errors.id_kategori}
                                    required
                                >
                                    {kategori.map((k) => (
                                        <option key={k.id_kategori} value={k.id_kategori}>
                                            {k.nama_kategori}
                                        </option>
                                    ))}
                                </KotakSelect>

                                <KotakInput
                                    id="merek_tipe"
                                    label="Merek / tipe"
                                    wajib
                                    value={data.merek_tipe}
                                    onChange={(e) => setData('merek_tipe', e.target.value)}
                                    placeholder="Merek / Tipe Aset"
                                    error={errors.merek_tipe}
                                    required
                                />

                                <KotakInput
                                    id="nomor_seri"
                                    label="Nomor seri"
                                    wajib
                                    value={data.nomor_seri}
                                    onChange={(e) => setData('nomor_seri', e.target.value)}
                                    placeholder="Contoh EPL000X"
                                    error={errors.nomor_seri}
                                    required
                                />

                                <KotakSelect
                                    id="kondisi"
                                    label="Kondisi awal"
                                    wajib
                                    value={data.kondisi}
                                    onChange={(e) => setData('kondisi', e.target.value)}
                                    error={errors.kondisi}
                                    required
                                >
                                    <option value="baik">Baik</option>
                                    <option value="kurang_baik">Rusak ringan</option>
                                    <option value="rusak_berat">Rusak berat</option>
                                </KotakSelect>
                            </div>
                        </IsiKartu>
                    </Card>

                    <Card judul="Perolehan dan penempatan">
                        <IsiKartu>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <KotakInput
                                    id="tanggal_perolehan"
                                    label="Tanggal perolehan"
                                    wajib
                                    value={data.tanggal_perolehan}
                                    onChange={(e) => setData('tanggal_perolehan', e.target.value)}
                                    placeholder="21 Oktober 2026"
                                    error={errors.tanggal_perolehan}
                                    required
                                />

                                <KotakInput
                                    id="harga_perolehan"
                                    label="Nilai perolehan"
                                    wajib
                                    value={data.harga_perolehan}
                                    onChange={(e) => setData('harga_perolehan', e.target.value)}
                                    placeholder="Contoh : RpX.XXX.XXX"
                                    error={errors.harga_perolehan}
                                    required
                                />

                                <KotakSelect
                                    id="sumber_dana"
                                    label="Sumber dana"
                                    wajib
                                    value={data.sumber_dana}
                                    onChange={(e) => setData('sumber_dana', e.target.value)}
                                    error={errors.sumber_dana}
                                >
                                    {opsiSumberDana.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </KotakSelect>

                                <KotakSelect
                                    id="id_ruangan"
                                    label="Lokasi"
                                    wajib
                                    value={data.id_ruangan}
                                    onChange={(e) => setData('id_ruangan', e.target.value)}
                                    error={errors.id_ruangan}
                                    required
                                >
                                    {ruangan.map((r) => (
                                        <option key={r.id_ruangan} value={r.id_ruangan}>
                                            {r.nama_ruangan ?? r.nomor_ruangan}
                                        </option>
                                    ))}
                                </KotakSelect>

                                <KotakSelect
                                    id="id_pengguna_pj"
                                    label="Penanggung jawab"
                                    wajib
                                    value={data.id_pengguna_pj}
                                    onChange={(e) => setData('id_pengguna_pj', e.target.value)}
                                    error={errors.id_pengguna_pj}
                                    required
                                >
                                    {pengguna.map((u) => (
                                        <option key={u.id_pengguna} value={u.id_pengguna}>
                                            {u.nama_lengkap}
                                        </option>
                                    ))}
                                </KotakSelect>

                                <KotakInput
                                    id="nomor_dokumen_sumber"
                                    label="Nomor dokumen sumber"
                                    wajib
                                    value={data.nomor_dokumen_sumber}
                                    onChange={(e) => setData('nomor_dokumen_sumber', e.target.value)}
                                    placeholder="TER-2026-0021"
                                    error={errors.nomor_dokumen_sumber}
                                    required
                                />
                            </div>

                            <label
                                htmlFor="berkas_perolehan"
                                className="mt-5 block cursor-pointer rounded-xl border border-dashed border-line bg-surface/60 px-6 py-5 text-center transition hover:border-brand-500"
                            >
                                {pratinjauFoto && (
                                    <img
                                        src={pratinjauFoto}
                                        alt="Pratinjau foto aset"
                                        className="mx-auto mb-3 h-24 w-32 rounded-lg border border-line object-cover"
                                    />
                                )}
                                <p className="text-sm font-semibold text-ink-900">↑ Dokumen perolehan / foto aset</p>
                                <p className="mt-1 text-xs font-medium text-brand-600">
                                    {data.berkas_perolehan
                                        ? `${data.berkas_perolehan.name} • terlampir`
                                        : 'Faktur_printer_2026.pdf • terlampir (klik untuk mengganti berkas)'}
                                </p>
                                <p className="mt-0.5 text-xs text-ink-400">PDF, JPG, PNG • Maksimal 10 MB per berkas</p>
                                <input
                                    id="berkas_perolehan"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={(e) => pilihBerkasPerolehan(e.target.files?.[0] ?? null)}
                                    className="sr-only"
                                />
                            </label>
                            {errors.berkas_perolehan && (
                                <p className="mt-1.5 text-xs text-bahaya-600">{errors.berkas_perolehan}</p>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <TombolLink href={route('aset.index')} varian="sekunder">
                                    Batal
                                </TombolLink>
                                <PrimaryButton disabled={processing}>✓ Simpan aset</PrimaryButton>
                            </div>
                        </IsiKartu>
                    </Card>
                </form>

                <div className="space-y-6">
                    <Card judul="Sebelum menyimpan">
                        <IsiKartu>
                            <Alert nada="info">
                                Pastikan nomor seri sesuai pemeriksaan fisik. Satu kode inventaris digunakan untuk satu unit aset. Aset penerimaan baru diaktifkan setelah dokumen diverifikasi.
                            </Alert>
                        </IsiKartu>
                    </Card>

                    <Card judul="Referensi penerimaan">
                        <IsiKartu>
                            <InfoList
                                item={[
                                    {
                                        label: 'Nomor penerimaan',
                                        nilai: data.nomor_dokumen_sumber || referensiPenerimaan?.nomor_penerimaan || 'TER-2026-0021',
                                    },
                                    {
                                        label: 'Pemasok',
                                        nilai: referensiPenerimaan?.pemasok || 'CV Minang Teknologi',
                                    },
                                    {
                                        label: 'Status dokumen',
                                        nilai: referensiPenerimaan?.status_dokumen || 'Menunggu verifikasi',
                                    },
                                    {
                                        label: 'Pengajuan asal',
                                        nilai: referensiPenerimaan?.pengajuan_asal || 'PGD-2026-0080',
                                    },
                                ]}
                            />
                        </IsiKartu>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
