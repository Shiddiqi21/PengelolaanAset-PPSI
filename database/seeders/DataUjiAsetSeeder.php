<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DataUjiAsetSeeder extends Seeder
{
    public function run(): void
    {
        // Cari akun penanggung jawab aset.
        $pegawai = DB::table('pengguna')
            ->where('username', 'pegawai')
            ->first();

        if (!$pegawai) {
            throw new RuntimeException(
                'Akun pegawai tidak ditemukan.'
            );
        }

        // Daftar aset uji.
        $dataAset = [
            [
                'kode_aset' => 'UJI-ASET-001',
                'nama_barang' => 'Laptop Lenovo ThinkPad',
                'kategori' => 'KMP',
                'ruangan' => 'Ruang Dosen SI',
                'merek_tipe' => 'Lenovo ThinkPad E14',
                'nomor_seri' => 'SN-UJI-001',
                'spesifikasi' => 'Intel Core i5, RAM 8GB, SSD 512GB',
                'tahun_perolehan' => 2024,
                'harga_perolehan' => 12000000,
                'kondisi' => 'baik',
            ],
            [
                'kode_aset' => 'UJI-ASET-002',
                'nama_barang' => 'Proyektor Epson',
                'kategori' => 'MSN',
                'ruangan' => 'Lab. Sistem Informasi',
                'merek_tipe' => 'Epson EB-X500',
                'nomor_seri' => 'SN-UJI-002',
                'spesifikasi' => 'Proyektor LCD',
                'tahun_perolehan' => 2023,
                'harga_perolehan' => 7500000,
                'kondisi' => 'kurang_baik',
            ],
            [
                'kode_aset' => 'UJI-ASET-003',
                'nama_barang' => 'AC Ruangan',
                'kategori' => 'AC',
                'ruangan' => 'Lab. Jaringan',
                'merek_tipe' => 'Daikin 2 PK',
                'nomor_seri' => 'SN-UJI-003',
                'spesifikasi' => 'AC split 2 PK',
                'tahun_perolehan' => 2022,
                'harga_perolehan' => 8500000,
                'kondisi' => 'rusak_berat',
            ],
            [
                'kode_aset' => 'UJI-ASET-004',
                'nama_barang' => 'Kursi Kerja',
                'kategori' => 'PRB',
                'ruangan' => 'Ruang Administrasi',
                'merek_tipe' => 'Kursi ergonomis',
                'nomor_seri' => 'SN-UJI-004',
                'spesifikasi' => 'Kursi kerja dengan sandaran',
                'tahun_perolehan' => 2021,
                'harga_perolehan' => 1500000,
                'kondisi' => 'baik',
            ],
            [
                'kode_aset' => 'UJI-ASET-005',
                'nama_barang' => 'Router Jaringan',
                'kategori' => 'JRG',
                'ruangan' => 'Gudang Aset',
                'merek_tipe' => 'Mikrotik Router',
                'nomor_seri' => 'SN-UJI-005',
                'spesifikasi' => 'Router jaringan',
                'tahun_perolehan' => 2024,
                'harga_perolehan' => 2500000,
                'kondisi' => 'baik',
            ],
        ];

        DB::transaction(function () use ($dataAset, $pegawai) {
            foreach ($dataAset as $data) {
                $idKategori = DB::table('kategori_aset')
                    ->where('kode_kategori', $data['kategori'])
                    ->value('id_kategori');

                $idRuangan = DB::table('ruangan')
                    ->where('nama_ruangan', $data['ruangan'])
                    ->value('id_ruangan');

                if (!$idKategori) {
                    throw new RuntimeException(
                        "Kategori {$data['kategori']} tidak ditemukan."
                    );
                }

                if (!$idRuangan) {
                    throw new RuntimeException(
                        "Ruangan {$data['ruangan']} tidak ditemukan."
                    );
                }

                // Cari aset berdasarkan kode. Jangan timpa data yang sudah ada.
                $aset = DB::table('aset')
                    ->where('kode_aset', $data['kode_aset'])
                    ->first();

                if (!$aset) {
                    $idAset = DB::table('aset')->insertGetId([
                        'id_kategori' => $idKategori,
                        'id_item_penerimaan' => null,
                        'kode_aset' => $data['kode_aset'],
                        'nama_barang' => $data['nama_barang'],
                        'merek_tipe' => $data['merek_tipe'],
                        'nomor_seri' => $data['nomor_seri'],
                        'spesifikasi' => $data['spesifikasi'],
                        'foto_path' => null,
                        'tahun_perolehan' => $data['tahun_perolehan'],
                        'harga_perolehan' => $data['harga_perolehan'],
                        'kondisi' => $data['kondisi'],
                        'status_aset' => 'aktif',
                    ], 'id_aset');
                } else {
                    $idAset = $aset->id_aset;
                }

                // Buat penempatan hanya jika belum ada penempatan aktif.
                $sudahDitempatkan = DB::table('penempatan_aset')
                    ->where('id_aset', $idAset)
                    ->whereNull('tanggal_selesai')
                    ->exists();

                if (!$sudahDitempatkan) {
                    DB::table('penempatan_aset')->insert([
                        'id_aset' => $idAset,
                        'id_ruangan' => $idRuangan,
                        'id_pengguna_pj' => $pegawai->id_pengguna,
                        'id_item_mutasi' => null,
                        'tanggal_mulai' => now(),
                        'tanggal_selesai' => null,
                        'keterangan' => 'Penempatan data uji',
                    ]);
                }
            }
        });

        $this->command->info(
            'Data uji aset dan penempatannya berhasil diperiksa/dibuat.'
        );
    }
}
