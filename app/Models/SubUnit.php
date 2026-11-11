<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubUnit extends Model
{
    protected $table = 'sub_unit';
    protected $primaryKey = 'id_sub_unit';

    protected $fillable = ['id_unit', 'nama_sub_unit'];

    public function unit()
    {
        return $this->belongsTo(Unit::class, 'id_unit', 'id_unit');
    }

    public function pengguna()
    {
        return $this->hasMany(User::class, 'id_sub_unit', 'id_sub_unit');
    }
}
