<?php

namespace App\Http\Requests;

use App\Support\PeranNama;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBastRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && ($user->hasRole(PeranNama::OPERATOR) || $user->hasRole('admin'));
    }

    public function rules(): array
    {
        return [
            'jenis_bast' => ['required', 'string', Rule::in(['penerimaan', 'mutasi', 'hibah', 'penjualan'])],
            'id_penerimaan' => ['nullable', 'required_if:jenis_bast,penerimaan', 'exists:penerimaan_aset,id_penerimaan'],
            'id_pengajuan' => ['nullable', 'exists:pengajuan,id_pengajuan'],
            'tanggal_bast' => ['required', 'date'],
            'pihak_pertama' => ['required', 'string', 'max:150'],
            'pihak_kedua' => ['required', 'string', 'max:150'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id_aset' => ['nullable', 'exists:aset,id_aset'],
            'items.*.kode_aset' => ['nullable', 'string', 'max:100'],
            'items.*.nama_barang' => ['required', 'string', 'max:255'],
            'items.*.spesifikasi' => ['nullable', 'string', 'max:1000'],
            'items.*.nomor_seri' => ['nullable', 'string', 'max:100'],
            'items.*.jumlah' => ['required', 'integer', 'min:1'],
            'items.*.satuan' => ['nullable', 'string', 'max:50'],
            'items.*.kondisi' => ['required', 'string', 'max:50'],
            'items.*.keterangan' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'jenis_bast.required' => 'Pilih jenis BAST yang akan disusun.',
            'jenis_bast.in' => 'Jenis BAST harus salah satu dari: Penerimaan, Mutasi, Hibah, atau Penjualan.',
            'id_penerimaan.required_if' => 'Pilih transaksi penerimaan referensi.',
            'id_penerimaan.exists' => 'Data penerimaan aset tidak ditemukan.',
            'id_pengajuan.exists' => 'Data pengajuan referensi tidak ditemukan.',
            'tanggal_bast.required' => 'Tanggal pelaksanaan BAST wajib diisi.',
            'tanggal_bast.date' => 'Format tanggal BAST tidak valid.',
            'pihak_pertama.required' => 'Identitas Pihak Pertama (yang menyerahkan) wajib diisi.',
            'pihak_kedua.required' => 'Identitas Pihak Kedua (yang menerima) wajib diisi.',
            'items.required' => 'Daftar rincian aset tidak boleh kosong.',
            'items.min' => 'Minimal harus terdapat 1 unit aset dalam BAST.',
            'items.*.nama_barang.required' => 'Nama barang pada rincian aset wajib diisi.',
            'items.*.jumlah.required' => 'Jumlah unit aset wajib diisi.',
            'items.*.kondisi.required' => 'Kondisi fisik aset wajib ditentukan.',
        ];
    }
}
