<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProsesMutasiRequest extends FormRequest
{
    /**
     * Hanya operator yang dapat memproses dan mengeksekusi mutasi aset.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('operator') ?? false;
    }

    /**
     * Aturan validasi eksekusi mutasi.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'tanggal_eksekusi' => ['required', 'date'],
            'catatan_mutasi' => ['nullable', 'string', 'max:1000'],
            'nomor_disposisi' => ['nullable', 'string', 'max:100'],
            'items' => ['nullable', 'array'],
            'items.*.id_item_mutasi' => ['required_with:items', 'integer', 'exists:item_mutasi,id_item_mutasi'],
            'items.*.id_ruangan_tujuan' => ['nullable', 'integer', 'exists:ruangan,id_ruangan'],
            'items.*.id_pengguna_pj_tujuan' => ['nullable', 'integer', 'exists:pengguna,id_pengguna'],
        ];
    }

    /**
     * Pesan validasi dalam Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tanggal_eksekusi.required' => 'Tanggal efektif eksekusi mutasi wajib diisi.',
            'tanggal_eksekusi.date' => 'Format tanggal eksekusi tidak valid.',
            'catatan_mutasi.max' => 'Catatan mutasi maksimal 1000 karakter.',
            'nomor_disposisi.max' => 'Nomor disposisi maksimal 100 karakter.',
            'items.*.id_ruangan_tujuan.exists' => 'Ruangan tujuan yang dipilih tidak ditemukan dalam sistem.',
            'items.*.id_pengguna_pj_tujuan.exists' => 'Penanggung jawab tujuan yang dipilih tidak ditemukan dalam sistem.',
        ];
    }
}
