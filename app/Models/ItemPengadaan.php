<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemPengadaan extends Model
{
    protected $table = 'item_pengadaan';
    protected $primaryKey = 'id_item_pengadaan';

    protected $fillable = [
        'id_pengajuan', 'id_kategori', 'nama_barang',
        'spesifikasi', 'jumlah', 'estimasi_anggaran',
    ];

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function kategori()
    {
        return $this->belongsTo(KategoriAset::class, 'id_kategori', 'id_kategori');
    }

    public function itemPenerimaan()
    {
        return $this->hasMany(ItemPenerimaan::class, 'id_item_pengadaan', 'id_item_pengadaan');
    }
}
