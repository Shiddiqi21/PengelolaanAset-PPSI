<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemMutasi extends Model
{
    public $timestamps = false;

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

    public function penanggungJawabTujuan()
    {
        return $this->belongsTo(User::class, 'id_pengguna_pj', 'id_pengguna');
    }

    public function penempatan()
    {
        return $this->hasOne(PenempatanAset::class, 'id_item_mutasi', 'id_item_mutasi');
    }

    public function ruanganAsal()
    {
        return $this->hasOneThrough(
            Ruangan::class,
            PenempatanAset::class,
            'id_aset',
            'id_ruangan',
            'id_aset',
            'id_ruangan'
        )->whereNotNull('penempatan_aset.tanggal_selesai')->latest('penempatan_aset.id_penempatan');
    }

    public function penanggungJawabAsal()
    {
        return $this->hasOneThrough(
            User::class,
            PenempatanAset::class,
            'id_aset',
            'id_pengguna',
            'id_aset',
            'id_pengguna_pj'
        )->whereNotNull('penempatan_aset.tanggal_selesai')->latest('penempatan_aset.id_penempatan');
    }
}
