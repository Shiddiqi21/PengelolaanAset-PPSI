<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemMutasi extends Model
{
    protected $table = 'item_mutasi';
    protected $primaryKey = 'id_item_mutasi';

    protected $fillable = [
        'id_pengajuan', 'id_aset', 'id_ruangan_tujuan', 'id_pengguna_pj',
    ];

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset', 'id_aset');
    }

    public function ruanganTujuan()
    {
        return $this->belongsTo(Ruangan::class, 'id_ruangan_tujuan', 'id_ruangan');
    }

    public function penanggungJawabBaru()
    {
        return $this->belongsTo(User::class, 'id_pengguna_pj', 'id_pengguna');
    }
}
