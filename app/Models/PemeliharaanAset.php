<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PemeliharaanAset extends Model
{
    protected $table = 'pemeliharaan_aset';
    protected $primaryKey = 'id_pemeliharaan';

    protected $fillable = [
        'id_aset', 'id_pelaksana', 'id_vendor', 'jenis_pemeliharaan',
        'tanggal_jadwal', 'status', 'tanggal_pelaksanaan', 'uraian', 'biaya',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_jadwal' => 'date',
            'tanggal_pelaksanaan' => 'date',
        ];
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset', 'id_aset');
    }

    public function pelaksana()
    {
        return $this->belongsTo(User::class, 'id_pelaksana', 'id_pengguna');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'id_vendor', 'id_vendor');
    }
}
