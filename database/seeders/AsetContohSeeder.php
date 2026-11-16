<?php

namespace Database\Seeders;

use App\Models\Aset;
use App\Models\Dokumen;
use App\Models\ItemPerbaikan;
use App\Models\KategoriAset;
use App\Models\LogAktivitas;
use App\Models\PenempatanAset;
use App\Models\Pengajuan;
use App\Models\Ruangan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Aset contoh supaya anggota tim yang mengerjakan modul aset, pemeliharaan, dan
 * laporan punya data untuk dicoba. Hanya berjalan di environment local.
 */
class AsetContohSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        Aset::query()
            ->whereIn('kode_aset', ['KMP-2024-001', 'KMP-2024-002', 'JRG-2023-001', 'AC-2021-001', 'PRB-2019-001'])
            ->delete();

        $kategori = KategoriAset::query()->pluck('id_kategori', 'kode_kategori');
        $ruangan = Ruangan::query()->pluck('id_ruangan', 'nama_ruangan');

        $admin = User::query()->where('username', 'admin')->first();
        $pemohon = User::query()->where('username', 'pemohon')->first();
        $pegawai = User::query()->where('username', 'pegawai')->first();
        $teknisi = User::query()->where('username', 'teknisi')->first();
        $pjDefault = $pemohon?->id_pengguna ?? $pegawai?->id_pengguna ?? User::query()->value('id_pengguna');

        $daftarContoh = [
            [
                'FTI-2024-0001',
                'KMP',
                'Lenovo ThinkPad E14',
                'Lenovo / ThinkPad E14',
                'LNV24E140001',
                2024,
                14500000,
                'baik',
                'aktif',
                'Ruang Dosen SI',
                '15 Februari 2024',
                'RKAT FTI 2024',
                'BAST-2024-0001',
                'aset/foto-thinkpad-e14.png',
            ],
            [
                'FTI-2024-0002',
                'KMP',
                'Dell OptiPlex 7010',
                'Dell / OptiPlex 7010',
                'DLL24OPT0002',
                2024,
                12800000,
                'baik',
                'aktif',
                'Lab. Sistem Informasi',
                '10 Maret 2024',
                'RKAT FTI 2024',
                'TER-2024-0012',
                'aset/foto-optiplex-7010.png',
            ],
            [
                'FTI-2024-0003',
                'MSN',
                'Printer Epson L3250',
                'Epson / L3250',
                'EP24L3250003',
                2024,
                3200000,
                'baik',
                'aktif',
                'Ruang Administrasi',
                '21 Oktober 2024',
                'RKAT FTI 2024',
                'TER-2024-0021',
                'aset/foto-printer-l3250.png',
            ],
            [
                'FTI-2023-0042',
                'MSN',
                'Proyektor Epson EB-X500',
                'Epson / EB-X500',
                'X5EP230042',
                2023,
                8500000,
                'kurang_baik',
                'aktif',
                'Lab. Sistem Informasi',
                '12 September 2023',
                'RKAT FTI 2023',
                'BAST-2023-0042',
                'aset/foto-proyektor-x500.png',
            ],
            [
                'FTI-2022-0018',
                'AC',
                'AC Daikin 2 PK',
                'Daikin / FTV50 2 PK',
                'DKN22AC0018',
                2022,
                9750000,
                'baik',
                'dalam_perbaikan',
                'Lab. Jaringan',
                '5 Mei 2022',
                'RKAT FTI 2022',
                'BAST-2022-0018',
                'aset/foto-ac-daikin.png',
            ],
            [
                'FTI-2018-0009',
                'KMP',
                'PC HP ProDesk 400',
                'HP / ProDesk 400 G5',
                null,
                2018,
                7800000,
                'rusak_berat',
                'aktif',
                'Gudang Aset',
                '14 Agustus 2018',
                'RKAT FTI 2018',
                'BAST-2018-0009',
                'aset/foto-hp-prodesk.png',
            ],
            [
                'FTI-2024-0010',
                'ELK',
                'Monitor Dell P2422H',
                'Dell / P2422H',
                'DLLP2422H010',
                2024,
                3200000,
                'baik',
                'aktif',
                'Ruang Dosen SI',
                '12 Februari 2024',
                'RKAT FTI 2024',
                'FAKTUR-2024-0010',
                'aset/foto-monitor-p2422h.png',
            ],
            [
                'FTI-2023-0071',
                'ELK',
                'Printer Canon G3010',
                'Canon / G3010',
                'CNG3010071',
                2023,
                2750000,
                'baik',
                'aktif',
                'Ruang Dosen SI',
                '10 September 2023',
                'RKAT FTI 2023',
                'FAKTUR-2023-0071',
                'aset/foto-printer-g3010.png',
            ],
            [
                'FTI-2022-0065',
                'PRB',
                'Kursi kerja ergonomis',
                'Ergotec / ER-200',
                'ERG22065',
                2022,
                1000000,
                'baik',
                'aktif',
                'Ruang Dosen SI',
                '5 Maret 2022',
                'RKAT FTI 2022',
                'FAKTUR-2022-0065',
                'aset/foto-kursi-ergonomis.png',
            ],
        ];

        $catatanAset = [
            'FTI-2024-0001' => 'Intel Core i5 / RAM 16 GB / SSD 512 GB',
            'FTI-2024-0010' => 'Layar IPS 24 inci Full HD, HDMI / DisplayPort',
            'FTI-2023-0071' => 'Printer tinta kontinu, cetak dan pindai',
            'FTI-2022-0065' => 'Sandaran jaring, tinggi dapat diatur',
        ];

        // Aset di bawah tanggung jawab pribadi akun pegawai (Dr. Maya Sari).
        $kodeMilikPegawai = ['FTI-2024-0001', 'FTI-2024-0010', 'FTI-2023-0071', 'FTI-2022-0065'];

        foreach ($daftarContoh as [$kode, $kodeKategori, $nama, $merek, $nomorSeri, $tahun, $harga, $kondisi, $status, $namaRuangan, $tglPerolehan, $sumberDana, $noDok, $fotoPath]) {
            $idKat = $kategori[$kodeKategori] ?? $kategori->first();
            if (! $idKat) {
                continue;
            }

            $spesifikasiJson = json_encode([
                'tanggal_perolehan' => $tglPerolehan,
                'sumber_dana' => $sumberDana,
                'nomor_dokumen_sumber' => $noDok,
                'catatan' => $catatanAset[$kode] ?? '',
            ], JSON_UNESCAPED_UNICODE);

            $aset = Aset::query()->updateOrCreate(
                ['kode_aset' => $kode],
                [
                    'id_kategori' => $idKat,
                    'nama_barang' => $nama,
                    'merek_tipe' => $merek,
                    'nomor_seri' => $nomorSeri,
                    'spesifikasi' => $spesifikasiJson,
                    'foto_path' => $fotoPath,
                    'tahun_perolehan' => $tahun,
                    'harga_perolehan' => $harga,
                    'kondisi' => $kondisi,
                    'status_aset' => $status,
                ]
            );

            $idRuangan = $ruangan[$namaRuangan] ?? null;
            $pjAset = in_array($kode, $kodeMilikPegawai, true)
                ? ($pegawai?->id_pengguna ?? $pjDefault)
                : $pjDefault;

            if ($idRuangan && $pjAset) {
                $aktif = $aset->penempatanAktif()->first();
                if (! $aktif) {
                    PenempatanAset::query()->create([
                        'id_aset' => $aset->id_aset,
                        'id_ruangan' => $idRuangan,
                        'id_pengguna_pj' => $pjAset,
                        'id_item_mutasi' => null,
                        'tanggal_mulai' => in_array($kode, $kodeMilikPegawai, true)
                            ? \Carbon\Carbon::create($tahun, 2, 15, 9, 0, 0)
                            : now()->subMonths(6),
                        'tanggal_selesai' => null,
                        'keterangan' => 'Penempatan awal inventaris FTI',
                    ]);
                } else {
                    $aktif->update([
                        'id_ruangan' => $idRuangan,
                        'id_pengguna_pj' => $pjAset,
                    ]);
                }

                if (in_array($kode, $kodeMilikPegawai, true) && $admin) {
                    $nup = str_pad((string) ((int) substr($kode, -4)), 4, '0', STR_PAD_LEFT);
                    Dokumen::query()->firstOrCreate(
                        ['id_aset' => $aset->id_aset, 'nama_file' => "BAST-{$tahun}-{$nup}.pdf"],
                        [
                            'id_pengajuan' => null,
                            'id_pengunggah' => $admin->id_pengguna,
                            'jenis_dokumen' => 'bast',
                            'path_file' => "dokumen/BAST-{$tahun}-{$nup}.pdf",
                            'tanggal_unggah' => "{$tahun}-02-15 10:00:00",
                        ]
                    );
                }
            }

            if ($kode === 'FTI-2023-0042' && $admin && $pemohon) {
                Dokumen::query()->firstOrCreate(
                    ['id_aset' => $aset->id_aset, 'nama_file' => 'BAST-2023-0042.pdf'],
                    [
                        'id_pengajuan' => null,
                        'id_pengunggah' => $admin->id_pengguna,
                        'jenis_dokumen' => 'bast',
                        'path_file' => 'dokumen/BAST-2023-0042.pdf',
                        'tanggal_unggah' => '2023-09-12 10:00:00',
                    ]
                );

                Dokumen::query()->firstOrCreate(
                    ['id_aset' => $aset->id_aset, 'nama_file' => 'Faktur_Epson_2023.pdf'],
                    [
                        'id_pengajuan' => null,
                        'id_pengunggah' => $admin->id_pengguna,
                        'jenis_dokumen' => 'lainnya',
                        'path_file' => 'dokumen/Faktur_Epson_2023.pdf',
                        'tanggal_unggah' => '2023-09-12 10:05:00',
                    ]
                );

                $pengajuanPrb = Pengajuan::query()->firstOrCreate(
                    ['nomor_pengajuan' => 'PRB-2026-0031'],
                    [
                        'id_pemohon' => $pemohon->id_pengguna,
                        'jenis_pengajuan' => 'perbaikan',
                        'tanggal_pengajuan' => '2026-10-18 09:00:00',
                        'keterangan' => 'Lampu proyektor meredup dan filter berdebu',
                        'status' => 'diproses',
                    ]
                );

                ItemPerbaikan::query()->firstOrCreate(
                    ['id_pengajuan' => $pengajuanPrb->id_pengajuan, 'id_aset' => $aset->id_aset],
                    [
                        'id_teknisi' => $teknisi?->id_pengguna,
                        'deskripsi_kerusakan' => 'Lampu proyektor meredup pada ruang kuliah',
                        'hasil_pemeriksaan' => 'Pemeriksaan lampu dan filter. Target selesai 22 Oktober 2026.',
                        'status_perbaikan' => 'dalam_perbaikan',
                        'tanggal_mulai' => '2026-10-21 09:00:00',
                    ]
                );

                if (! LogAktivitas::query()->where('nama_tabel', 'aset')->where('id_data', $aset->id_aset)->where('aksi', 'perbarui_inventaris')->exists()) {
                    LogAktivitas::query()->create([
                        'id_pengguna' => $admin->id_pengguna,
                        'waktu' => '2026-10-18 14:15:00',
                        'aksi' => 'perbarui_inventaris',
                        'nama_tabel' => 'aset',
                        'id_data' => $aset->id_aset,
                        'detail' => json_encode([
                            'judul' => 'Kondisi diperbarui',
                            'ringkasan' => 'Baik → Rusak ringan • Nadia Putri',
                            'kegiatan' => 'Pembaruan kondisi rusak ringan',
                            'referensi' => 'PRB-2026-0031',
                            'pelaksana' => 'Nadia Putri',
                        ], JSON_UNESCAPED_UNICODE),
                    ]);

                    LogAktivitas::query()->create([
                        'id_pengguna' => $admin->id_pengguna,
                        'waktu' => '2023-09-12 10:00:00',
                        'aksi' => 'perolehan_aset',
                        'nama_tabel' => 'aset',
                        'id_data' => $aset->id_aset,
                        'detail' => json_encode([
                            'judul' => 'Data inventaris dibuat',
                            'ringkasan' => 'Pencatatan perolehan aset 2023',
                            'kegiatan' => 'Pencatatan perolehan aset 2023',
                            'referensi' => 'BAST-2023-0042',
                            'pelaksana' => 'Nadia Putri',
                        ], JSON_UNESCAPED_UNICODE),
                    ]);
                }
            }
        }

        $this->buatBerkasDokumenContoh();
    }

    /**
     * Membuat berkas PDF contoh untuk setiap baris tabel dokumen yang berkasnya belum ada,
     * supaya tautan dokumen yang dibaca dari database benar-benar dapat dibuka.
     */
    private function buatBerkasDokumenContoh(): void
    {
        $disk = Storage::disk('public');

        Dokumen::query()
            ->with('aset:id_aset,kode_aset,nama_barang')
            ->whereNotNull('path_file')
            ->where('path_file', 'like', '%.pdf')
            ->get()
            ->each(function (Dokumen $d) use ($disk) {
                if ($disk->exists($d->path_file)) {
                    return;
                }

                $jenis = match ($d->jenis_dokumen) {
                    'bast' => 'BERITA ACARA SERAH TERIMA (BAST)',
                    default => 'DOKUMEN SUMBER ASET',
                };

                $disk->put($d->path_file, $this->susunPdf([
                    'SIM ASET FTI - UNIVERSITAS ANDALAS',
                    $jenis,
                    '',
                    'Nama berkas : '.$d->nama_file,
                    'Kode aset   : '.($d->aset?->kode_aset ?? '-'),
                    'Nama aset   : '.($d->aset?->nama_barang ?? '-'),
                    'Tanggal     : '.($d->tanggal_unggah?->format('d-m-Y') ?? '-'),
                    '',
                    'Dokumen contoh untuk pengujian sistem (bukan dokumen resmi).',
                ]));
            });
    }

    /**
     * @param  list<string>  $baris
     */
    private function susunPdf(array $baris): string
    {
        $esc = fn (string $s) => str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);

        $isi = "BT\n/F1 13 Tf\n16 TL\n56 780 Td\n";
        foreach ($baris as $i => $b) {
            $isi .= ($i === 0 ? '' : "T*\n").'('.$esc($b).") Tj\n";
        }
        $isi .= 'ET';

        $objek = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($isi)." >>\nstream\n".$isi."\nendstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offset = [];
        foreach ($objek as $i => $o) {
            $offset[$i] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n".$o."\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objek) + 1)."\n0000000000 65535 f \n";
        foreach ($offset as $o) {
            $pdf .= sprintf("%010d 00000 n \n", $o);
        }
        $pdf .= 'trailer << /Size '.(count($objek) + 1)." /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF";

        return $pdf;
    }
}
