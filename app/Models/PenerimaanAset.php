<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PenerimaanAset extends Model
{
    public $timestamps = false;

    protected $table = 'penerimaan_aset';
    protected $primaryKey = 'id_penerimaan';

    protected $fillable = [
        'id_pengajuan', 'id_vendor', 'id_verifikator',
        'tanggal_terima', 'nomor_nota', 'catatan',
    ];

    protected function casts(): array
    {
        return ['tanggal_terima' => 'date'];
    }

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'id_vendor', 'id_vendor');
    }

    public function verifikator()
    {
        return $this->belongsTo(User::class, 'id_verifikator', 'id_pengguna');
    }

    public function itemPenerimaan()
    {
        return $this->hasMany(ItemPenerimaan::class, 'id_penerimaan', 'id_penerimaan');
    }

    public function beritaAcara()
    {
        return $this->hasMany(BeritaAcara::class, 'id_penerimaan', 'id_penerimaan');
    }
}
