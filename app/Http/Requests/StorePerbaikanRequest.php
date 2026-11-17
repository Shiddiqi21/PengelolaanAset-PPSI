<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePerbaikanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->hasRole('pemohon');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'id_aset' => ['required', 'integer', 'exists:aset,id_aset'],
            'tingkat_kerusakan' => ['nullable', 'string', 'in:kurang_baik,rusak_berat'],
            'deskripsi_kerusakan' => ['required', 'string', 'max:1500'],
            'lokasi_fisik' => ['nullable', 'string', 'max:255'],
            'keterangan' => ['nullable', 'string', 'max:500'],
            'foto_kerusakan' => ['nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'id_aset.required' => 'Pilih salah satu aset yang mengalami kerusakan.',
            'id_aset.integer' => 'Pilihan aset tidak valid.',
            'id_aset.exists' => 'Aset yang dipilih tidak ditemukan dalam sistem.',
            'tingkat_kerusakan.in' => 'Tingkat kerusakan yang dipilih tidak valid.',
            'deskripsi_kerusakan.required' => 'Deskripsi kerusakan wajib diisi.',
            'deskripsi_kerusakan.max' => 'Deskripsi kerusakan maksimal 1500 karakter.',
            'lokasi_fisik.max' => 'Lokasi fisik aset maksimal 255 karakter.',
            'keterangan.max' => 'Catatan tambahan maksimal 500 karakter.',
            'foto_kerusakan.file' => 'Berkas bukti kerusakan tidak valid.',
            'foto_kerusakan.image' => 'Berkas bukti kerusakan harus berupa gambar.',
            'foto_kerusakan.mimes' => 'Format foto harus berupa JPG, JPEG, PNG, atau WEBP.',
            'foto_kerusakan.max' => 'Ukuran foto maksimal 2 MB.',
        ];
    }
}
