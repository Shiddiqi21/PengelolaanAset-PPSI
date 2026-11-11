<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemPerbaikan extends Model
{
    protected $table = 'item_perbaikan';
    protected $primaryKey = 'id_item_perbaikan';

    protected $fillable = [
        'id_pengajuan', 'id_aset', 'id_teknisi', 'id_vendor',
        'deskripsi_kerusakan', 'foto_kerusakan_path', 'hasil_pemeriksaan',
        'estimasi_biaya', 'perlu_vendor', 'harga_penawaran', 'status_perbaikan',
        'tanggal_mulai', 'tanggal_selesai', 'hasil_perbaikan', 'biaya_aktual',
    ];

    protected function casts(): array
    {
        return [
            'perlu_vendor' => 'boolean',
            'tanggal_mulai' => 'datetime',
            'tanggal_selesai' => 'datetime',
        ];
    }

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset', 'id_aset');
    }

    public function teknisi()
    {
        return $this->belongsTo(User::class, 'id_teknisi', 'id_pengguna');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'id_vendor', 'id_vendor');
    }
}
