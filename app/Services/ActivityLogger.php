<?php

namespace App\Services;

use App\Models\LogAktivitas;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function record(
        string $aksi,
        string $namaTabel,
        int|string|null $idData = null,
        ?string $detail = null,
        int|string|null $idPengguna = null,
    ): void {
        if ($namaTabel === 'log_aktivitas') {
            return;
        }

        LogAktivitas::query()->create([
            'id_pengguna' => $idPengguna ?? Auth::id(),
            'waktu' => now(),
            'aksi' => $aksi,
            'nama_tabel' => $namaTabel,
            'id_data' => is_numeric($idData) ? (int) $idData : null,
            'detail' => $detail,
        ]);
    }
}
