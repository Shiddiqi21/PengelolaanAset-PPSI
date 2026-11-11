<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RiwayatStatusPengajuan extends Model
{
    protected $table = 'riwayat_status_pengajuan';
    protected $primaryKey = 'id_riwayat_status';
    public $timestamps = false;

    protected $fillable = ['id_pengajuan', 'id_pengguna', 'status_baru', 'catatan', 'waktu'];

    protected function casts(): array
    {
        return ['waktu' => 'datetime'];
    }

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function pengguna()
    {
        return $this->belongsTo(User::class, 'id_pengguna', 'id_pengguna');
    }
}
