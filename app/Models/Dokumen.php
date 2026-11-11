<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dokumen extends Model
{
    protected $table = 'dokumen';
    protected $primaryKey = 'id_dokumen';

    protected $fillable = [
        'id_pengajuan', 'id_aset', 'jenis_dokumen',
        'nama_file', 'path', 'diunggah_oleh', 'tanggal_unggah',
    ];

    protected function casts(): array
    {
        return ['tanggal_unggah' => 'datetime'];
    }

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset', 'id_aset');
    }

    public function pengunggah()
    {
        return $this->belongsTo(User::class, 'diunggah_oleh', 'id_pengguna');
    }
}
