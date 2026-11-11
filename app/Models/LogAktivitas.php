<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogAktivitas extends Model
{
    protected $table = 'log_aktivitas';
    protected $primaryKey = 'id_log';
    public $timestamps = false;

    protected $fillable = ['id_pengguna', 'waktu', 'aksi', 'nama_tabel', 'id_data', 'detail'];

    protected function casts(): array
    {
        return ['waktu' => 'datetime'];
    }

    public function pengguna()
    {
        return $this->belongsTo(User::class, 'id_pengguna', 'id_pengguna');
    }
}
