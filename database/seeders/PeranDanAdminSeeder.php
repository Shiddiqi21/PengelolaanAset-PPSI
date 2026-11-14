<?php

namespace Database\Seeders;

use App\Models\Peran;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Database\Seeder;

class PeranDanAdminSeeder extends Seeder
{
    public function run(): void
    {
        $peranData = [
            [PeranNama::OPERATOR, 'Mengelola data aset, akun pengguna, dan seluruh proses administrasi aset.'],
            [PeranNama::PIMPINAN, 'Menyetujui pengajuan dan melihat laporan.'],
            [PeranNama::KEPALA_KANTOR, 'Memeriksa pengajuan dan menghasilkan laporan operasional.'],
            [PeranNama::PEMOHON, 'Mengajukan pengadaan, perbaikan, mutasi, dan penghapusan aset.'],
            [PeranNama::PEGAWAI, 'Melihat aset yang menjadi tanggung jawabnya.'],
            [PeranNama::TEKNISI, 'Mengerjakan tugas perbaikan aset.'],
        ];

        foreach ($peranData as [$nama, $deskripsi]) {
            Peran::query()->firstOrCreate(
                ['nama_peran' => $nama],
                ['deskripsi' => $deskripsi]
            );
        }

        $fakultas = Unit::query()->firstOrCreate(
            ['nama_unit' => 'Fakultas Teknologi Informasi'],
            ['jenis_unit' => 'fakultas']
        );

        $departemen = Unit::query()->firstOrCreate(
            ['nama_unit' => 'Departemen Teknik Informatika'],
            ['jenis_unit' => 'departemen']
        );

        $tataUsaha = SubUnit::query()->firstOrCreate(
            ['id_unit' => $fakultas->id_unit, 'nama_sub_unit' => 'Tata Usaha Fakultas'],
            ['jenis_sub_unit' => 'tata_usaha']
        );

        $lab = SubUnit::query()->firstOrCreate(
            ['id_unit' => $departemen->id_unit, 'nama_sub_unit' => 'Lab Jaringan'],
            ['jenis_sub_unit' => 'laboratorium']
        );

        // [username, email, nip, nama, peran utama, unit, sub unit, peran tambahan]
        // Nama mengikuti contoh pada desain Figma. Akun 'pemohon' sengaja memiliki dua peran.
        $akun = [
            ['admin', 'admin@fti.ac.id', '000000001', 'Nadia Putri', PeranNama::OPERATOR, $fakultas, $tataUsaha, []],
            ['pimpinan', 'pimpinan@fti.ac.id', '000000002', 'Dr. Rina Mahardika', PeranNama::PIMPINAN, $fakultas, $tataUsaha, []],
            ['kepala', 'kepala@fti.ac.id', '000000003', 'Yusri, S.E.', PeranNama::KEPALA_KANTOR, $fakultas, $tataUsaha, []],
            ['pemohon', 'pemohon@fti.ac.id', '000000004', 'Dr. Andi Pratama', PeranNama::PEMOHON, $departemen, $lab, [PeranNama::PEGAWAI]],
            ['pegawai', 'pegawai@fti.ac.id', '000000005', 'Dr. Maya Sari', PeranNama::PEGAWAI, $departemen, $lab, []],
            ['teknisi', 'teknisi@fti.ac.id', '000000006', 'Budi Saputra', PeranNama::TEKNISI, $fakultas, $tataUsaha, []],
        ];

        $passwordAkun = 'password';

        // Di production akun contoh tidak dibuat. Hanya admin awal, dan hanya bila
        // ADMIN_AWAL_PASSWORD diisi di .env. Setelah masuk, segera ganti kata sandinya.
        if (app()->environment('production')) {
            $passwordAkun = env('ADMIN_AWAL_PASSWORD');

            if (! $passwordAkun) {
                $this->command?->warn('Production: akun admin awal dilewati. Isi ADMIN_AWAL_PASSWORD di .env lalu jalankan seeder lagi.');

                return;
            }

            $akun = [$akun[0]];
        }

        foreach ($akun as [$username, $email, $nip, $nama, $peran, $unit, $subUnit, $peranTambahan]) {
            $role = Peran::query()->where('nama_peran', $peran)->first();

            $user = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'id_peran' => $role->id_peran,
                    'id_unit' => $unit->id_unit,
                    'id_sub_unit' => $subUnit->id_sub_unit,
                    'nip' => $nip,
                    'nama_lengkap' => $nama,
                    'username' => $username,
                    'password_hash' => $passwordAkun,
                    'is_aktif' => true,
                ]
            );

            foreach ($peranTambahan as $namaTambahan) {
                $user->semuaPeran()->syncWithoutDetaching([
                    Peran::query()->where('nama_peran', $namaTambahan)->value('id_peran'),
                ]);
            }
        }
    }
}
