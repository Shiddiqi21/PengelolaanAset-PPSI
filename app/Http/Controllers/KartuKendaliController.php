<?php

namespace App\Http\Controllers;

use App\Models\PenempatanAset;
use App\Models\Ruangan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KartuKendaliController extends Controller
{
    /**
     * Tampilkan lembar Kartu Kendali Ruangan (DBR) sesuai desain Figma.
     */
    public function index(Request $request): Response
    {
        $daftarRuangan = Ruangan::query()
            ->with(['gedung', 'unit', 'subUnit'])
            ->orderBy('nomor_ruangan')
            ->get()
            ->map(function (Ruangan $r) {
                $kode = $r->kodeRuangan();
                $label = "{$kode} • ".($r->nama_ruangan ?: "Ruangan {$r->nomor_ruangan}");

                return [
                    'id_ruangan' => $r->id_ruangan,
                    'nomor_ruangan' => $r->nomor_ruangan,
                    'kode_ruangan' => $kode,
                    'nama_ruangan' => $r->nama_ruangan,
                    'label' => $label,
                    'gedung' => $r->gedung?->nama_gedung ?? 'Gedung FTI',
                    'unit' => $r->unit?->nama_unit ?? 'Fakultas Teknologi Informasi',
                    'sub_unit' => $r->subUnit?->nama_sub_unit ?? '',
                ];
            });

        // Tentukan ruangan yang dipilih
        $idTerpilih = $request->query('ruangan') ?? $request->query('id_ruangan');

        $ruanganAktif = null;
        if ($idTerpilih) {
            $ruanganAktif = $daftarRuangan->firstWhere('id_ruangan', (int) $idTerpilih);
        }

        // Jika belum ada pilihan, utamakan Lab. Sistem Informasi (FTI-201) atau ruangan pertama yang memiliki aset
        if (! $ruanganAktif && $daftarRuangan->isNotEmpty()) {
            $labSi = $daftarRuangan->firstWhere('kode_ruangan', 'FTI-201');
            $ruanganDenganAset = PenempatanAset::query()
                ->whereNull('tanggal_selesai')
                ->value('id_ruangan');

            $ruanganAktif = $labSi
                ?? $daftarRuangan->firstWhere('id_ruangan', $ruanganDenganAset)
                ?? $daftarRuangan->first();
        }

        // Ambil penempatan aktif untuk ruangan terpilih
        $penempatan = $ruanganAktif
            ? PenempatanAset::query()
                ->where('id_ruangan', $ruanganAktif['id_ruangan'])
                ->whereNull('tanggal_selesai')
                ->with(['aset.kategori', 'aset.perbaikan', 'penanggungJawab'])
                ->get()
            : collect();

        // Cari Penanggung Jawab
        $pjUser = $penempatan->first()?->penanggungJawab
            ?? User::where('username', 'pemohon')->first();

        $namaPj = $pjUser?->nama_lengkap ?? 'Dr. Andi Pratama';

        // Tanggal posisi: default tanggal hari ini (posisi aset terkini saat dokumen dicetak/dilihat)
        // Mendukung parameter ?tanggal=YYYY-MM-DD jika ingin melihat arsip posisi tanggal tertentu
        $tanggalCarbon = $request->filled('tanggal')
            ? Carbon::parse($request->query('tanggal'))
            : Carbon::now();

        $namaBulanIndo = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        $tanggalPosisi = $tanggalCarbon->day.' '.($namaBulanIndo[$tanggalCarbon->month] ?? $tanggalCarbon->format('F')).' '.$tanggalCarbon->year;

        // Nomor Romawi untuk bulan
        $romawiBulan = [
            1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI',
            7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
        ];
        $bulanRomawi = $romawiBulan[$tanggalCarbon->month] ?? 'X';

        $nomorKodeRuang = $ruanganAktif ? ($ruanganAktif['kode_ruangan'] ?? 'FTI-201') : 'FTI-201';
        $nomorDokumen = "KKR/{$nomorKodeRuang}/{$bulanRomawi}/{$tanggalCarbon->year}";

        // Format data daftar aset
        $daftarAset = $penempatan->map(function ($p) {
            $aset = $p->aset;
            $nama = $aset?->nama_barang ?? '-';

            $sedangDiperbaiki = $aset?->status_aset === 'dalam_perbaikan'
                || ($aset && $aset->perbaikan->whereIn('status_perbaikan', ['menunggu', 'dalam_perbaikan'])->isNotEmpty());

            $keterangan = match (true) {
                $sedangDiperbaiki => 'Dalam perbaikan',
                $aset?->status_aset === 'dimutasi' => 'Mutasi belum dilaksanakan',
                $p->keterangan && $p->keterangan !== 'Penempatan awal inventaris FTI' => $p->keterangan,
                default => 'Digunakan',
            };

            return [
                'id_penempatan' => $p->id_penempatan,
                'id_aset' => $aset?->id_aset,
                'kode_aset' => $aset?->kode_aset ?? '-',
                'nama_barang' => $nama,
                'tahun' => $aset?->tahun_perolehan ?? '-',
                'jumlah' => '1 unit',
                'kondisi' => $aset?->kondisi ?? 'baik',
                'kondisi_label' => match ($aset?->kondisi) {
                    'baik' => 'Baik',
                    'kurang_baik', 'rusak_ringan' => 'Rusak ringan',
                    'rusak_berat' => 'Rusak berat',
                    default => ucfirst($aset?->kondisi ?? 'Baik'),
                },
                'keterangan' => $keterangan,
            ];
        })->values();

        // Nama operator yang sedang login
        $operatorNama = auth()->user()?->nama_lengkap ?? 'Nadia Putri';

        return Inertia::render('KartuKendali/Index', [
            'daftarRuangan' => $daftarRuangan,
            'ruanganAktif' => $ruanganAktif,
            'penanggungJawab' => $namaPj,
            'daftarAset' => $daftarAset,
            'tanggalPosisi' => $tanggalPosisi,
            'nomorDokumen' => $nomorDokumen,
            'operatorNama' => $operatorNama,
            'filter' => [
                'ruangan' => $ruanganAktif ? (string) $ruanganAktif['id_ruangan'] : '',
                'tanggal' => $request->query('tanggal', ''),
            ],
        ]);
    }
}
