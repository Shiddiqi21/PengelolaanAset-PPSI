<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PenempatanAset extends Model
{
    public $timestamps = false;

    protected $table = 'penempatan_aset';

    protected $primaryKey = 'id_penempatan';

    protected $fillable = [
        'id_aset',
        'id_ruangan',
        'id_pengguna_pj',
        'id_item_mutasi',
        'tanggal_mulai',
        'tanggal_selesai',
        'keterangan',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'datetime',
            'tanggal_selesai' => 'datetime',
        ];
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset', 'id_aset');
    }

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class, 'id_ruangan', 'id_ruangan');
    }

    public function penanggungJawab()
    {
        return $this->belongsTo(User::class, 'id_pengguna_pj', 'id_pengguna');
    }

    public function itemMutasi()
    {
        return $this->belongsTo(ItemMutasi::class, 'id_item_mutasi', 'id_item_mutasi');
    }
}
