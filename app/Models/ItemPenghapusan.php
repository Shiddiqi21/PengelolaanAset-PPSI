<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemPenghapusan extends Model
{
    public $timestamps = false;

    protected $table = 'item_penghapusan';
    protected $primaryKey = 'id_item_penghapusan';

    protected $fillable = [
        'id_pengajuan', 'id_aset', 'jalur_penghapusan',
        'catatan_tim_penilai', 'pihak_penerima',
        'nilai_penjualan', 'tanggal_penghapusan',
    ];

    protected function casts(): array
    {
        return ['tanggal_penghapusan' => 'date'];
    }

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function aset()
    {
        return $this->belongsTo(Aset::class, 'id_aset', 'id_aset');
    }
}
