<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\KategoriAset;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    /**
     * Tampilkan halaman Laporan dan Rekonsiliasi Aset untuk Operator (/laporan).
     */
    public function index(Request $request): Response
    {
        return $this->renderLaporan($request, 'operator');
    }

    /**
     * Tampilkan halaman Laporan Aset untuk Pimpinan (/pimpinan/laporan).
     */
    public function pimpinan(Request $request): Response
    {
        return $this->renderLaporan($request, 'pimpinan');
    }

    /**
     * Tampilkan halaman Pratinjau Laporan Aset untuk Pimpinan (/pimpinan/laporan/pratinjau).
     */
    public function pratinjau(Request $request): Response
    {
        $payload = $this->susunDataLaporan($request, 'pimpinan');

        return Inertia::render('Laporan/Pratinjau', $payload);
    }

    /**
     * Tampilkan halaman Laporan Aset untuk Kepala Kantor (/kepala-kantor/laporan).
     */
    public function kepalaKantor(Request $request): Response
    {
        return $this->renderLaporan($request, 'kepala-kantor');
    }

    private function renderLaporan(Request $request, string $peranKonteks): Response
    {
        return Inertia::render('Laporan/Index', $this->susunDataLaporan($request, $peranKonteks));
    }

    /**
     * Susun seluruh data laporan dan rekonsiliasi secara otomatis dari database.
     *
     * @return array<string, mixed>
     */
    private function susunDataLaporan(Request $request, string $peranKonteks): array
    {
        $periode = (string) $request->query('periode', 'Oktober 2026');
        $sumberPembanding = (string) $request->query('sumber', 'Inventaris fisik & dokumen perolehan');

        $asetList = Aset::with([
            'kategori',
            'penempatanAktif.ruangan.gedung',
            'penempatanAktif.penanggungJawab',
            'dokumen',
            'perbaikan.pengajuan',
            'mutasi.pengajuan',
            'mutasi.ruanganTujuan',
        ])
            ->orderBy('kode_aset')
            ->get();

        $totalAsetCount = $asetList->count();
        $tahunBerjalan = (int) Carbon::now()->year;

        $totalHargaPerolehan = 0.0;
        $totalAkumulasiPenyusutan = 0.0;
        $totalNilaiBuku = 0.0;

        $rekapPerKategori = [];
        $kategoriList = KategoriAset::query()->orderBy('kode_kategori')->get();

        foreach ($kategoriList as $kat) {
            $rekapPerKategori[$kat->id_kategori] = [
                'kode' => $kat->kode_kategori,
                'nama' => $kat->nama_kategori,
                'masa_manfaat' => $kat->masa_manfaat_tahun,
                'jumlah_aset' => 0,
                'harga_perolehan' => 0.0,
                'penyusutan' => 0.0,
                'nilai_buku' => 0.0,
            ];
        }

        $daftarSelisih = [];
        $daftarSesuai = [];
        $idAsetBermasalah = [];
        $nomorUrutSelisih = 1;

        foreach ($asetList as $aset) {
            $hitung = $aset->hitungPenyusutan($tahunBerjalan);
            $harga = $hitung['harga_perolehan'];
            $akumulasiPenyusutan = $hitung['akumulasi_penyusutan'];
            $nilaiBuku = $hitung['nilai_buku'];

            $totalHargaPerolehan += $harga;
            $totalAkumulasiPenyusutan += $akumulasiPenyusutan;
            $totalNilaiBuku += $nilaiBuku;

            if ($aset->id_kategori && isset($rekapPerKategori[$aset->id_kategori])) {
                $rekapPerKategori[$aset->id_kategori]['jumlah_aset']++;
                $rekapPerKategori[$aset->id_kategori]['harga_perolehan'] += $harga;
                $rekapPerKategori[$aset->id_kategori]['penyusutan'] += $akumulasiPenyusutan;
                $rekapPerKategori[$aset->id_kategori]['nilai_buku'] += $nilaiBuku;
            }

            $penempatan = $aset->penempatanAktif;
            $ruangan = $penempatan?->ruangan;
            $lokasi = $ruangan
                ? "{$ruangan->kodeRuangan()} • ".($ruangan->nama_ruangan ?: "R. {$ruangan->nomor_ruangan}")
                : 'Belum ditempatkan';

            $kondisiLabel = match ($aset->kondisi) {
                'baik' => 'Baik',
                'kurang_baik', 'rusak_ringan' => 'Rusak ringan',
                'rusak_berat' => 'Rusak berat',
                default => ucfirst((string) ($aset->kondisi ?: 'Baik')),
            };

            $meta = $aset->metaPerolehan();
            $temuanAsetIni = [];

            // 1. Cek kelengkapan Nomor Seri fisik
            if (empty(trim((string) $aset->nomor_seri))) {
                $temuanAsetIni[] = [
                    'id' => $nomorUrutSelisih++,
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'kategori_sumber' => 'sensus',
                    'elemen_data' => 'Nomor seri',
                    'master_aset' => 'Belum terisi',
                    'data_pembanding' => 'Wajib nomor seri fisik unit',
                    'status' => 'Perlu dilengkapi',
                    'status_tipe' => 'peringatan',
                    'aksi' => 'Edit',
                    'href' => route('aset.edit', $aset->id_aset, false),
                    'keterangan_detail' => "Aset {$aset->nama_barang} ({$aset->kode_aset}) belum memiliki catatan nomor seri pabrik pada Master Aset.",
                ];
            }

            // 2. Cek kelengkapan Penempatan Ruangan & Penanggung Jawab aktif
            if (! $penempatan || ! $penempatan->id_ruangan || ! $penempatan->id_pengguna_pj) {
                $temuanAsetIni[] = [
                    'id' => $nomorUrutSelisih++,
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'kategori_sumber' => 'sensus',
                    'elemen_data' => 'Penanggung jawab',
                    'master_aset' => 'Belum ditetapkan',
                    'data_pembanding' => 'Wajib ruangan & PJ aktif',
                    'status' => 'Perlu penetapan',
                    'status_tipe' => 'peringatan',
                    'aksi' => 'Lihat',
                    'href' => route('lokasi.index', absolute: false),
                    'keterangan_detail' => "Aset {$aset->nama_barang} ({$aset->kode_aset}) belum memiliki penetapan ruangan atau penanggung jawab aktif.",
                ];
            }

            // 3. Cek keberadaan Dokumen BAST pada tabel dokumen
            $punyaBast = $aset->dokumen->contains(fn ($d) => $d->jenis_dokumen === 'bast');
            if (! $punyaBast) {
                $noRef = $meta['nomor_dokumen_sumber'] ?: 'Dokumen perolehan';
                $temuanAsetIni[] = [
                    'id' => $nomorUrutSelisih++,
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'kategori_sumber' => 'bast',
                    'elemen_data' => 'Dokumen BAST',
                    'master_aset' => 'Belum diunggah',
                    'data_pembanding' => "Ref: {$noRef}",
                    'status' => 'Perlu verifikasi',
                    'status_tipe' => 'peringatan',
                    'aksi' => 'Edit',
                    'href' => route('aset.edit', $aset->id_aset, false),
                    'keterangan_detail' => "Berkas PDF BAST untuk aset {$aset->nama_barang} ({$aset->kode_aset}) dengan referensi {$noRef} belum terlampir di tabel dokumen.",
                ];
            }

            // 4. Cek sinkronisasi laporan perbaikan aktif vs status Master Aset
            $perbaikanAktif = $aset->perbaikan
                ->whereIn('status_perbaikan', ['menunggu', 'dalam_perbaikan'])
                ->first();

            if ($perbaikanAktif && $aset->status_aset === 'aktif') {
                $noPrb = $perbaikanAktif->pengajuan?->nomor_pengajuan ?? 'Laporan Perbaikan';
                $temuanAsetIni[] = [
                    'id' => $nomorUrutSelisih++,
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'kategori_sumber' => 'sensus',
                    'elemen_data' => 'Status & kondisi fisik',
                    'master_aset' => "{$kondisiLabel} (Status: Aktif)",
                    'data_pembanding' => "Dalam perbaikan ({$noPrb})",
                    'status' => 'Perlu konfirmasi',
                    'status_tipe' => 'peringatan',
                    'aksi' => 'Lihat',
                    'href' => route('aset.show', $aset->id_aset, false),
                    'keterangan_detail' => "Terdapat pekerjaan perbaikan aktif ({$noPrb}: {$perbaikanAktif->deskripsi_kerusakan}), namun status pada Master Aset masih tercatat Aktif.",
                ];
            }

            // 5. Cek aset kondisi Rusak Berat yang masih berstatus Aktif
            if ($aset->kondisi === 'rusak_berat' && $aset->status_aset === 'aktif') {
                $temuanAsetIni[] = [
                    'id' => $nomorUrutSelisih++,
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'kategori_sumber' => 'sensus',
                    'elemen_data' => 'Kondisi fisik',
                    'master_aset' => 'Rusak berat (Aktif)',
                    'data_pembanding' => 'Rekomendasi penghapusan aset',
                    'status' => 'Perlu konfirmasi',
                    'status_tipe' => 'peringatan',
                    'aksi' => 'Lihat',
                    'href' => route('aset.show', $aset->id_aset, false),
                    'keterangan_detail' => "Aset {$aset->nama_barang} ({$aset->kode_aset}) berstatus kondisi Rusak Berat di {$lokasi}, perlu tindak lanjut pengajuan penghapusan.",
                ];
            }

            // 6. Cek mutasi yang sedang berjalan
            $mutasiAktif = $aset->mutasi
                ->filter(fn ($m) => in_array($m->pengajuan?->status, ['diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses'], true))
                ->first();

            if ($mutasiAktif) {
                $noMts = $mutasiAktif->pengajuan?->nomor_pengajuan ?? 'Usulan Mutasi';
                $ruangTujuan = $mutasiAktif->ruanganTujuan?->nama_ruangan ?? 'Ruangan tujuan';
                $temuanAsetIni[] = [
                    'id' => $nomorUrutSelisih++,
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'kategori_sumber' => 'bast',
                    'elemen_data' => 'Lokasi ruangan',
                    'master_aset' => $lokasi,
                    'data_pembanding' => "Mutasi ke {$ruangTujuan} ({$noMts})",
                    'status' => 'Perlu verifikasi',
                    'status_tipe' => 'peringatan',
                    'aksi' => 'Lihat',
                    'href' => route('aset.show', $aset->id_aset, false),
                    'keterangan_detail' => "Terdapat pengajuan mutasi {$noMts} menuju {$ruangTujuan} yang menunggu penyelesaian BAST serah terima.",
                ];
            }

            // Filter berdasarkan sumber pembanding bila dipilih spesifik
            if ($sumberPembanding === 'Hasil sensus barang milik negara') {
                $temuanAsetIni = array_values(array_filter($temuanAsetIni, fn ($t) => $t['kategori_sumber'] === 'sensus'));
            } elseif ($sumberPembanding === 'Catatan BAST mutasi & penerimaan') {
                $temuanAsetIni = array_values(array_filter($temuanAsetIni, fn ($t) => $t['kategori_sumber'] === 'bast'));
            }

            if (! empty($temuanAsetIni)) {
                $idAsetBermasalah[$aset->id_aset] = true;
                foreach ($temuanAsetIni as $temuan) {
                    $daftarSelisih[] = $temuan;
                }
            }

            $daftarSesuai[] = [
                'id_aset' => $aset->id_aset,
                'kode_aset' => $aset->kode_aset,
                'nama_barang' => $aset->nama_barang,
                'kategori' => $aset->kategori?->nama_kategori ?? 'Peralatan',
                'kode_kategori' => $aset->kategori?->kode_kategori ?? '-',
                'tahun_perolehan' => $aset->tahun_perolehan ?? $tahunBerjalan,
                'masa_manfaat' => $hitung['masa_manfaat_tahun'],
                'umur_pemakaian' => $hitung['umur_pemakaian'],
                'harga_perolehan' => $harga,
                'penyusutan_per_tahun' => $hitung['penyusutan_per_tahun'],
                'akumulasi_penyusutan' => $akumulasiPenyusutan,
                'nilai_buku' => $nilaiBuku,
                'lokasi' => $lokasi,
                'penanggung_jawab' => $penempatan?->penanggungJawab?->nama_lengkap ?? 'Dr. Andi Pratama',
                'kondisi' => $kondisiLabel,
                'punya_selisih' => isset($idAsetBermasalah[$aset->id_aset]),
                'status' => isset($idAsetBermasalah[$aset->id_aset]) ? 'Ada catatan' : 'Cocok',
            ];
        }

        // Hitung KPI 100% otomatis dari hasil pemeriksaan database aktual
        $jumlahAsetBermasalah = count($idAsetBermasalah);
        $jumlahAsetCocok = max(0, $totalAsetCount - $jumlahAsetBermasalah);
        $jumlahTemuanSelisih = count($daftarSelisih);

        $persentaseCocok = $totalAsetCount > 0
            ? number_format(($jumlahAsetCocok / $totalAsetCount) * 100, 1, ',', '.').'%'
            : '100%';

        $nilaiPerolehanFormatted = $this->formatRingkasRupiah($totalHargaPerolehan);
        $nilaiBukuFormatted = $this->formatRingkasRupiah($totalNilaiBuku);

        $namaBulanIndo = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        $now = Carbon::now();
        $tanggalFormatted = $now->day.' '.($namaBulanIndo[$now->month] ?? $now->format('F')).' '.$now->year;

        return [
            'peranKonteks' => $peranKonteks,
            'kpi' => [
                'totalAset' => number_format($totalAsetCount, 0, ',', '.'),
                'sudahDicocokkan' => number_format($jumlahAsetCocok, 0, ',', '.'),
                'persentaseCocok' => $persentaseCocok,
                'selisihData' => $jumlahTemuanSelisih,
                'nilaiPerolehan' => $nilaiPerolehanFormatted,
                'nilaiBuku' => $nilaiBukuFormatted,
                'tanggalPosisi' => $tanggalFormatted,
            ],
            'periode' => $periode,
            'sumberPembanding' => $sumberPembanding,
            'daftarSelisih' => array_values($daftarSelisih),
            'daftarSesuai' => array_values(array_filter($daftarSesuai, fn ($item) => ! $item['punya_selisih'])),
            'daftarInventarisSemua' => $daftarSesuai,
            'rekapPerKategori' => array_values($rekapPerKategori),
            'totalRekap' => [
                'harga_perolehan' => $totalHargaPerolehan,
                'penyusutan' => $totalAkumulasiPenyusutan,
                'nilai_buku' => $totalNilaiBuku,
            ],
            'penandatangan' => [
                'operator' => auth()->user()?->nama_lengkap ?? 'Nadia Putri',
                'pimpinan' => 'Dr. Eng. Budi Raharjo, M.T.',
            ],
        ];
    }

    /**
     * Format nominal rupiah secara ringkas (Miliar / Juta / Rupiah) sesuai ruang kartu KPI.
     */
    private function formatRingkasRupiah(float $nominal): string
    {
        if ($nominal >= 1_000_000_000) {
            return 'Rp'.number_format($nominal / 1_000_000_000, 2, ',', '.').' M';
        }

        if ($nominal >= 1_000_000) {
            return 'Rp'.number_format($nominal / 1_000_000, 2, ',', '.').' Jt';
        }

        return 'Rp'.number_format($nominal, 0, ',', '.');
    }
}
