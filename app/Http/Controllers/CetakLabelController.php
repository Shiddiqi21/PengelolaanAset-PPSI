<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\KategoriAset;
use App\Models\Ruangan;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CetakLabelController extends Controller
{
    /**
     * Tampilkan halaman pilih aset dan pratinjau cetak label sesuai desain Figma.
     */
    public function index(Request $request): Response
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'kategori' => ['nullable', 'integer'],
            'ruangan' => ['nullable', 'integer'],
            'kondisi' => ['nullable', 'in:baik,kurang_baik,rusak_berat'],
            'status' => ['nullable', 'in:aktif,dalam_perbaikan,dihapus,dimutasi'],
        ]);

        $query = Aset::query()
            ->with([
                'kategori:id_kategori,kode_kategori,nama_kategori',
                'penempatanAktif.ruangan.gedung',
            ])
            ->when($filter['q'] ?? null, function ($q, string $keyword) {
                $q->where(function ($w) use ($keyword) {
                    $w->where('nama_barang', 'like', "%{$keyword}%")
                        ->orWhere('kode_aset', 'like', "%{$keyword}%")
                        ->orWhere('merek_tipe', 'like', "%{$keyword}%");
                });
            })
            ->when($filter['kategori'] ?? null, fn ($q, $katId) => $q->where('id_kategori', $katId))
            ->when($filter['ruangan'] ?? null, function ($q, $ruangId) {
                $q->whereHas('penempatan', function ($pen) use ($ruangId) {
                    $pen->whereNull('tanggal_selesai')->where('id_ruangan', $ruangId);
                });
            })
            ->when($filter['kondisi'] ?? null, fn ($q, $kondisi) => $q->where('kondisi', $kondisi))
            ->when($filter['status'] ?? null, fn ($q, $status) => $q->where('status_aset', $status))
            ->orderBy('kode_aset');

        $daftarAset = $query
            ->paginate(50)
            ->withQueryString()
            ->through(function (Aset $aset) {
                $ruangan = $aset->penempatanAktif?->ruangan;
                $lokasiStr = $ruangan
                    ? "{$ruangan->kodeRuangan()} • ".($ruangan->nama_ruangan ?: "Ruangan {$ruangan->nomor_ruangan}")
                    : 'FTI-201 • Lab. Sistem Informasi';

                return [
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'merek_tipe' => $aset->merek_tipe ?? '-',
                    'nomor_seri' => $aset->nomor_seri ?? '-',
                    'tahun_perolehan' => $aset->tahun_perolehan ?? '-',
                    'kondisi' => $aset->kondisi,
                    'status_aset' => $aset->status_aset,
                    'kategori' => $aset->kategori?->nama_kategori ?? '-',
                    'kode_kategori' => $aset->kategori?->kode_kategori ?? '-',
                    'id_ruangan' => $ruangan?->id_ruangan,
                    'lokasi' => $lokasiStr,
                ];
            });

        $opsiKategori = KategoriAset::query()
            ->orderBy('nama_kategori')
            ->get(['id_kategori', 'kode_kategori', 'nama_kategori']);

        $opsiRuangan = Ruangan::query()
            ->with('gedung:id_gedung,nama_gedung')
            ->orderBy('nomor_ruangan')
            ->get(['id_ruangan', 'id_gedung', 'nomor_ruangan', 'nama_ruangan'])
            ->map(fn (Ruangan $r) => [
                'id_ruangan' => $r->id_ruangan,
                'id_gedung' => $r->id_gedung,
                'nomor_ruangan' => $r->nomor_ruangan,
                'kode_ruangan' => $r->kodeRuangan(),
                'nama_ruangan' => $r->nama_ruangan,
                'gedung' => $r->gedung,
            ]);

        return Inertia::render('Label/Index', [
            'daftarAset' => $daftarAset,
            'opsiKategori' => $opsiKategori,
            'opsiRuangan' => $opsiRuangan,
            'filter' => [
                'q' => $filter['q'] ?? '',
                'kategori' => ! empty($filter['kategori']) ? (string) $filter['kategori'] : '',
                'ruangan' => ! empty($filter['ruangan']) ? (string) $filter['ruangan'] : '',
                'kondisi' => $filter['kondisi'] ?? '',
                'status' => $filter['status'] ?? '',
            ],
        ]);
    }
}
