<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProsesPenghapusanRequest extends FormRequest
{
    /**
     * Hanya operator yang dapat memproses dan mengeksekusi penghapusan aset.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('operator') ?? false;
    }

    /**
     * Aturan validasi eksekusi penghapusan aset.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $jalur = $this->input('jalur_penghapusan');
        $isSharingAtauHibah = in_array($jalur, ['sharing_internal', 'hibah_luar', 'hibah'], true);
        $isPenjualan = in_array($jalur, ['penjualan_lelang', 'penjualan'], true);

        return [
            'jalur_penghapusan' => [
                'required',
                'string',
                'in:sharing_internal,hibah_luar,penjualan_lelang,penjualan,hibah,pemusnahan,lainnya',
            ],
            'tanggal_penghapusan' => ['required', 'date'],
            'nomor_persetujuan_rektor' => ['nullable', 'string', 'max:150'],
            'pihak_penerima' => [
                $isSharingAtauHibah ? 'required' : 'nullable',
                'string',
                'max:150',
            ],
            'catatan_tim_peneliti' => [
                $isPenjualan ? 'required' : 'nullable',
                'string',
                'max:2000',
            ],
            'catatan_tim_penilai' => [
                $isPenjualan ? 'required' : 'nullable',
                'string',
                'max:2000',
            ],
            'nilai_taksiran' => [
                $isPenjualan ? 'required' : 'nullable',
                'numeric',
                'min:0',
            ],
            'dokumen_sk' => [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,doc,docx',
                'max:10240',
            ],
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
            'jalur_penghapusan.required' => 'Jalur penghapusan aset wajib dipilih.',
            'jalur_penghapusan.in' => 'Jalur penghapusan tidak valid.',
            'tanggal_penghapusan.required' => 'Tanggal pelaksanaan penghapusan wajib diisi.',
            'tanggal_penghapusan.date' => 'Format tanggal pelaksanaan tidak valid.',
            'pihak_penerima.required' => 'Unit atau instansi pihak penerima wajib diisi untuk jalur sharing/hibah.',
            'pihak_penerima.max' => 'Nama pihak penerima maksimal 150 karakter.',
            'catatan_tim_peneliti.required' => 'Catatan hasil kajian Tim Peneliti wajib diisi untuk jalur penjualan/lelang.',
            'catatan_tim_penilai.required' => 'Catatan rekomendasi Tim Penilai Rektorat wajib diisi untuk jalur penjualan/lelang.',
            'nilai_taksiran.required' => 'Nilai taksiran atau estimasi hasil lelang wajib diisi berupa angka nominal.',
            'nilai_taksiran.numeric' => 'Nilai taksiran harus berupa angka yang valid.',
            'nilai_taksiran.min' => 'Nilai taksiran minimal Rp 0.',
            'dokumen_sk.file' => 'Berkas surat keputusan harus berupa file yang valid.',
            'dokumen_sk.mimes' => 'Format berkas surat keputusan harus PDF, Word, atau Gambar.',
            'dokumen_sk.max' => 'Ukuran berkas surat keputusan maksimal 10 MB.',
        ];
    }
}
