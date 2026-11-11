<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    protected $table = 'vendor';
    protected $primaryKey = 'id_vendor';

    protected $fillable = ['nama_vendor', 'alamat', 'kontak'];

    public function penerimaanAset()
    {
        return $this->hasMany(PenerimaanAset::class, 'id_vendor', 'id_vendor');
    }

    public function perbaikan()
    {
        return $this->hasMany(ItemPerbaikan::class, 'id_vendor', 'id_vendor');
    }

    public function pemeliharaan()
    {
        return $this->hasMany(PemeliharaanAset::class, 'id_vendor', 'id_vendor');
    }
}
