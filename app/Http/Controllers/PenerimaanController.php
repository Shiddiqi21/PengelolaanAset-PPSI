<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePenerimaanRequest;
use App\Models\Aset;
use App\Models\ItemPenerimaan;
use App\Models\PenerimaanAset;
use App\Models\Pengajuan;
use App\Models\PenempatanAset;
use App\Models\Ruangan;
use App\Models\User;
use App\Models\Vendor;
use App\Services\ActivityLogger;
use App\Services\PengajuanStatusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PenerimaanController extends Controller
{
    public function __construct(
        protected ?PengajuanStatusService $statusService = null
    ) {
        $this->statusService = $statusService ?? app(PengajuanStatusService::class);
    }

    /**
     * Tampilkan halaman utama verifikasi penerimaan aset dan riwayat verifikasi.
     */
    public function index(Request $request): Response
    {
        $pengajuanList = Pengajuan::query()
            ->where('jenis_pengajuan', 'pengadaan')
            ->whereIn('status', ['disetujui_pimpinan', 'diproses'])
            ->with([
                'pemohon.unit',
                'itemPengadaan.kategori',
                'penerimaanAset.itemPenerimaan',
            ])
            ->orderByDesc('id_pengajuan')
            ->get()
            ->map(function ($pengajuan) {
                $pengajuan->itemPengadaan->each(function ($item) {
                    $totalSesuai = ItemPenerimaan::query()
                        ->where('id_item_pengadaan', $item->id_item_pengadaan)
                        ->where('hasil_verifikasi', 'sesuai')
                        ->sum('jumlah_diterima');

                    $item->jumlah_diterima_sesuai = (int) $totalSesuai;
                    $item->sisa_jumlah = max(0, $item->jumlah - (int) $totalSesuai);
                });

                $pengajuan->total_sisa = $pengajuan->itemPengadaan->sum('sisa_jumlah');
                return $pengajuan;
            })
            ->filter(fn ($p) => $p->total_sisa > 0 || $p->status === 'diproses')
            ->values();

        $query = PenerimaanAset::query()
            ->with([
                'pengajuan.pemohon.unit',
                'vendor',
                'verifikator',
                'itemPenerimaan.itemPengadaan.kategori',
                'itemPenerimaan.aset',
                'beritaAcara',
            ]);

        if ($request->filled('q')) {
            $q = trim($request->q);
            $query->where(function ($sub) use ($q) {
                $sub->where('nomor_nota', 'like', "%{$q}%")
                    ->orWhere('catatan', 'like', "%{$q}%")
                    ->orWhereHas('pengajuan', function ($p) use ($q) {
                        $p->where('nomor_pengajuan', 'like', "%{$q}%")
                            ->orWhere('keterangan', 'like', "%{$q}%");
                    })
                    ->orWhereHas('vendor', function ($v) use ($q) {
                        $v->where('nama_vendor', 'like', "%{$q}%");
                    });
            });
        }

        if ($request->filled('hasil_verifikasi')) {
            $hasilVerifikasi = $request->hasil_verifikasi;
            if (in_array($hasilVerifikasi, ['sesuai', 'kurang', 'tidak_sesuai'], true)) {
                $query->whereHas('itemPenerimaan', function ($ip) use ($hasilVerifikasi) {
                    $ip->where('hasil_verifikasi', $hasilVerifikasi);
                });
            }
        }

        $riwayatPenerimaan = $query->orderByDesc('tanggal_terima')
            ->orderByDesc('id_penerimaan')
            ->paginate(10)
            ->withQueryString();

        $daftarVendor = Vendor::query()
            ->orderBy('nama_vendor')
            ->get(['id_vendor', 'nama_vendor', 'kontak', 'alamat']);

        $daftarRuangan = Ruangan::query()
            ->with('gedung')
            ->orderBy('nama_ruangan')
            ->get(['id_ruangan', 'id_gedung', 'nomor_ruangan', 'nama_ruangan']);

        $daftarPengguna = User::query()
            ->where('is_aktif', true)
            ->orderBy('nama_lengkap')
            ->get(['id_pengguna', 'nama_lengkap', 'nip', 'email']);

        $statistik = [
            'menunggu_penerimaan' => Pengajuan::query()
                ->where('jenis_pengajuan', 'pengadaan')
                ->where('status', 'disetujui_pimpinan')
                ->count(),
            'dalam_proses' => Pengajuan::query()
                ->where('jenis_pengajuan', 'pengadaan')
                ->where('status', 'diproses')
                ->count(),
            'total_penerimaan' => PenerimaanAset::query()->count(),
            'total_aset_teregistrasi' => Aset::query()
                ->whereNotNull('id_item_penerimaan')
                ->count(),
        ];

        return Inertia::render('Penerimaan/Index', [
            'daftarPengajuan' => $pengajuanList,
            'riwayatPenerimaan' => $riwayatPenerimaan,
            'daftarVendor' => $daftarVendor,
            'daftarRuangan' => $daftarRuangan,
            'daftarPengguna' => $daftarPengguna,
            'statistik' => $statistik,
            'filters' => [
                'q' => $request->input('q', ''),
                'hasil_verifikasi' => $request->input('hasil_verifikasi', ''),
            ],
        ]);
    }

    /**
     * Simpan hasil verifikasi barang datang dan daftarkan unit aset baru.
     */
    public function store(StorePenerimaanRequest $request): RedirectResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $user) {
            $pengajuan = Pengajuan::with('itemPengadaan')->lockForUpdate()->findOrFail($request->id_pengajuan);

            if (!in_array($pengajuan->status, ['disetujui_pimpinan', 'diproses'], true)) {
                abort(422, 'Pengajuan belum disetujui Pimpinan atau tidak sedang dalam proses penerimaan.');
            }

            $penerimaan = PenerimaanAset::create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_vendor' => $request->id_vendor,
                'id_verifikator' => $user->id_pengguna,
                'tanggal_terima' => $request->tanggal_terima,
                'nomor_nota' => $request->nomor_nota,
                'catatan' => $request->catatan,
            ]);

            $registrasiAset = $request->boolean('registrasi_aset', true);
            $idRuangan = $request->id_ruangan;
            $idPenggunaPj = $request->id_pengguna_pj;

            $tahunTerima = date('Y', strtotime($request->tanggal_terima));
            $prefix = "FTI-{$tahunTerima}-";
            $latestAset = Aset::query()
                ->where('kode_aset', 'like', "{$prefix}%")
                ->orderByDesc('kode_aset')
                ->lockForUpdate()
                ->first();

            $lastNumber = 0;
            if ($latestAset && preg_match('/' . preg_quote($prefix, '/') . '(\d+)/', $latestAset->kode_aset, $matches)) {
                $lastNumber = (int) $matches[1];
            }

            $daftarItemPengadaan = $pengajuan->itemPengadaan->keyBy('id_item_pengadaan');
            $adaKekurangan = false;

            foreach ($request->items as $itemData) {
                $itemPengadaan = $daftarItemPengadaan->get($itemData['id_item_pengadaan']);
                if (!$itemPengadaan) {
                    continue;
                }

                $jumlahDiterima = (int) ($itemData['jumlah_diterima'] ?? 0);
                $hasilVerifikasi = $itemData['hasil_verifikasi'];
                $spesifikasiDiterima = $itemData['spesifikasi_diterima'] ?? $itemPengadaan->spesifikasi;
                $catatanKekurangan = $itemData['catatan_kekurangan'] ?? null;

                if ($hasilVerifikasi !== 'sesuai') {
                    $adaKekurangan = true;
                }

                $itemPenerimaan = ItemPenerimaan::create([
                    'id_penerimaan' => $penerimaan->id_penerimaan,
                    'id_item_pengadaan' => $itemPengadaan->id_item_pengadaan,
                    'jumlah_diterima' => $jumlahDiterima,
                    'spesifikasi_diterima' => $spesifikasiDiterima,
                    'hasil_verifikasi' => $hasilVerifikasi,
                    'catatan_kekurangan' => $catatanKekurangan,
                ]);

                if ($registrasiAset && $hasilVerifikasi === 'sesuai' && $jumlahDiterima > 0) {
                    $hargaSatuan = $itemPengadaan->jumlah > 0
                        ? (float) $itemPengadaan->estimasi_anggaran / $itemPengadaan->jumlah
                        : 0;

                    for ($i = 0; $i < $jumlahDiterima; $i++) {
                        $lastNumber++;
                        $kodeAset = sprintf('%s%04d', $prefix, $lastNumber);
                        while (Aset::where('kode_aset', $kodeAset)->exists()) {
                            $lastNumber++;
                            $kodeAset = sprintf('%s%04d', $prefix, $lastNumber);
                        }

                        $asetBaru = Aset::create([
                            'id_kategori' => $itemPengadaan->id_kategori,
                            'id_item_penerimaan' => $itemPenerimaan->id_item_penerimaan,
                            'kode_aset' => $kodeAset,
                            'nama_barang' => $itemPengadaan->nama_barang,
                            'merek_tipe' => null,
                            'nomor_seri' => null,
                            'spesifikasi' => $spesifikasiDiterima ?: $itemPengadaan->spesifikasi,
                            'foto_path' => null,
                            'tahun_perolehan' => (int) $tahunTerima,
                            'harga_perolehan' => $hargaSatuan,
                            'kondisi' => 'baik',
                            'status_aset' => 'aktif',
                        ]);

                        if (!empty($idRuangan) && !empty($idPenggunaPj)) {
                            PenempatanAset::create([
                                'id_aset' => $asetBaru->id_aset,
                                'id_ruangan' => $idRuangan,
                                'id_pengguna_pj' => $idPenggunaPj,
                                'id_item_mutasi' => null,
                                'tanggal_mulai' => now(),
                                'tanggal_selesai' => null,
                                'keterangan' => 'Penempatan awal dari penerimaan ' . $penerimaan->nomor_nota,
                            ]);
                        }
                    }
                }
            }

            $semuaTerpenuhi = true;
            foreach ($pengajuan->itemPengadaan as $item) {
                $totalDiterimaSesuai = ItemPenerimaan::where('id_item_pengadaan', $item->id_item_pengadaan)
                    ->where('hasil_verifikasi', 'sesuai')
                    ->sum('jumlah_diterima');

                if ($totalDiterimaSesuai < $item->jumlah) {
                    $semuaTerpenuhi = false;
                    break;
                }
            }

            if ($semuaTerpenuhi && !$adaKekurangan) {
                $this->statusService->ubahStatus(
                    $pengajuan,
                    'selesai',
                    $user->id_pengguna,
                    'Seluruh barang telah diterima dan diverifikasi lengkap dengan hasil sesuai.'
                );
            } else {
                $this->statusService->ubahStatus(
                    $pengajuan,
                    'diproses',
                    $user->id_pengguna,
                    'Barang diterima sebagian atau terdapat catatan kekurangan verifikasi.'
                );
            }

            ActivityLogger::record(
                'verifikasi_penerimaan',
                'penerimaan_aset',
                $penerimaan->id_penerimaan,
                "Verifikasi penerimaan barang nota {$penerimaan->nomor_nota} untuk pengajuan {$pengajuan->nomor_pengajuan}",
                $user->id_pengguna
            );
        });

        return redirect()
            ->route('penerimaan.index')
            ->with('status', 'Verifikasi penerimaan barang berhasil disimpan dan unit aset baru telah didaftarkan.');
    }
}
