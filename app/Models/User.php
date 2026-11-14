<?php

namespace App\Models;

use App\Support\PeranNama;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    public $timestamps = true;

    use HasFactory, Notifiable;

    protected $table = 'pengguna';

    protected $primaryKey = 'id_pengguna';

    protected $fillable = [
        'id_peran',
        'id_unit',
        'id_sub_unit',
        'nip',
        'nama_lengkap',
        'email',
        'username',
        'password_hash',
        'is_aktif',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password_hash' => 'hashed',
            'is_aktif' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Peran utama selalu ikut tercatat di daftar semua peran, termasuk untuk akun
        // yang dibuat lewat factory atau seeder yang hanya mengisi id_peran.
        static::saved(function (self $user) {
            if ($user->id_peran) {
                $user->semuaPeran()->syncWithoutDetaching([$user->id_peran]);
            }
        });
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function peran()
    {
        return $this->belongsTo(Peran::class, 'id_peran', 'id_peran');
    }

    /**
     * Semua peran akun ini (termasuk peran utama). Tabel pivot: pengguna_peran.
     */
    public function semuaPeran()
    {
        return $this->belongsToMany(Peran::class, 'pengguna_peran', 'id_pengguna', 'id_peran');
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class, 'id_unit', 'id_unit');
    }

    public function subUnit()
    {
        return $this->belongsTo(SubUnit::class, 'id_sub_unit', 'id_sub_unit');
    }

    public function pengajuan()
    {
        return $this->hasMany(Pengajuan::class, 'id_pemohon', 'id_pengguna');
    }

    public function logAktivitas()
    {
        return $this->hasMany(LogAktivitas::class, 'id_pengguna', 'id_pengguna');
    }

    public function riwayatStatus()
    {
        return $this->hasMany(RiwayatStatusPengajuan::class, 'id_pengguna', 'id_pengguna');
    }

    public function penerimaanDiverifikasi()
    {
        return $this->hasMany(PenerimaanAset::class, 'id_verifikator', 'id_pengguna');
    }

    public function tugasPerbaikan()
    {
        return $this->hasMany(ItemPerbaikan::class, 'id_teknisi', 'id_pengguna');
    }

    public function pemeliharaan()
    {
        return $this->hasMany(PemeliharaanAset::class, 'id_pelaksana', 'id_pengguna');
    }

    public function mutasiSebagaiPj()
    {
        return $this->hasMany(ItemMutasi::class, 'id_pengguna_pj', 'id_pengguna');
    }

    public function penempatan()
    {
        return $this->hasMany(PenempatanAset::class, 'id_pengguna_pj', 'id_pengguna');
    }

    public function dokumenDiunggah()
    {
        return $this->hasMany(Dokumen::class, 'id_pengunggah', 'id_pengguna');
    }

    /**
     * Benar bila akun ini operator aktif satu-satunya. Dipakai agar sistem tidak
     * kehilangan operator terakhir (dinonaktifkan atau diganti perannya).
     */
    public function adalahOperatorAktifTerakhir(): bool
    {
        if (! $this->is_aktif || ! $this->isOperator()) {
            return false;
        }

        return ! static::query()
            ->where('is_aktif', true)
            ->where('id_pengguna', '!=', $this->id_pengguna)
            ->whereHas('semuaPeran', fn ($query) => $query->where('nama_peran', PeranNama::OPERATOR))
            ->exists();
    }

    public function hasVerifiedEmail(): bool
    {
        return true;
    }

    /**
     * Nama semua peran akun, diurutkan: peran utama lebih dulu, lalu sisanya menurut abjad.
     *
     * @return list<string>
     */
    public function namaSemuaPeran(): array
    {
        $utama = $this->peran?->nama_peran;

        $lain = $this->semuaPeran
            ->pluck('nama_peran')
            ->reject(fn ($nama) => $nama === $utama)
            ->sort()
            ->values()
            ->all();

        return array_values(array_filter([$utama, ...$lain]));
    }

    /**
     * Benar bila akun memiliki peran tersebut (peran utama atau tambahan).
     * Boleh diberi slug (operator, pemohon, ...) atau nama peran lengkap.
     */
    public function hasRole(string $slugOrName): bool
    {
        $nama = PeranNama::SLUG[$slugOrName] ?? $slugOrName;

        return in_array($nama, $this->namaSemuaPeran(), true);
    }

    /**
     * Benar bila akun memiliki salah satu dari peran yang diberikan.
     */
    public function hasAnyRole(string ...$slugOrNames): bool
    {
        foreach ($slugOrNames as $peran) {
            if ($this->hasRole($peran)) {
                return true;
            }
        }

        return false;
    }

    public function isOperator(): bool
    {
        return $this->hasRole('operator');
    }

    public function isPimpinan(): bool
    {
        return $this->hasRole('pimpinan');
    }

    public function isKepalaKantor(): bool
    {
        return $this->hasRole('kepala-kantor');
    }

    public function isPemohon(): bool
    {
        return $this->hasRole('pemohon');
    }

    public function isPegawai(): bool
    {
        return $this->hasRole('pegawai');
    }

    public function isTeknisi(): bool
    {
        return $this->hasRole('teknisi');
    }
}
