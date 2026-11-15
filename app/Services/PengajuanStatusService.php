<?php

namespace App\Services;

use App\Models\Pengajuan;
use App\Models\RiwayatStatusPengajuan;
use Illuminate\Support\Facades\DB;

class PengajuanStatusService
{
    /**
     * Ubah status pengajuan secara umum dan catat riwayat serta log aktivitas.
     */
    public function ubahStatus(
        Pengajuan $pengajuan,
        string $statusBaru,
        int $idPengguna,
        ?string $catatan = null
    ): RiwayatStatusPengajuan {
        return DB::transaction(function () use ($pengajuan, $statusBaru, $idPengguna, $catatan) {
            $pengajuan->update(['status' => $statusBaru]);

            $riwayat = RiwayatStatusPengajuan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $idPengguna,
                'status_baru' => $statusBaru,
                'catatan' => $catatan ?: "Status diubah menjadi {$statusBaru}",
                'waktu' => now(),
            ]);

            ActivityLogger::record(
                'ubah_status',
                'pengajuan',
                $pengajuan->id_pengajuan,
                "Status diubah ke {$statusBaru}. Catatan: {$catatan}",
                $idPengguna
            );

            return $riwayat;
        });
    }

    /**
     * Kirim draf pengajuan oleh pemohon (draft -> diajukan).
     */
    public function kirimDraft(
        Pengajuan $pengajuan,
        int $idPengguna,
        ?string $catatan = null
    ): void {
        DB::transaction(function () use ($pengajuan, $idPengguna, $catatan) {
            $pengajuan->update(['status' => 'diajukan']);

            RiwayatStatusPengajuan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $idPengguna,
                'status_baru' => 'diajukan',
                'catatan' => $catatan ?: 'Pengajuan dikirim oleh pemohon',
                'waktu' => now(),
            ]);

            ActivityLogger::record(
                'kirim',
                'pengajuan',
                $pengajuan->id_pengajuan,
                'Pengajuan draf dikirim oleh pemohon',
                $idPengguna
            );
        });
    }

    /**
     * Perbarui waktu riwayat draf terakhir tanpa membuat baris baru.
     */
    public function perbaruiWaktuDraft(Pengajuan $pengajuan, int $idPengguna): void
    {
        $riwayatDraftTerakhir = RiwayatStatusPengajuan::query()
            ->where('id_pengajuan', $pengajuan->id_pengajuan)
            ->where('status_baru', 'draft')
            ->orderByDesc('id_riwayat_status')
            ->first();

        if ($riwayatDraftTerakhir) {
            $riwayatDraftTerakhir->update([
                'waktu' => now(),
            ]);
        } else {
            RiwayatStatusPengajuan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $idPengguna,
                'status_baru' => 'draft',
                'catatan' => 'Draf pengajuan disimpan',
                'waktu' => now(),
            ]);
        }
    }

    /**
     * Catat hasil pemeriksaan oleh Operator Aset Fakultas.
     *
     * @param  string  $keputusan  'teruskan'|'kembalikan'
     */
    public function catatPemeriksaanOperator(
        Pengajuan $pengajuan,
        int $idPengguna,
        string $keputusan,
        string $catatan
    ): void {
        DB::transaction(function () use ($pengajuan, $idPengguna, $keputusan, $catatan) {
            if ($keputusan === 'teruskan') {
                // Status tetap 'diajukan', dicatat pemeriksaan operator untuk diteruskan ke Kepala Kantor
                $riwayatCatatan = 'Pemeriksaan Operator: Berkas lengkap dan sesuai spesifikasi. '
                    . ($catatan ? "Catatan: {$catatan}" : 'Diteruskan ke Kepala Kantor.');

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $idPengguna,
                    'status_baru' => 'diajukan',
                    'catatan' => $riwayatCatatan,
                    'waktu' => now(),
                ]);

                ActivityLogger::record(
                    'verifikasi',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Pemeriksaan operator: diteruskan. Catatan: {$catatan}",
                    $idPengguna
                );
            } else {
                // Dikembalikan ke draf untuk diperbaiki oleh pemohon
                $pengajuan->update(['status' => 'draft']);

                $riwayatCatatan = "Dikembalikan oleh Operator: {$catatan}";

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $idPengguna,
                    'status_baru' => 'draft',
                    'catatan' => $riwayatCatatan,
                    'waktu' => now(),
                ]);

                ActivityLogger::record(
                    'kembalikan',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Pengajuan dikembalikan ke draf oleh operator. Alasan: {$catatan}",
                    $idPengguna
                );
            }
        });
    }

    /**
     * Catat hasil verifikasi dan rekomendasi oleh Kepala Kantor.
     *
     * @param  string  $keputusan  'rekomendasikan'|'kembalikan'
     */
    public function catatPemeriksaanKepalaKantor(
        Pengajuan $pengajuan,
        int $idPengguna,
        string $keputusan,
        string $catatan
    ): void {
        DB::transaction(function () use ($pengajuan, $idPengguna, $keputusan, $catatan) {
            if ($keputusan === 'rekomendasikan') {
                $pengajuan->update(['status' => 'disetujui_kadep']);

                $riwayatCatatan = "Rekomendasi Kepala Kantor: {$catatan}";

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $idPengguna,
                    'status_baru' => 'disetujui_kadep',
                    'catatan' => $riwayatCatatan,
                    'waktu' => now(),
                ]);

                ActivityLogger::record(
                    'rekomendasi',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Rekomendasi disetujui_kadep oleh Kepala Kantor. Catatan: {$catatan}",
                    $idPengguna
                );
            } else {
                $pengajuan->update(['status' => 'draft']);

                $riwayatCatatan = "Dikembalikan untuk revisi oleh Kepala Kantor: {$catatan}";

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $idPengguna,
                    'status_baru' => 'draft',
                    'catatan' => $riwayatCatatan,
                    'waktu' => now(),
                ]);

                ActivityLogger::record(
                    'kembalikan',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Pengajuan dikembalikan ke draf oleh Kepala Kantor. Alasan: {$catatan}",
                    $idPengguna
                );
            }
        });
    }

    /**
     * Catat keputusan akhir oleh Pimpinan (setujui / tolak / kembalikan).
     *
     * @param  string  $keputusan  'setujui'|'tolak'|'kembalikan'
     */
    public function catatKeputusanPimpinan(
        Pengajuan $pengajuan,
        int $idPengguna,
        string $keputusan,
        string $catatan
    ): void {
        DB::transaction(function () use ($pengajuan, $idPengguna, $keputusan, $catatan) {
            if ($keputusan === 'setujui') {
                $pengajuan->update(['status' => 'disetujui_pimpinan']);

                $riwayatCatatan = 'Disetujui oleh Pimpinan. ' . ($catatan ?: 'Pengajuan disetujui untuk diproses.');

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $idPengguna,
                    'status_baru' => 'disetujui_pimpinan',
                    'catatan' => $riwayatCatatan,
                    'waktu' => now(),
                ]);

                ActivityLogger::record(
                    'persetujuan',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Disetujui pimpinan. Catatan: {$catatan}",
                    $idPengguna
                );
            } elseif ($keputusan === 'tolak') {
                $pengajuan->update(['status' => 'ditolak']);

                $riwayatCatatan = "Ditolak oleh Pimpinan: {$catatan}";

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $idPengguna,
                    'status_baru' => 'ditolak',
                    'catatan' => $riwayatCatatan,
                    'waktu' => now(),
                ]);

                ActivityLogger::record(
                    'penolakan',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Ditolak pimpinan. Alasan: {$catatan}",
                    $idPengguna
                );
            } else {
                $pengajuan->update(['status' => 'draft']);

                $riwayatCatatan = "Dikembalikan oleh Pimpinan: {$catatan}";

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $idPengguna,
                    'status_baru' => 'draft',
                    'catatan' => $riwayatCatatan,
                    'waktu' => now(),
                ]);

                ActivityLogger::record(
                    'kembalikan',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Dikembalikan pimpinan ke draf. Catatan: {$catatan}",
                    $idPengguna
                );
            }
        });
    }
}
