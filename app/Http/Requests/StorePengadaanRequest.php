<?php

namespace App\Http\Requests;

use App\Models\Pengajuan;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePengadaanRequest extends FormRequest
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
        $pengajuan = $this->route('pengajuan');
        $isUpdate = $pengajuan instanceof Pengajuan || $this->routeIs('pemohon.pengajuan.update');
        $isDiajukan = $this->input('aksi') === 'diajukan';

        return [
            'aksi' => ['required', 'string', 'in:draft,diajukan'],
            'perihal' => ['required', 'string', 'max:200'],
            'sumber_dana' => ['required', 'string', 'max:100'],
            'id_ruangan' => ['nullable', 'integer', 'exists:ruangan,id_ruangan'],
            'alasan' => ['required', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id_kategori' => ['required', 'integer', 'exists:kategori_aset,id_kategori'],
            'items.*.nama_barang' => ['required', 'string', 'max:150'],
            'items.*.spesifikasi' => ['required', 'string'],
            'items.*.jumlah' => ['required', 'integer', 'min:1'],
            'items.*.harga_satuan' => ['required', 'numeric', 'min:0'],
            'lampiran' => (! $isUpdate && $isDiajukan)
                ? ['required', 'array', 'min:1']
                : ['nullable', 'array'],
            'lampiran.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'hapus_dokumen' => ['nullable', 'array'],
            'hapus_dokumen.*' => ['integer', 'exists:dokumen,id_dokumen'],
        ];
    }

    /**
     * Validasi tambahan untuk memastikan minimal 1 dokumen lampiran saat pengajuan dikirim.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->input('aksi') === 'diajukan') {
                $pengajuan = $this->route('pengajuan');
                if ($pengajuan instanceof Pengajuan) {
                    $hapusIds = (array) $this->input('hapus_dokumen', []);
                    $sisaDokumenLama = $pengajuan->dokumen()->whereNotIn('id_dokumen', $hapusIds)->count();
                    $dokumenBaruCount = is_array($this->file('lampiran')) ? count($this->file('lampiran')) : 0;

                    if (($sisaDokumenLama + $dokumenBaruCount) < 1) {
                        $validator->errors()->add(
                            'lampiran',
                            'Minimal satu berkas lampiran permohonan/RAB wajib diunggah sebelum mengirim pengajuan.'
                        );
                    }
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'aksi.required' => 'Pilih aksi simpan draf atau kirim pengajuan.',
            'aksi.in' => 'Aksi pengajuan tidak valid.',
            'perihal.required' => 'Perihal pengadaan wajib diisi.',
            'perihal.max' => 'Perihal pengadaan maksimal 200 karakter.',
            'sumber_dana.required' => 'Sumber dana usulan wajib diisi.',
            'sumber_dana.max' => 'Sumber dana usulan maksimal 100 karakter.',
            'id_ruangan.exists' => 'Ruangan tujuan yang dipilih tidak ditemukan.',
            'alasan.required' => 'Alasan dan manfaat pengadaan wajib diisi.',
            'items.required' => 'Daftar barang yang diusulkan wajib diisi.',
            'items.min' => 'Minimal harus mengusulkan 1 barang.',
            'items.*.id_kategori.required' => 'Kategori aset wajib dipilih.',
            'items.*.id_kategori.exists' => 'Kategori aset yang dipilih tidak valid.',
            'items.*.nama_barang.required' => 'Nama barang wajib diisi.',
            'items.*.nama_barang.max' => 'Nama barang maksimal 150 karakter.',
            'items.*.spesifikasi.required' => 'Spesifikasi teknis wajib diisi.',
            'items.*.jumlah.required' => 'Jumlah barang wajib diisi.',
            'items.*.jumlah.integer' => 'Jumlah barang harus berupa angka.',
            'items.*.jumlah.min' => 'Jumlah barang minimal 1 unit.',
            'items.*.harga_satuan.required' => 'Harga satuan estimasi wajib diisi.',
            'items.*.harga_satuan.numeric' => 'Harga satuan harus berupa angka.',
            'items.*.harga_satuan.min' => 'Harga satuan tidak boleh bernilai negatif.',
            'lampiran.required' => 'Minimal satu berkas lampiran permohonan/RAB wajib diunggah sebelum mengirim pengajuan.',
            'lampiran.required_if' => 'Minimal satu berkas lampiran permohonan/RAB wajib diunggah sebelum mengirim pengajuan.',
            'lampiran.min' => 'Minimal satu berkas lampiran permohonan/RAB wajib diunggah sebelum mengirim pengajuan.',
            'lampiran.*.file' => 'Berkas lampiran tidak valid.',
            'lampiran.*.mimes' => 'Berkas lampiran harus berformat PDF, JPG, JPEG, atau PNG.',
            'lampiran.*.max' => 'Ukuran berkas lampiran maksimal 10 MB per berkas.',
        ];
    }
}
