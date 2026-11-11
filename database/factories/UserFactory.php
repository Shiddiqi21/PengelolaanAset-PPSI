<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Peran;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    protected static ?string $password;

    public function definition(): array
    {
        return [
            'id_peran'     => Peran::inRandomOrder()->first()?->id_peran ?? 1,
            'nip'          => fake()->unique()->numerify('##########'),
            'nama_lengkap' => fake()->name(),
            'email'        => fake()->unique()->safeEmail(),
            'username'     => fake()->unique()->userName(),
            'password'     => static::$password ??= Hash::make('password'),
            'is_aktif'     => true,
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
