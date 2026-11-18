<?php

namespace App\Http\Requests;

use App\Support\PeranNama;
use Illuminate\Foundation\Http\FormRequest;

class ArsipkanBastRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && ($user->hasRole(PeranNama::OPERATOR) || $user->hasRole('admin'));
    }

    public function rules(): array
    {
        return [
            'file_bast' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'catatan_arsip' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'file_bast.required' => 'Unggah berkas scan BAST yang telah ditandatangani dan bermaterai.',
            'file_bast.file' => 'Berkas BAST harus berupa file dokumen atau gambar yang valid.',
            'file_bast.mimes' => 'Format berkas BAST harus PDF, JPG, JPEG, atau PNG.',
            'file_bast.max' => 'Ukuran berkas BAST maksimal 10MB.',
        ];
    }
}
