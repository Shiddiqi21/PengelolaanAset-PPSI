<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BeritaAcara extends Model
{
    public $timestamps = false;

    protected $table = 'berita_acara';

    protected $primaryKey = 'id_bast';

    protected $fillable = [
        'id_pengajuan',
        'id_penerimaan',
        'id_dokumen',
        'nomor_bast',
        'jenis_bast',
        'tanggal_bast',
        'pihak_pertama',
        'pihak_kedua',
    ];

    protected function casts(): array
    {
        return ['tanggal_bast' => 'date'];
    }

    public function pengajuan()
    {
        return $this->belongsTo(Pengajuan::class, 'id_pengajuan', 'id_pengajuan');
    }

    public function penerimaan()
    {
        return $this->belongsTo(PenerimaanAset::class, 'id_penerimaan', 'id_penerimaan');
    }

    public function dokumen()
    {
        return $this->belongsTo(Dokumen::class, 'id_dokumen', 'id_dokumen');
    }
}
