<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Hash tiruan agar waktu respons tetap mirip saat username tidak ditemukan.
     */
    private const HASH_TIRUAN = '$2y$12$JbnCPkql/7FfmhlhoT20UulYoNcF0sOp8nrzhIA8AzE3pvwl4Vp4C';

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:50'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Urutan pemeriksaan: kata sandi dulu, status akun sesudahnya. Dengan begitu
     * status "nonaktif" tidak bisa diketahui orang yang tidak memegang kata sandi.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $username = (string) $this->string('username');
        $password = (string) $this->string('password');
        $user = User::query()->where('username', $username)->first();

        $passwordBenar = Hash::check($password, $user?->password_hash ?? self::HASH_TIRUAN) && $user !== null;

        if (! $passwordBenar) {
            RateLimiter::hit($this->throttleKey());
            ActivityLogger::record(
                'login_gagal',
                'pengguna',
                $user?->id_pengguna,
                'Username atau kata sandi salah: '.$username,
                $user?->id_pengguna
            );

            throw ValidationException::withMessages([
                'username' => 'Username atau kata sandi salah.',
            ]);
        }

        if (! $user->is_aktif) {
            RateLimiter::hit($this->throttleKey());
            ActivityLogger::record(
                'login_gagal',
                'pengguna',
                $user->id_pengguna,
                'Akun nonaktif: '.$username,
                $user->id_pengguna
            );

            throw ValidationException::withMessages([
                'username' => 'Akun ini nonaktif. Hubungi operator aset fakultas.',
            ]);
        }

        Auth::login($user, $this->boolean('remember'));

        RateLimiter::clear($this->throttleKey());

        ActivityLogger::record('login', 'pengguna', $user->id_pengguna, null, $user->id_pengguna);
    }

    /**
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'username' => 'Terlalu banyak percobaan masuk. Coba lagi dalam '.$seconds.' detik.',
        ]);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('username')).'|'.$this->ip());
    }
}
