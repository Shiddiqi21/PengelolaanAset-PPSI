<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;

class StorePenggunaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', User::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Satu akun boleh memiliki beberapa peran; id_peran adalah peran utama dan harus termasuk di dalamnya.
            'peran' => ['required', 'array', 'min:1'],
            'peran.*' => ['integer', 'distinct', Rule::exists('peran', 'id_peran')],
            'id_peran' => ['required', 'integer', Rule::in(array_map('strval', (array) $this->input('peran', [])))],
            'id_unit' => ['required', 'integer', Rule::exists('unit', 'id_unit')],
            'id_sub_unit' => [
                'required',
                'integer',
                Rule::exists('sub_unit', 'id_sub_unit')->where(
                    fn ($query) => $query->where('id_unit', $this->input('id_unit'))
                ),
            ],
            'nip' => ['nullable', 'string', 'max:30', Rule::unique('pengguna', 'nip')],
            'nama_lengkap' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:100', Rule::unique('pengguna', 'email')],
            'username' => ['required', 'string', 'max:50', Rule::unique('pengguna', 'username')],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'id_peran.in' => 'Peran utama harus salah satu dari peran yang dipilih.',
            'peran.required' => 'Pilih minimal satu peran.',
            'peran.min' => 'Pilih minimal satu peran.',
        ];
    }
}
