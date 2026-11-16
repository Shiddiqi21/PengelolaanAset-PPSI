<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAsetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('operator') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $harga = $this->input('harga_perolehan');
        if (is_string($harga)) {
            $bersih = preg_replace('/[^0-9]/', '', $harga);
            $this->merge([
                'harga_perolehan' => $bersih !== '' ? $bersih : null,
            ]);
        }

        if (! $this->filled('tahun_perolehan') && $this->filled('tanggal_perolehan')) {
            if (preg_match('/(19\d{2}|20\d{2})/', (string) $this->input('tanggal_perolehan'), $cocok)) {
                $this->merge(['tahun_perolehan' => (int) $cocok[1]]);
            } else {
                $this->merge(['tahun_perolehan' => (int) now()->year]);
            }
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'kode_aset' => ['nullable', 'string', 'max:50', Rule::unique('aset', 'kode_aset')],
            'id_kategori' => ['required', 'integer', Rule::exists('kategori_aset', 'id_kategori')],
            'nama_barang' => ['required', 'string', 'max:150'],
            'merek_tipe' => ['required', 'string', 'max:100'],
            'nomor_seri' => ['required', 'string', 'max:100'],
            'spesifikasi' => ['nullable', 'string', 'max:2000'],
            'tanggal_perolehan' => ['nullable', 'string', 'max:100'],
            'sumber_dana' => ['nullable', 'string', 'max:100'],
            'nomor_dokumen_sumber' => ['nullable', 'string', 'max:100'],
            'berkas_perolehan' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'foto' => ['nullable', 'image', 'max:4096'],
            'tahun_perolehan' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'harga_perolehan' => ['required', 'numeric', 'min:0', 'max:9999999999999.99'],
            'kondisi' => ['required', Rule::in(['baik', 'kurang_baik', 'rusak_berat'])],
            'status_aset' => ['nullable', Rule::in(['aktif', 'dalam_perbaikan', 'dihapus', 'dimutasi'])],
            'id_ruangan' => ['required', 'integer', Rule::exists('ruangan', 'id_ruangan')],
            'id_pengguna_pj' => ['required', 'integer', Rule::exists('pengguna', 'id_pengguna')],
            'keterangan_penempatan' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'kode_aset.unique' => 'Kode inventaris aset sudah terdaftar. Gunakan kode unik.',
            'nama_barang.required' => 'Nama aset wajib diisi.',
            'id_kategori.required' => 'Kategori aset wajib dipilih.',
            'merek_tipe.required' => 'Merek / tipe wajib diisi.',
            'nomor_seri.required' => 'Nomor seri wajib diisi sesuai pemeriksaan fisik.',
            'harga_perolehan.required' => 'Nilai perolehan wajib diisi.',
            'id_ruangan.required' => 'Lokasi ruangan wajib dipilih.',
            'id_pengguna_pj.required' => 'Penanggung jawab aset wajib dipilih.',
        ];
    }
}
