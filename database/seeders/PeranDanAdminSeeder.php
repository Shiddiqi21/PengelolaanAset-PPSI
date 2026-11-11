<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Peran;
use App\Models\Unit;
use App\Models\SubUnit;
use App\Models\User;

class PeranDanAdminSeeder extends Seeder
{
    public function run(): void
    {
        // ── 4 Peran sesuai Use Case ──────────────────────────────
        $peranData = [
            ['nama_peran' => 'Operator Aset Fakultas', 'deskripsi' => 'Mengelola data aset, pengadaan, perbaikan, mutasi, dan penghapusan.'],
            ['nama_peran' => 'Pimpinan',               'deskripsi' => 'Menyetujui pengajuan level tertinggi dan melihat laporan.'],
            ['nama_peran' => 'Kepala Departemen',       'deskripsi' => 'Menyetujui pengajuan dari unit masing-masing.'],
            ['nama_peran' => 'Pegawai/Dosen',           'deskripsi' => 'Mengajukan pengadaan, perbaikan, mutasi, atau penghapusan aset.'],
        ];

        foreach ($peranData as $data) {
            Peran::firstOrCreate(['nama_peran' => $data['nama_peran']], $data);
        }

        // ── Contoh Unit ──────────────────────────────────────────
        $fakultas = Unit::firstOrCreate(
            ['nama_unit' => 'Fakultas Teknologi Industri'],
            ['jenis_unit' => 'fakultas']
        );

        $unitIT = Unit::firstOrCreate(
            ['nama_unit' => 'Departemen Teknik Informatika'],
            ['jenis_unit' => 'departemen']
        );

        $subIT = SubUnit::firstOrCreate(
            ['id_unit' => $unitIT->id_unit, 'nama_sub_unit' => 'Lab Jaringan'],
            ['id_unit' => $unitIT->id_unit, 'nama_sub_unit' => 'Lab Jaringan']
        );

        // ── Admin / Operator default ──────────────────────────────
        $peranOperator = Peran::where('nama_peran', 'Operator Aset Fakultas')->first();
        $peranPimpinan = Peran::where('nama_peran', 'Pimpinan')->first();

        User::firstOrCreate(
            ['email' => 'admin@fti.ac.id'],
            [
                'id_peran'     => $peranOperator->id_peran,
                'id_unit'      => $fakultas->id_unit,
                'nip'          => '000000001',
                'nama_lengkap' => 'Administrator Sistem',
                'username'     => 'admin',
                'password'     => Hash::make('password'),
                'is_aktif'     => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'pimpinan@fti.ac.id'],
            [
                'id_peran'     => $peranPimpinan->id_peran,
                'id_unit'      => $fakultas->id_unit,
                'nip'          => '000000002',
                'nama_lengkap' => 'Dekan FTI',
                'username'     => 'pimpinan',
                'password'     => Hash::make('password'),
                'is_aktif'     => true,
            ]
        );

        $this->command->info('✅ Peran, unit, dan akun awal berhasil dibuat.');
    }
}
