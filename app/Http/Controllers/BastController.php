<?php

namespace App\Http\Controllers;

use App\Http\Requests\ArsipkanBastRequest;
use App\Http\Requests\StoreBastRequest;
use App\Models\BeritaAcara;
use App\Models\BeritaAcaraItem;
use App\Models\Dokumen;
use App\Models\PenerimaanAset;
use App\Models\Pengajuan;
use App\Services\ActivityLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BastController extends Controller
{
    /**
     * Tampilkan meja kerja Pembuatan dan Arsip BAST (Figma 12 & KF-16).
     */
    public function index(Request $request): Response
    {
        Carbon::setLocale('id');

        // 1. Query Daftar BAST
        $queryBast = BeritaAcara::query()
            ->with([
                'items.aset',
                'penerimaan.vendor',
                'penerimaan.pengajuan.pemohon.unit',
                'pengajuan.pemohon.unit',
                'dokumen.pengunggah',
                'pembuat',
            ]);

        // Filter pencarian
        if ($request->filled('q')) {
            $q = trim($request->q);
            $queryBast->where(function ($sub) use ($q) {
                $sub->where('nomor_bast', 'like', "%{$q}%")
                    ->orWhere('pihak_pertama', 'like', "%{$q}%")
                    ->orWhere('pihak_kedua', 'like', "%{$q}%")
                    ->orWhere('keterangan', 'like', "%{$q}%")
                    ->orWhereHas('penerimaan', fn ($qp) => $qp->where('nomor_nota', 'like', "%{$q}%"))
                    ->orWhereHas('pengajuan', fn ($qj) => $qj->where('nomor_pengajuan', 'like', "%{$q}%"))
                    ->orWhereHas('items', fn ($qi) => $qi->where('nama_barang', 'like', "%{$q}%")->orWhere('kode_aset', 'like', "%{$q}%"));
            });
        }

        // Filter jenis BAST
        if ($request->filled('jenis') && $request->jenis !== 'semua') {
            $queryBast->where('jenis_bast', $request->jenis);
        }

        // Filter tahun
        if ($request->filled('tahun') && $request->tahun !== 'semua') {
            $queryBast->whereYear('tanggal_bast', (int) $request->tahun);
        }

        // Filter status
        if ($request->filled('status') && $request->status !== 'semua') {
            $queryBast->where('status', $request->status);
        }

        $daftarBast = $queryBast->orderByDesc('id_bast')
            ->paginate(10)
            ->withQueryString();

        // 2. Daftar Transaksi Siap Dibuatkan BAST (Belum ada BAST)
        // a. Penerimaan yang belum memiliki BAST
        $penerimaanSiap = PenerimaanAset::query()
            ->whereDoesntHave('beritaAcara')
            ->with([
                'pengajuan.pemohon.unit',
                'vendor',
                'itemPenerimaan.itemPengadaan.kategori',
            ])
            ->orderByDesc('id_penerimaan')
            ->get()
            ->map(function (PenerimaanAset $pen) {
                return [
                    'jenis' => 'penerimaan',
                    'id_referensi' => $pen->id_penerimaan,
                    'nomor_referensi' => $pen->nomor_nota,
                    'label' => "Penerimaan: {$pen->nomor_nota} — Vendor: " . ($pen->vendor?->nama_vendor ?? '-'),
                    'id_pengajuan' => $pen->id_pengajuan,
                    'tanggal' => $pen->tanggal_terima?->toDateString(),
                    'pihak_pertama_default' => $pen->vendor ? "{$pen->vendor->nama_vendor} (Pemasok / Vendor)" : 'Pejabat Pengadaan / Rekanan Vendor',
                    'pihak_kedua_default' => 'Tim Pengelola BMN & Aset Fakultas Teknologi Informasi Universitas Andalas',
                    'keterangan_default' => "Penerimaan pengadaan aset melalui Nota Penerimaan {$pen->nomor_nota}",
                    'items' => $pen->itemPenerimaan->map(function ($it) {
                        return [
                            'id_aset' => null,
                            'kode_aset' => '',
                            'nama_barang' => $it->itemPengadaan?->nama_barang ?? 'Barang Penerimaan',
                            'spesifikasi' => $it->itemPengadaan?->spesifikasi ?? '-',
                            'nomor_seri' => '',
                            'jumlah' => $it->jumlah_diterima ?? 1,
                            'satuan' => 'unit',
                            'kondisi' => 'baik',
                            'keterangan' => $it->catatan_kekurangan,
                        ];
                    }),
                ];
            });

        // b. Mutasi selesai yang belum memiliki BAST
        $mutasiSiap = Pengajuan::query()
            ->where('jenis_pengajuan', 'mutasi')
            ->where('status', 'selesai')
            ->whereDoesntHave('beritaAcara')
            ->with([
                'pemohon.unit',
                'itemMutasi.aset.kategori',
                'itemMutasi.ruanganAsal.gedung',
                'itemMutasi.ruanganTujuan.gedung',
                'itemMutasi.penanggungJawabTujuan',
            ])
            ->orderByDesc('id_pengajuan')
            ->get()
            ->map(function (Pengajuan $p) {
                $itemPertama = $p->itemMutasi->first();
                $ruanganAsal = $itemPertama?->ruanganAsal?->nama_ruangan ?? $p->pemohon?->unit?->nama_unit ?? 'Unit Asal';
                $ruanganTujuan = $itemPertama?->ruanganTujuan?->nama_ruangan ?? 'Unit Tujuan';
                $pjBaru = $itemPertama?->penanggungJawabTujuan?->nama_lengkap ?? 'Penanggung Jawab Baru';

                return [
                    'jenis' => 'mutasi',
                    'id_referensi' => $p->id_pengajuan,
                    'nomor_referensi' => $p->nomor_pengajuan,
                    'label' => "Mutasi: {$p->nomor_pengajuan} ({$ruanganAsal} → {$ruanganTujuan})",
                    'id_pengajuan' => $p->id_pengajuan,
                    'tanggal' => now()->toDateString(),
                    'pihak_pertama_default' => "{$p->pemohon?->nama_lengkap} ({$ruanganAsal})",
                    'pihak_kedua_default' => "{$pjBaru} ({$ruanganTujuan})",
                    'keterangan_default' => "Pemindahan fisik aset berdasarkan pengajuan mutasi {$p->nomor_pengajuan}",
                    'items' => $p->itemMutasi->map(function ($it) {
                        return [
                            'id_aset' => $it->id_aset,
                            'kode_aset' => $it->aset?->kode_aset ?? '',
                            'nama_barang' => $it->aset?->nama_barang ?? 'Aset Mutasi',
                            'spesifikasi' => $it->aset?->spesifikasi ?? '-',
                            'nomor_seri' => '',
                            'jumlah' => 1,
                            'satuan' => 'unit',
                            'kondisi' => $it->aset?->kondisi ?? 'baik',
                            'keterangan' => "Mutasi ke {$it->ruanganTujuan?->nama_ruangan}",
                        ];
                    }),
                ];
            });

        // c. Penghapusan selesai (Hibah / Penjualan) yang belum memiliki BAST
        $penghapusanSiap = Pengajuan::query()
            ->where('jenis_pengajuan', 'penghapusan')
            ->where('status', 'selesai')
            ->whereDoesntHave('beritaAcara')
            ->with([
                'pemohon.unit',
                'itemPenghapusan.aset.kategori',
            ])
            ->orderByDesc('id_pengajuan')
            ->get()
            ->map(function (Pengajuan $p) {
                $itemPertama = $p->itemPenghapusan->first();
                $jalur = $itemPertama?->jalur_penghapusan ?? 'penghapusan';
                $isHibah = in_array($jalur, ['hibah_luar', 'hibah', 'sharing_internal'], true);
                $jenisBast = $isHibah ? 'hibah' : 'penjualan';
                $penerima = $itemPertama?->pihak_penerima ?? ($isHibah ? 'Instansi / Lembaga Penerima Hibah' : 'Pemenang Lelang / Pembeli');

                return [
                    'jenis' => $jenisBast,
                    'id_referensi' => $p->id_pengajuan,
                    'nomor_referensi' => $p->nomor_pengajuan,
                    'label' => ($isHibah ? 'Hibah: ' : 'Penjualan/Lelang: ') . "{$p->nomor_pengajuan} ({$penerima})",
                    'id_pengajuan' => $p->id_pengajuan,
                    'tanggal' => now()->toDateString(),
                    'pihak_pertama_default' => 'Fakultas Teknologi Informasi Universitas Andalas',
                    'pihak_kedua_default' => $penerima,
                    'keterangan_default' => "Penghapusan aset via {$jalur} berdasarkan usulan {$p->nomor_pengajuan}",
                    'items' => $p->itemPenghapusan->map(function ($it) {
                        return [
                            'id_aset' => $it->id_aset,
                            'kode_aset' => $it->aset?->kode_aset ?? '',
                            'nama_barang' => $it->aset?->nama_barang ?? 'Aset Dihapuskan',
                            'spesifikasi' => $it->aset?->spesifikasi ?? '-',
                            'nomor_seri' => '',
                            'jumlah' => 1,
                            'satuan' => 'unit',
                            'kondisi' => $it->aset?->kondisi ?? 'rusak_berat',
                            'keterangan' => "Jalur: {$it->jalur_penghapusan}",
                        ];
                    }),
                ];
            });

        $transaksiSiapBast = [
            'penerimaan' => $penerimaanSiap,
            'mutasi' => $mutasiSiap,
            'hibah' => $penghapusanSiap->where('jenis', 'hibah')->values(),
            'penjualan' => $penghapusanSiap->where('jenis', 'penjualan')->values(),
        ];

        // 3. Statistik Dashboard BAST
        $statistik = [
            'total_bast' => BeritaAcara::count(),
            'draf_menunggu' => BeritaAcara::where('status', 'draft')->count(),
            'arsip_selesai' => BeritaAcara::where('status', 'selesai')->count(),
            'penerimaan' => BeritaAcara::where('jenis_bast', 'penerimaan')->count(),
            'mutasi' => BeritaAcara::where('jenis_bast', 'mutasi')->count(),
            'hibah' => BeritaAcara::where('jenis_bast', 'hibah')->count(),
            'penjualan' => BeritaAcara::where('jenis_bast', 'penjualan')->count(),
        ];

        return Inertia::render('Bast/Index', [
            'daftarBast' => $daftarBast,
            'transaksiSiapBast' => $transaksiSiapBast,
            'statistik' => $statistik,
            'filters' => [
                'q' => $request->input('q', ''),
                'jenis' => $request->input('jenis', 'semua'),
                'tahun' => $request->input('tahun', 'semua'),
                'status' => $request->input('status', 'semua'),
            ],
        ]);
    }

    /**
     * Susun dan simpan Draf BAST baru (Langkah 1).
     */
    public function store(StoreBastRequest $request): RedirectResponse
    {
        $user = $request->user();

        $bast = DB::transaction(function () use ($request, $user) {
            $tahun = date('Y');
            $nomorBast = $this->generateNomorBast($tahun);

            $idPengajuan = $request->id_pengajuan;
            $idPenerimaan = $request->id_penerimaan;

            if ($request->jenis_bast === 'penerimaan' && $idPenerimaan && empty($idPengajuan)) {
                $penerimaan = PenerimaanAset::find($idPenerimaan);
                $idPengajuan = $penerimaan?->id_pengajuan;
            }

            // Fallback id_pengajuan jika tidak ada pengajuan terikat
            if (empty($idPengajuan)) {
                $idPengajuan = Pengajuan::query()->value('id_pengajuan');
            }

            $bast = new BeritaAcara();
            $bast->nomor_bast = $nomorBast;
            $bast->jenis_bast = $request->jenis_bast;
            $bast->tanggal_bast = Carbon::parse($request->tanggal_bast);
            $bast->pihak_pertama = $request->pihak_pertama;
            $bast->pihak_kedua = $request->pihak_kedua;
            $bast->id_pengajuan = $idPengajuan;
            $bast->id_penerimaan = $idPenerimaan;
            $bast->id_dokumen = null;

            // Atribut tambahan via forceFill
            $bast->forceFill([
                'status' => 'draft',
                'keterangan' => $request->keterangan,
                'id_pembuat' => $user->id_pengguna,
            ]);

            $bast->save();

            // Simpan rincian unit aset
            foreach ($request->items as $item) {
                BeritaAcaraItem::create([
                    'id_bast' => $bast->id_bast,
                    'id_aset' => $item['id_aset'] ?? null,
                    'kode_aset' => $item['kode_aset'] ?? null,
                    'nama_barang' => $item['nama_barang'],
                    'spesifikasi' => $item['spesifikasi'] ?? null,
                    'nomor_seri' => $item['nomor_seri'] ?? null,
                    'jumlah' => $item['jumlah'] ?? 1,
                    'satuan' => $item['satuan'] ?? 'unit',
                    'kondisi' => $item['kondisi'] ?? 'baik',
                    'keterangan' => $item['keterangan'] ?? null,
                ]);
            }

            ActivityLogger::record(
                'buat_draft_bast',
                'berita_acara',
                $bast->id_bast,
                "Menyusun draf BAST resmi {$bast->nomor_bast} ({$bast->jenis_bast})",
                $user->id_pengguna
            );

            return $bast;
        });

        return redirect()
            ->route('bast.index')
            ->with('status', "Draf BAST {$bast->nomor_bast} berhasil disusun. Anda dapat mengunduh format PDF resmi untuk ditandatangani.");
    }

    /**
     * Unduh atau cetak dokumen PDF BAST resmi (Langkah 2).
     */
    public function cetakPdf(Request $request, BeritaAcara $beritaAcara): HttpResponse
    {
        Carbon::setLocale('id');

        $beritaAcara->load([
            'items.aset',
            'penerimaan.vendor',
            'pengajuan.pemohon.unit',
        ]);

        $tanggal = Carbon::parse($beritaAcara->tanggal_bast);

        $namaHari = $tanggal->translatedFormat('l');
        $tanggalHari = $this->terbilang((int) $tanggal->format('d'));
        $namaBulan = $tanggal->translatedFormat('F');
        $tahunTeks = $this->terbilang((int) $tanggal->format('Y'));
        $tanggalFormatLengkap = $tanggal->translatedFormat('d F Y');

        // Teks referensi dokumen
        $referensiTeks = null;
        if ($beritaAcara->penerimaan) {
            $referensiTeks = "Nota Penerimaan {$beritaAcara->penerimaan->nomor_nota}";
        } elseif ($beritaAcara->pengajuan) {
            $referensiTeks = "Pengajuan {$beritaAcara->pengajuan->nomor_pengajuan}";
        }

        $pdf = Pdf::loadView('pdf.bast', [
            'bast' => $beritaAcara,
            'namaHari' => $namaHari,
            'tanggalHari' => ucwords($tanggalHari),
            'namaBulan' => $namaBulan,
            'tahunTeks' => ucwords($tahunTeks),
            'tanggalFormatLengkap' => $tanggalFormatLengkap,
            'referensiTeks' => $referensiTeks,
        ])->setPaper('a4', 'portrait');

        $namaFile = 'BAST_' . str_replace(['/', '\\', ' '], '_', $beritaAcara->nomor_bast) . '.pdf';

        if ($request->query('mode') === 'unduh') {
            return $pdf->download($namaFile);
        }

        return $pdf->stream($namaFile);
    }

    /**
     * Unggah pindaian BAST bertanda tangan dan finalisasi arsip (Langkah 3).
     */
    public function arsipkan(ArsipkanBastRequest $request, BeritaAcara $beritaAcara): RedirectResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $user, $beritaAcara) {
            $file = $request->file('file_bast');
            $namaAsli = $file->getClientOriginalName();
            $namaSimpan = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs("dokumen/bast/{$beritaAcara->id_bast}", $namaSimpan, 'public');

            // Simpan ke tabel dokumen
            $dokumen = Dokumen::create([
                'id_pengajuan' => $beritaAcara->id_pengajuan,
                'id_aset' => $beritaAcara->items->first()?->id_aset,
                'id_pengunggah' => $user->id_pengguna,
                'jenis_dokumen' => 'bast',
                'nama_file' => $namaAsli,
                'path_file' => $path,
                'tanggal_unggah' => now(),
            ]);

            // Finalisasi berita acara
            $beritaAcara->id_dokumen = $dokumen->id_dokumen;
            $keteranganLama = $beritaAcara->keterangan;
            $catatanTambahan = $request->catatan_arsip ? " [Arsip: {$request->catatan_arsip}]" : '';

            $beritaAcara->forceFill([
                'status' => 'selesai',
                'keterangan' => trim($keteranganLama . $catatanTambahan),
            ]);

            $beritaAcara->save();

            ActivityLogger::record(
                'arsipkan_bast',
                'berita_acara',
                $beritaAcara->id_bast,
                "Mengunggah berkas scan BAST bertanda tangan {$beritaAcara->nomor_bast} dan memfinalisasi arsip",
                $user->id_pengguna
            );
        });

        return redirect()
            ->route('bast.index')
            ->with('status', "Berkas BAST {$beritaAcara->nomor_bast} bertanda tangan berhasil diarsipkan secara permanen.");
    }

    /**
     * Generator nomor BAST unik per tahun berjalan.
     */
    private function generateNomorBast(string $tahun): string
    {
        $awalan = "BAST-{$tahun}-";

        $nomorTerakhir = BeritaAcara::where('nomor_bast', 'like', "{$awalan}%")
            ->orderByDesc('nomor_bast')
            ->value('nomor_bast');

        $urutan = 1;
        if ($nomorTerakhir && preg_match('/BAST-\d{4}-(\d+)/', $nomorTerakhir, $m)) {
            $urutan = ((int) $m[1]) + 1;
        }

        return sprintf('BAST-%s-%04d', $tahun, $urutan);
    }

    /**
     * Konversi angka ke terbilang Bahasa Indonesia.
     */
    private function terbilang(int $angka): string
    {
        $angka = abs($angka);
        $bilangan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

        if ($angka < 12) {
            return $bilangan[$angka];
        } elseif ($angka < 20) {
            return $this->terbilang($angka - 10) . ' belas';
        } elseif ($angka < 100) {
            return $this->terbilang((int) ($angka / 10)) . ' puluh' . ($angka % 10 ? ' ' . $this->terbilang($angka % 10) : '');
        } elseif ($angka < 200) {
            return 'seratus' . ($angka % 100 ? ' ' . $this->terbilang($angka % 100) : '');
        } elseif ($angka < 1000) {
            return $this->terbilang((int) ($angka / 100)) . ' ratus' . ($angka % 100 ? ' ' . $this->terbilang($angka % 100) : '');
        } elseif ($angka < 2000) {
            return 'seribu' . ($angka % 1000 ? ' ' . $this->terbilang($angka % 1000) : '');
        } elseif ($angka < 1000000) {
            return $this->terbilang((int) ($angka / 1000)) . ' ribu' . ($angka % 1000 ? ' ' . $this->terbilang($angka % 1000) : '');
        }

        return (string) $angka;
    }
}
