<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KategoriAset extends Model
{
    protected $table = 'kategori_aset';
    protected $primaryKey = 'id_kategori';

    protected $fillable = ['kode_kategori', 'nama_kategori', 'masa_manfaat_tahun'];

    public function aset()
    {
        return $this->hasMany(Aset::class, 'id_kategori', 'id_kategori');
    }

    public function itemPengadaan()
    {
        return $this->hasMany(ItemPengadaan::class, 'id_kategori', 'id_kategori');
    }
}
