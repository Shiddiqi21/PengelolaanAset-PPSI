<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peran extends Model
{
    public $timestamps = false;

    protected $table = 'peran';
    protected $primaryKey = 'id_peran';

    protected $fillable = ['nama_peran', 'deskripsi'];

    /**
     * Akun yang menjadikan peran ini sebagai peran utama.
     */
    public function pengguna()
    {
        return $this->hasMany(User::class, 'id_peran', 'id_peran');
    }

    /**
     * Semua akun yang memiliki peran ini (utama maupun tambahan).
     */
    public function semuaPengguna()
    {
        return $this->belongsToMany(User::class, 'pengguna_peran', 'id_peran', 'id_pengguna');
    }
}
