<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BeritaAcaraItem extends Model
{
    public $timestamps = false;

    protected $table = 'berita_acara_item';

    protected $primaryKey = 'id_item_bast';

    protected $fillable = [
        'id_bast',
        'id_aset',
        'kode_aset',
        'nama_barang',
        'spesifikasi',
        'nomor_seri',
        'jumlah',
        'satuan',
        'kondisi',
        'keterangan',
    ];

    public function beritaAcara()
    {
        return $this->belongsTo(BeritaAcara::class, 'id_bast', 'id_bast');
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset', 'id_aset');
    }
}
