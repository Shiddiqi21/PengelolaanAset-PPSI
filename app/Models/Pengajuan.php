<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengajuan extends Model
{
    public $timestamps = false;

    protected $table = 'pengajuan';

    protected $primaryKey = 'id_pengajuan';

    protected $fillable = [
        'id_pemohon',
        'nomor_pengajuan',
        'jenis_pengajuan',
        'tanggal_pengajuan',
        'keterangan',
        'status',
    ];

    protected function casts(): array
    {
        return ['tanggal_pengajuan' => 'datetime'];
    }

    /**
     * Cek apakah pengajuan berstatus draf yang merupakan hasil pengembalian untuk revisi.
     */
    public function getIsRevisiAttribute(): bool
    {
        if ($this->status !== 'draft') {
            return false;
        }

        if (! $this->relationLoaded('riwayatStatus')) {
            $this->load('riwayatStatus');
        }

        return $this->riwayatStatus->contains(function ($r) {
            $catatan = strtolower($r->catatan ?? '');

            return str_contains($catatan, 'dikembalikan')
                || str_contains($catatan, 'revisi')
                || str_contains($catatan, 'perbaikan');
        });
    }

    public function pemohon()
    {
        return $this->belongsTo(User::class, 'id_pemohon', 'id_pengguna');
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

    public function beritaAcara()
    {
        return $this->hasMany(BeritaAcara::class, 'id_pengajuan', 'id_pengajuan');
    }
}
