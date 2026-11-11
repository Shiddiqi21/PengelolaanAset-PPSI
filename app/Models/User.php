<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Model Pengguna (User) — mapped to table 'pengguna'.
 * Digunakan oleh Laravel Auth / Breeze.
 */
class User extends Authenticatable
{
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
        'password',
        'is_aktif',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_aktif' => 'boolean',
        ];
    }

    // ─── Relasi ──────────────────────────────────────────────

    public function peran()
    {
        return $this->belongsTo(Peran::class, 'id_peran', 'id_peran');
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
        return $this->hasMany(Pengajuan::class, 'id_pengguna', 'id_pengguna');
    }

    public function logAktivitas()
    {
        return $this->hasMany(LogAktivitas::class, 'id_pengguna', 'id_pengguna');
    }

    // ─── Helper role ─────────────────────────────────────────

    public function isOperator(): bool
    {
        return $this->peran?->nama_peran === 'Operator Aset Fakultas';
    }

    public function isPimpinan(): bool
    {
        return $this->peran?->nama_peran === 'Pimpinan';
    }

    public function isKepalaUnit(): bool
    {
        return $this->peran?->nama_peran === 'Kepala Departemen';
    }

    public function isPegawai(): bool
    {
        return $this->peran?->nama_peran === 'Pegawai/Dosen';
    }
}
