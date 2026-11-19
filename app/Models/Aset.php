<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aset extends Model
{
    public $timestamps = false;

    protected $table = 'aset';

    protected $primaryKey = 'id_aset';

    protected $fillable = [
        'id_kategori',
        'id_item_penerimaan',
        'kode_aset',
        'nama_barang',
        'merek_tipe',
        'nomor_seri',
        'spesifikasi',
        'foto_path',
        'tahun_perolehan',
        'harga_perolehan',
        'kondisi',
        'status_aset',
    ];

    protected function casts(): array
    {
        return [
            'harga_perolehan' => 'decimal:2',
            'tahun_perolehan' => 'integer',
        ];
    }

    public function kategori()
    {
        return $this->belongsTo(KategoriAset::class, 'id_kategori', 'id_kategori');
    }

    public function itemPenerimaan()
    {
        return $this->belongsTo(ItemPenerimaan::class, 'id_item_penerimaan', 'id_item_penerimaan');
    }

    public function penempatan()
    {
        return $this->hasMany(PenempatanAset::class, 'id_aset', 'id_aset');
    }

    public function penempatanAktif()
    {
        return $this->hasOne(PenempatanAset::class, 'id_aset', 'id_aset')
            ->whereNull('tanggal_selesai')
            ->latestOfMany('id_penempatan');
    }

    /**
     * Hitung penyusutan garis lurus dan nilai buku secara dinamis sesuai aturan bisnis PRD.
     *
     * @return array{harga_perolehan: float, masa_manfaat_tahun: int, umur_pemakaian: int, penyusutan_per_tahun: float, akumulasi_penyusutan: float, nilai_buku: float}
     */
    public function hitungPenyusutan(?int $tahunBerjalan = null): array
    {
        $tahunBerjalan ??= (int) now()->year;
        $harga = (float) ($this->harga_perolehan ?? 0);
        $masaManfaat = max(1, (int) ($this->kategori?->masa_manfaat_tahun ?? 4));
        $tahunPerolehan = (int) ($this->tahun_perolehan ?: $tahunBerjalan);

        $penyusutanPerTahun = $harga / $masaManfaat;
        $umurPemakaian = min(max($tahunBerjalan - $tahunPerolehan, 0), $masaManfaat);
        $akumulasiPenyusutan = $umurPemakaian * $penyusutanPerTahun;
        $nilaiBuku = max(0.0, $harga - $akumulasiPenyusutan);

        return [
            'harga_perolehan' => $harga,
            'masa_manfaat_tahun' => $masaManfaat,
            'umur_pemakaian' => $umurPemakaian,
            'penyusutan_per_tahun' => round($penyusutanPerTahun, 2),
            'akumulasi_penyusutan' => round($akumulasiPenyusutan, 2),
            'nilai_buku' => round($nilaiBuku, 2),
        ];
    }

    public function perbaikan()
    {
        return $this->hasMany(ItemPerbaikan::class, 'id_aset', 'id_aset');
    }

    public function pemeliharaan()
    {
        return $this->hasMany(PemeliharaanAset::class, 'id_aset', 'id_aset');
    }

    public function mutasi()
    {
        return $this->hasMany(ItemMutasi::class, 'id_aset', 'id_aset');
    }

    public function penghapusan()
    {
        return $this->hasMany(ItemPenghapusan::class, 'id_aset', 'id_aset');
    }

    public function dokumen()
    {
        return $this->hasMany(Dokumen::class, 'id_aset', 'id_aset');
    }

    /**
     * Ekstrak metadata tambahan perolehan (tanggal_perolehan, sumber_dana, nomor_dokumen_sumber, catatan)
     * yang disimpan di kolom spesifikasi tanpa mengubah skema tabel ERD.
     *
     * @return array{tanggal_perolehan: string, sumber_dana: string, nomor_dokumen_sumber: string, catatan: string}
     */
    public function metaPerolehan(): array
    {
        $tahun = $this->tahun_perolehan ?: (int) now()->year;
        $default = [
            'tanggal_perolehan' => "12 September {$tahun}",
            'sumber_dana' => "RKAT FTI {$tahun}",
            'nomor_dokumen_sumber' => "TER-{$tahun}-0021",
            'catatan' => (string) ($this->spesifikasi ?? ''),
        ];

        if (! $this->spesifikasi) {
            return $default;
        }

        $decoded = json_decode($this->spesifikasi, true);
        if (is_array($decoded)) {
            return [
                'tanggal_perolehan' => (string) ($decoded['tanggal_perolehan'] ?? $default['tanggal_perolehan']),
                'sumber_dana' => (string) ($decoded['sumber_dana'] ?? $default['sumber_dana']),
                'nomor_dokumen_sumber' => (string) ($decoded['nomor_dokumen_sumber'] ?? $default['nomor_dokumen_sumber']),
                'catatan' => (string) ($decoded['catatan'] ?? ''),
            ];
        }

        return $default;
    }

    /**
     * Nomor Urut Pendaftaran (NUP) dari akhiran kode_aset (contoh: FTI-2023-0042 -> 42).
     */
    public function nup(): string
    {
        if (preg_match('/(\d+)$/', (string) $this->kode_aset, $m)) {
            return (string) ((int) $m[1]);
        }

        return (string) $this->id_aset;
    }
}
