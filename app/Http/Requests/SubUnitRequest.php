<?php

namespace App\Http\Requests;

use App\Models\SubUnit;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubUnitRequest extends FormRequest
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
        /** @var SubUnit|null $subUnit */
        $subUnit = $this->route('subUnit');

        return [
            'id_unit' => ['required', 'integer', Rule::exists('unit', 'id_unit')],
            'nama_sub_unit' => [
                'required',
                'string',
                'max:100',
                Rule::unique('sub_unit', 'nama_sub_unit')
                    ->where(fn ($query) => $query->where('id_unit', $this->input('id_unit')))
                    ->ignore($subUnit?->id_sub_unit, 'id_sub_unit'),
            ],
            'jenis_sub_unit' => ['required', 'string', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'id_unit' => 'unit induk',
            'nama_sub_unit' => 'nama sub-unit',
            'jenis_sub_unit' => 'jenis sub-unit',
        ];
    }
}
