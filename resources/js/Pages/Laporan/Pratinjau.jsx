import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Pratinjau({
    kpi = {},
    periode = 'Oktober 2026',
    daftarSesuai = [],
    rekapPerKategori = [],
    totalRekap = {},
    penandatangan = {},
}) {
    const formatRupiah = (angka) => 'Rp' + Number(angka || 0).toLocaleString('id-ID');

    return (
        <AuthenticatedLayout>
            <Head title="Pratinjau laporan aset" />

            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #lembar-pratinjau-laporan,
                    #lembar-pratinjau-laporan * {
                        visibility: visible !important;
                    }
                    #lembar-pratinjau-laporan {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>

            <div className="mx-auto max-w-5xl space-y-6 pb-12">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-xs font-medium text-ink-500">FTI / Laporan aset / Pratinjau</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
                            Pratinjau laporan aset
                        </h1>
                        <p className="mt-1 text-sm text-ink-600">
                            Pratinjau cetak dokumen resmi rekapitulasi inventaris dan penyusutan aset tetap.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('pimpinan.laporan')}
                            className="inline-flex items-center rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-700 hover:bg-surface transition"
                        >
                            ← Kembali ke laporan
                        </Link>
                        <PrimaryButton
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 px-4 py-2.5 text-sm shadow-sm"
                        >
                            Cetak / Simpan PDF
                        </PrimaryButton>
                    </div>
                </div>

                <div id="lembar-pratinjau-laporan">
                    <div className="rounded-2xl border border-line bg-white p-8 sm:p-12 md:p-14 shadow-xs">
                        {/* Kop Dokumen Resmi */}
                        <div className="flex items-start gap-4 pb-3">
                            <div className="flex-shrink-0 text-ink-900 pt-1">
                                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 18h16M4 10h16M12 3l9 5H3l9-5zM6 10v8M10 10v8M14 10v8M18 10v8" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold tracking-wide text-ink-900 uppercase">
                                    UNIVERSITAS ANDALAS
                                </p>
                                <p className="text-lg font-extrabold tracking-tight text-ink-900 uppercase">
                                    FAKULTAS TEKNOLOGI INFORMASI
                                </p>
                                <p className="text-xs text-ink-500">
                                    Kampus Limau Manis, Padang 25163 • fti.unand.ac.id
                                </p>
                            </div>
                        </div>

                        <div className="border-b-2 border-ink-900 mt-3 mb-6" />

                        <div className="text-center my-6">
                            <h2 className="text-base font-extrabold tracking-wider text-ink-900 uppercase">
                                LAPORAN INVENTARIS DAN PENYUSUTAN ASET TETAP
                            </h2>
                            <p className="text-xs text-ink-600 mt-1 font-medium">
                                Periode {periode} • Posisi {kpi.tanggalPosisi || '21 Oktober 2026'}
                            </p>
                            <div className="mt-2.5">
                                <span className="inline-block rounded-full bg-surface px-3 py-0.5 text-[10px] font-semibold tracking-wider text-ink-500 uppercase border border-line">
                                    METODE PENYUSUTAN GARIS LURUS • SIM ASET FTI
                                </span>
                            </div>
                        </div>

                        {/* Tabel Rekap Per Kategori */}
                        <div className="mt-6 overflow-x-auto rounded-lg border-2 border-line bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-line bg-surface/80 text-[11px] font-bold text-ink-800 uppercase tracking-wider">
                                        <th className="py-3 px-4 border-r border-line">KODE</th>
                                        <th className="py-3 px-4 border-r border-line">KATEGORI ASET</th>
                                        <th className="py-3 px-4 text-center border-r border-line">MASA MANFAAT</th>
                                        <th className="py-3 px-4 text-center border-r border-line">UNIT</th>
                                        <th className="py-3 px-4 text-right border-r border-line">HARGA PEROLEHAN</th>
                                        <th className="py-3 px-4 text-right border-r border-line">AKUMULASI PENYUSUTAN</th>
                                        <th className="py-3 px-4 text-right">NILAI BUKU</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line text-ink-900">
                                    {rekapPerKategori.map((k) => (
                                        <tr key={k.kode}>
                                            <td className="py-3 px-4 font-mono font-bold border-r border-line">{k.kode}</td>
                                            <td className="py-3 px-4 font-medium border-r border-line">{k.nama}</td>
                                            <td className="py-3 px-4 text-center border-r border-line">{k.masa_manfaat} tahun</td>
                                            <td className="py-3 px-4 text-center font-semibold border-r border-line">{k.jumlah_aset}</td>
                                            <td className="py-3 px-4 text-right border-r border-line">{formatRupiah(k.harga_perolehan)}</td>
                                            <td className="py-3 px-4 text-right text-rose-700 border-r border-line">{formatRupiah(k.penyusutan)}</td>
                                            <td className="py-3 px-4 text-right font-bold text-brand-700">{formatRupiah(k.nilai_buku)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-line bg-surface font-bold text-ink-900 text-xs">
                                        <td colSpan="4" className="py-3.5 px-4 uppercase tracking-wider border-r border-line">
                                            TOTAL KESELURUHAN
                                        </td>
                                        <td className="py-3.5 px-4 text-right border-r border-line">
                                            {formatRupiah(totalRekap.harga_perolehan)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-rose-700 border-r border-line">
                                            {formatRupiah(totalRekap.penyusutan)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-brand-800">
                                            {formatRupiah(totalRekap.nilai_buku)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Blok Tanda Tangan Sejajar */}
                        <div className="mt-14 flex flex-row items-start justify-between gap-8 text-xs text-ink-900">
                            <div className="w-1/2 max-w-[260px]">
                                <p className="font-semibold text-ink-700">Mengetahui, Pimpinan FTI,</p>
                                <div className="my-3 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-ink-300 bg-surface/30 text-[10px] text-ink-400 italic">
                                    ( Tanda tangan & stempel )
                                </div>
                                <p className="font-bold text-ink-900 border-b border-ink-800 pb-0.5 inline-block min-w-[200px]">
                                    {penandatangan?.pimpinan || 'Dr. Eng. Budi Raharjo, M.T.'}
                                </p>
                            </div>

                            <div className="w-1/2 max-w-[260px]">
                                <p className="font-semibold text-ink-700">Padang, {kpi.tanggalPosisi || '21 Oktober 2026'}</p>
                                <p className="font-semibold text-ink-700">Operator Aset Fakultas,</p>
                                <div className="my-3 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-ink-300 bg-surface/30 text-[10px] text-ink-400 italic">
                                    ( Tanda tangan & cap )
                                </div>
                                <p className="font-bold text-ink-900 border-b border-ink-800 pb-0.5 inline-block min-w-[200px]">
                                    {penandatangan?.operator || 'Nadia Putri'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-12 border-t border-line/60 pt-3 text-[10px] tracking-wider text-ink-400 uppercase">
                            CONTOH DOKUMEN • Bukan dokumen resmi • Halaman 1 / 1
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
