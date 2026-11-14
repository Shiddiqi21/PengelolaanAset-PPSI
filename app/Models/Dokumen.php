<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dokumen extends Model
{
    public $timestamps = false;

    protected $table = 'dokumen';

    protected $primaryKey = 'id_dokumen';

    protected $fillable = [
        'id_pengajuan',
        'id_aset',
        'id_pengunggah',
        'jenis_dokumen',
        'nama_file',
        'path_file',
        'tanggal_unggah',
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
        return $this->belongsTo(User::class, 'id_pengunggah', 'id_pengguna');
    }

    public function beritaAcara()
    {
        return $this->hasOne(BeritaAcara::class, 'id_dokumen', 'id_dokumen');
    }
}
