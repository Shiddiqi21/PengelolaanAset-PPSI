<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ruangan extends Model
{
    protected $table = 'ruangan';
    protected $primaryKey = 'id_ruangan';

    protected $fillable = ['id_gedung', 'id_unit', 'id_sub_unit', 'lantai', 'nomor_ruangan', 'nama_ruangan'];

    public function gedung()
    {
        return $this->belongsTo(Gedung::class, 'id_gedung', 'id_gedung');
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class, 'id_unit', 'id_unit');
    }

    public function subUnit()
    {
        return $this->belongsTo(SubUnit::class, 'id_sub_unit', 'id_sub_unit');
    }

    public function aset()
    {
        return $this->hasMany(Aset::class, 'id_ruangan', 'id_ruangan');
    }
}
