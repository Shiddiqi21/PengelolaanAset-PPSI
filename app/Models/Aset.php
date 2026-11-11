<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aset extends Model
{
    protected $table = 'aset';
    protected $primaryKey = 'id_aset';

    protected $fillable = [
        'id_kategori', 'id_item_penerimaan', 'kode_aset', 'nama_barang',
        'merek_tipe', 'nomor_seri', 'spesifikasi', 'foto_path',
        'tahun_perolehan', 'harga_perolehan', 'kondisi', 'status_aset',
        'id_ruangan', 'id_pengguna_pj',
    ];

    protected function casts(): array
    {
        return [
            'harga_perolehan' => 'decimal:2',
            'tahun_perolehan' => 'integer',
        ];
    }

    public function kategori()
    {
        return $this->belongsTo(KategoriAset::class, 'id_kategori', 'id_kategori');
    }

    public function ruangan()
    {
        return $this->belongsTo(Ruangan::class, 'id_ruangan', 'id_ruangan');
    }

    public function penanggungjawab()
    {
        return $this->belongsTo(User::class, 'id_pengguna_pj', 'id_pengguna');
    }

    public function itemPenerimaan()
    {
        return $this->belongsTo(ItemPenerimaan::class, 'id_item_penerimaan', 'id_item_penerimaan');
    }

    public function perbaikan()
    {
        return $this->hasMany(ItemPerbaikan::class, 'id_aset', 'id_aset');
    }

    public function pemeliharaan()
    {
        return $this->hasMany(PemeliharaanAset::class, 'id_aset', 'id_aset');
    }

    public function mutasi()
    {
        return $this->hasMany(ItemMutasi::class, 'id_aset', 'id_aset');
    }

    public function penghapusan()
    {
        return $this->hasMany(ItemPenghapusan::class, 'id_aset', 'id_aset');
    }

    public function dokumen()
    {
        return $this->hasMany(Dokumen::class, 'id_aset', 'id_aset');
    }
}
