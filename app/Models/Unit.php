<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    protected $table = 'unit';
    protected $primaryKey = 'id_unit';

    protected $fillable = ['nama_unit', 'jenis_unit'];

    public function subUnit()
    {
        return $this->hasMany(SubUnit::class, 'id_unit', 'id_unit');
    }

    public function pengguna()
    {
        return $this->hasMany(User::class, 'id_unit', 'id_unit');
    }

    public function ruangan()
    {
        return $this->hasMany(Ruangan::class, 'id_unit', 'id_unit');
    }
}
