<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemPenerimaan extends Model
{
    public $timestamps = false;

    protected $table = 'item_penerimaan';
    protected $primaryKey = 'id_item_penerimaan';

    protected $fillable = [
        'id_penerimaan', 'id_item_pengadaan', 'jumlah_diterima',
        'spesifikasi_diterima', 'hasil_verifikasi', 'catatan_kekurangan',
    ];

    public function penerimaan()
    {
        return $this->belongsTo(PenerimaanAset::class, 'id_penerimaan', 'id_penerimaan');
    }

    public function itemPengadaan()
    {
        return $this->belongsTo(ItemPengadaan::class, 'id_item_pengadaan', 'id_item_pengadaan');
    }

    public function aset()
    {
        return $this->hasMany(Aset::class, 'id_item_penerimaan', 'id_item_penerimaan');
    }
}
