<?php

namespace App\Http\Requests;

use App\Models\ItemPengadaan;
use App\Models\Pengajuan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePenerimaanRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && $user->hasRole('operator');
    }

    public function rules(): array
    {
        return [
            'id_pengajuan' => ['required', 'integer', 'exists:pengajuan,id_pengajuan'],
            'id_vendor' => ['required', 'integer', 'exists:vendor,id_vendor'],
            'tanggal_terima' => ['required', 'date'],
            'nomor_nota' => ['required', 'string', 'max:50'],
            'catatan' => ['nullable', 'string'],
            'registrasi_aset' => ['nullable', 'boolean'],
            'id_ruangan' => ['nullable', 'integer', 'exists:ruangan,id_ruangan'],
            'id_pengguna_pj' => ['nullable', 'integer', 'exists:pengguna,id_pengguna'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id_item_pengadaan' => ['required', 'integer', 'exists:item_pengadaan,id_item_pengadaan'],
            'items.*.jumlah_diterima' => ['required', 'integer', 'min:0'],
            'items.*.spesifikasi_diterima' => ['nullable', 'string'],
            'items.*.hasil_verifikasi' => ['required', 'string', 'in:sesuai,kurang,tidak_sesuai'],
            'items.*.catatan_kekurangan' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'id_pengajuan.required' => 'Pengajuan pengadaan wajib dipilih.',
            'id_pengajuan.exists' => 'Pengajuan yang dipilih tidak valid.',
            'id_vendor.required' => 'Vendor pemasok wajib dipilih.',
            'id_vendor.exists' => 'Vendor pemasok yang dipilih tidak ditemukan.',
            'tanggal_terima.required' => 'Tanggal terima barang wajib diisi.',
            'tanggal_terima.date' => 'Format tanggal terima barang tidak valid.',
            'nomor_nota.required' => 'Nomor nota / surat jalan wajib diisi.',
            'nomor_nota.max' => 'Nomor nota maksimal 50 karakter.',
            'items.required' => 'Daftar item verifikasi tidak boleh kosong.',
            'items.min' => 'Minimal satu item harus diverifikasi.',
            'items.*.jumlah_diterima.required' => 'Jumlah diterima wajib diisi.',
            'items.*.jumlah_diterima.integer' => 'Jumlah diterima harus berupa angka bulat.',
            'items.*.jumlah_diterima.min' => 'Jumlah diterima minimal 0.',
            'items.*.hasil_verifikasi.required' => 'Hasil verifikasi item wajib ditentukan.',
            'items.*.hasil_verifikasi.in' => 'Hasil verifikasi harus bernilai sesuai, kurang, atau tidak sesuai.',
            'id_ruangan.exists' => 'Ruangan penempatan yang dipilih tidak valid.',
            'id_pengguna_pj.exists' => 'Penanggung jawab yang dipilih tidak valid.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->filled('id_pengajuan')) {
                $pengajuan = Pengajuan::find($this->id_pengajuan);
                if (!$pengajuan || $pengajuan->jenis_pengajuan !== 'pengadaan') {
                    $validator->errors()->add('id_pengajuan', 'Pengajuan harus berupa pengajuan pengadaan aset.');
                } elseif (!in_array($pengajuan->status, ['disetujui_pimpinan', 'diproses'], true)) {
                    $validator->errors()->add('id_pengajuan', 'Pengajuan belum disetujui Pimpinan atau tidak sedang dalam proses penerimaan.');
                }
            }

            $items = $this->input('items', []);
            if (is_array($items)) {
                foreach ($items as $index => $item) {
                    $hasil = $item['hasil_verifikasi'] ?? '';
                    $catatan = trim($item['catatan_kekurangan'] ?? '');
                    $jumlahDiterima = isset($item['jumlah_diterima']) ? (int) $item['jumlah_diterima'] : 0;
                    $idItemPengadaan = $item['id_item_pengadaan'] ?? null;

                    $itemPengadaan = $idItemPengadaan ? ItemPengadaan::find($idItemPengadaan) : null;
                    if ($itemPengadaan) {
                        $diterimaSebelumnya = \App\Models\ItemPenerimaan::where('id_item_pengadaan', $itemPengadaan->id_item_pengadaan)
                            ->where('hasil_verifikasi', 'sesuai')
                            ->sum('jumlah_diterima');
                        $sisaDiminta = max(0, $itemPengadaan->jumlah - $diterimaSebelumnya);

                        if (in_array($hasil, ['kurang', 'tidak_sesuai'], true) && empty($catatan)) {
                            $validator->errors()->add("items.{$index}.catatan_kekurangan", 'Catatan kekurangan/ketidaksesuaian wajib diisi untuk hasil verifikasi kurang atau tidak sesuai.');
                        } elseif ($jumlahDiterima < $sisaDiminta && empty($catatan)) {
                            $validator->errors()->add("items.{$index}.catatan_kekurangan", "Catatan kekurangan wajib diisi karena jumlah diterima ({$jumlahDiterima}) kurang dari sisa kebutuhan ({$sisaDiminta}).");
                        }
                    }
                }
            }
        });
    }
}
