<?php

namespace Database\Factories;

use App\Models\Peran;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        $unit = Unit::query()->firstOrCreate(
            ['nama_unit' => 'Unit Uji'],
            ['jenis_unit' => 'fakultas']
        );

        $subUnit = SubUnit::query()->firstOrCreate(
            ['id_unit' => $unit->id_unit, 'nama_sub_unit' => 'Sub Unit Uji'],
            ['jenis_sub_unit' => 'laboratorium']
        );

        $peran = Peran::query()->firstOrCreate(
            ['nama_peran' => 'Pegawai/Dosen'],
            ['deskripsi' => 'Peran untuk pengujian.']
        );

        return [
            'id_peran' => $peran->id_peran,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'nip' => fake()->unique()->numerify('##########'),
            'nama_lengkap' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'username' => fake()->unique()->userName(),
            'password_hash' => 'password',
            'is_aktif' => true,
            'remember_token' => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_aktif' => false,
        ]);
    }
}
