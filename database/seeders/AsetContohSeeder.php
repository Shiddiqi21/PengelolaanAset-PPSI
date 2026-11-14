<?php

namespace Database\Seeders;

use App\Models\Aset;
use App\Models\KategoriAset;
use Illuminate\Database\Seeder;

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

        $kategori = KategoriAset::query()->pluck('id_kategori', 'kode_kategori');

        foreach ([
            ['KMP-2024-001', 'KMP', 'Komputer desktop', 'Dell OptiPlex 3080', 2024, 9500000, 'baik', 'aktif'],
            ['KMP-2024-002', 'KMP', 'Laptop dosen', 'Lenovo ThinkPad E14', 2024, 12500000, 'baik', 'aktif'],
            ['JRG-2023-001', 'JRG', 'Switch jaringan 24 port', 'Cisco SG350-28', 2023, 7800000, 'kurang_baik', 'aktif'],
            ['AC-2021-001', 'AC', 'AC split 2 PK', 'Daikin FTV50', 2021, 8900000, 'baik', 'dalam_perbaikan'],
            ['PRB-2019-001', 'PRB', 'Meja kerja pegawai', 'Meja kayu 120 cm', 2019, 1800000, 'rusak_berat', 'aktif'],
        ] as [$kode, $kodeKategori, $nama, $merek, $tahun, $harga, $kondisi, $status]) {
            if (! isset($kategori[$kodeKategori])) {
                continue;
            }

            Aset::query()->firstOrCreate(
                ['kode_aset' => $kode],
                [
                    'id_kategori' => $kategori[$kodeKategori],
                    'nama_barang' => $nama,
                    'merek_tipe' => $merek,
                    'tahun_perolehan' => $tahun,
                    'harga_perolehan' => $harga,
                    'kondisi' => $kondisi,
                    'status_aset' => $status,
                ]
            );
        }
    }
}
