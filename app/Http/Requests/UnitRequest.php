<?php

namespace App\Http\Requests;

use App\Models\Unit;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
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
        /** @var Unit|null $unit */
        $unit = $this->route('unit');

        return [
            'nama_unit' => [
                'required',
                'string',
                'max:100',
                Rule::unique('unit', 'nama_unit')->ignore($unit?->id_unit, 'id_unit'),
            ],
            'jenis_unit' => ['required', 'string', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'nama_unit' => 'nama unit',
            'jenis_unit' => 'jenis unit',
        ];
    }
}
