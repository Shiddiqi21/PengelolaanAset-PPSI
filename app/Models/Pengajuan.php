<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengajuan extends Model
{
    protected $table = 'pengajuan';
    protected $primaryKey = 'id_pengajuan';

    protected $fillable = [
        'id_pengguna', 'tipe_pengajuan', 'tanggal_pengajuan',
        'status', 'keterangan', 'nomor_pengajuan',
    ];

    protected function casts(): array
    {
        return ['tanggal_pengajuan' => 'date'];
    }

    public function pengguna()
    {
        return $this->belongsTo(User::class, 'id_pengguna', 'id_pengguna');
    }

    public function riwayatStatus()
    {
        return $this->hasMany(RiwayatStatusPengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function itemPengadaan()
    {
        return $this->hasMany(ItemPengadaan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function penerimaanAset()
    {
        return $this->hasOne(PenerimaanAset::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function itemPerbaikan()
    {
        return $this->hasMany(ItemPerbaikan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function itemMutasi()
    {
        return $this->hasMany(ItemMutasi::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function itemPenghapusan()
    {
        return $this->hasMany(ItemPenghapusan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function dokumen()
    {
        return $this->hasMany(Dokumen::class, 'id_pengajuan', 'id_pengajuan');
    }
}
