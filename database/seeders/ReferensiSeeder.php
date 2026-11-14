<?php

namespace Database\Seeders;

use App\Models\Gedung;
use App\Models\KategoriAset;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

/**
 * Data referensi contoh untuk pengembangan. Nilai (kode, masa manfaat, nama vendor,
 * ruangan) hanya contoh; sesuaikan dengan data resmi FTI sebelum dipakai sungguhan.
 */
class ReferensiSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['KMP', 'Komputer dan perangkat pengolah data', 4],
            ['JRG', 'Peralatan jaringan', 4],
            ['ELK', 'Peralatan elektronik', 4],
            ['PRB', 'Perabot kantor dan ruang kuliah', 8],
            ['LAB', 'Peralatan laboratorium', 5],
            ['AC', 'Pendingin ruangan', 8],
        ] as [$kode, $nama, $masaManfaat]) {
            KategoriAset::query()->firstOrCreate(
                ['kode_kategori' => $kode],
                ['nama_kategori' => $nama, 'masa_manfaat_tahun' => $masaManfaat]
            );
        }

        $gedung = Gedung::query()->firstOrCreate(
            ['kode_gedung' => 'GFTI'],
            ['nama_gedung' => 'Gedung Fakultas Teknologi Informasi']
        );

        foreach ([
            ['PT Sumber Alat Kantor', 'Padang', '0751000000'],
            ['CV Mitra Teknologi Padang', 'Padang', '0751000001'],
            ['UD Andalas Elektronik', 'Padang', '0751000002'],
        ] as [$nama, $alamat, $kontak]) {
            Vendor::query()->firstOrCreate(
                ['nama_vendor' => $nama],
                ['alamat' => $alamat, 'kontak' => $kontak]
            );
        }

        $fakultas = Unit::query()->where('nama_unit', 'Fakultas Teknologi Informasi')->first();
        $departemen = Unit::query()->where('nama_unit', 'Departemen Teknik Informatika')->first();

        $tataUsaha = $fakultas
            ? SubUnit::query()->where('id_unit', $fakultas->id_unit)->where('nama_sub_unit', 'Tata Usaha Fakultas')->first()
            : null;
        $lab = $departemen
            ? SubUnit::query()->where('id_unit', $departemen->id_unit)->where('nama_sub_unit', 'Lab Jaringan')->first()
            : null;

        $ruangan = [];

        if ($fakultas && $tataUsaha) {
            $ruangan[] = [$fakultas, $tataUsaha, 1, '101', 'Ruang Tata Usaha'];
            $ruangan[] = [$fakultas, $tataUsaha, 2, '201', 'Ruang Pimpinan'];
        }

        if ($departemen && $lab) {
            $ruangan[] = [$departemen, $lab, 1, '102', 'Lab Jaringan'];
            $ruangan[] = [$departemen, $lab, 1, '103', 'Ruang Kuliah 1'];
        }

        foreach ($ruangan as [$unit, $subUnit, $lantai, $nomor, $nama]) {
            Ruangan::query()->firstOrCreate(
                ['id_gedung' => $gedung->id_gedung, 'nomor_ruangan' => $nomor],
                [
                    'id_unit' => $unit->id_unit,
                    'id_sub_unit' => $subUnit->id_sub_unit,
                    'lantai' => $lantai,
                    'nama_ruangan' => $nama,
                ]
            );
        }
    }
}
