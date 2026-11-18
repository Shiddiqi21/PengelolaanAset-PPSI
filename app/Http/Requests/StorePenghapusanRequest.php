<?php

namespace App\Http\Requests;

use App\Models\Aset;
use App\Models\ItemMutasi;
use App\Models\ItemPenghapusan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePenghapusanRequest extends FormRequest
{
    /**
     * Tentukan apakah pengguna memiliki hak akses untuk mengajukan penghapusan aset.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('pemohon') ?? false;
    }

    /**
     * Aturan validasi pengajuan penghapusan aset baru.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'aksi' => ['required', 'in:draft,diajukan'],
            'perihal' => ['required', 'string', 'max:255'],
            'dasar_usulan' => ['required', 'string', 'max:150'],
            'alasan_penghapusan' => ['required', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id_aset' => ['required', 'integer', 'exists:aset,id_aset'],
            'lampiran' => ['nullable', 'array'],
            'lampiran.*' => ['file', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx', 'max:10240'],
        ];

        if ($this->input('aksi') === 'diajukan') {
            $rules['lampiran'] = ['required', 'array', 'min:1'];
        }

        return $rules;
    }

    /**
     * Validasi lanjutan: cegah duplikasi aset, aset non-aktif, dan bentrok pengajuan aktif lain.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $items = $this->input('items', []);
            if (! is_array($items) || empty($items)) {
                return;
            }

            $user = $this->user();
            $asetIds = [];

            foreach ($items as $idx => $item) {
                $idAset = $item['id_aset'] ?? null;
                if (! $idAset) {
                    continue;
                }

                // 1. Cek duplikasi aset dalam formulir
                if (in_array($idAset, $asetIds, true)) {
                    $validator->errors()->add("items.{$idx}.id_aset", 'Aset ini telah ditambahkan lebih dari satu kali dalam daftar penghapusan.');
                    continue;
                }
                $asetIds[] = $idAset;

                // 2. Cek status aset
                $aset = Aset::with(['penempatanAktif.ruangan'])->find($idAset);
                if (! $aset) {
                    continue;
                }

                if ($aset->status_aset !== 'aktif') {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" ({$aset->kode_aset}) tidak berstatus aktif sehingga tidak dapat diusulkan untuk dihapuskan.");
                    continue;
                }

                // 3. Cek kepemilikan unit kerja pemohon
                $penempatanAktif = $aset->penempatanAktif;
                if (! empty($user->id_unit) && $penempatanAktif && $penempatanAktif->ruangan?->id_unit !== $user->id_unit) {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" berada di luar unit kerja Anda.");
                    continue;
                }

                // 4. Cek bentrok pengajuan mutasi lain yang aktif
                $sedangDimutasi = ItemMutasi::where('id_aset', $idAset)
                    ->whereHas('pengajuan', function ($q) {
                        $q->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
                    })
                    ->exists();

                if ($sedangDimutasi) {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" ({$aset->kode_aset}) sedang berada dalam pengajuan mutasi yang masih aktif.");
                    continue;
                }

                // 5. Cek bentrok pengajuan penghapusan lain yang aktif
                $sedangDihapus = ItemPenghapusan::where('id_aset', $idAset)
                    ->whereHas('pengajuan', function ($q) {
                        $q->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
                    })
                    ->exists();

                if ($sedangDihapus) {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" ({$aset->kode_aset}) sedang berada dalam pengajuan penghapusan lain yang masih aktif.");
                    continue;
                }
            }
        });
    }

    /**
     * Pesan validasi dalam Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'aksi.required' => 'Aksi pengajuan wajib dipilih.',
            'aksi.in' => 'Aksi pengajuan tidak valid.',
            'perihal.required' => 'Perihal pengajuan penghapusan wajib diisi.',
            'perihal.max' => 'Perihal penghapusan maksimal 255 karakter.',
            'dasar_usulan.required' => 'Dasar usulan penghapusan wajib dipilih.',
            'alasan_penghapusan.required' => 'Alasan dan penjelasan kondisi aset wajib diisi.',
            'alasan_penghapusan.max' => 'Alasan penghapusan maksimal 2000 karakter.',
            'items.required' => 'Minimal satu aset wajib dipilih untuk pengajuan penghapusan.',
            'items.min' => 'Minimal satu aset wajib dipilih untuk pengajuan penghapusan.',
            'items.*.id_aset.required' => 'Aset wajib dipilih.',
            'items.*.id_aset.exists' => 'Aset yang dipilih tidak ditemukan dalam sistem.',
            'lampiran.required' => 'Minimal satu berkas foto fisik atau surat usulan penghapusan wajib dilampirkan sebelum mengirim pengajuan.',
            'lampiran.min' => 'Minimal satu berkas foto fisik atau surat usulan penghapusan wajib dilampirkan sebelum mengirim pengajuan.',
            'lampiran.*.file' => 'Berkas lampiran harus berupa file yang valid.',
            'lampiran.*.mimes' => 'Format berkas lampiran harus PDF, JPG, PNG, Word, atau Excel.',
            'lampiran.*.max' => 'Ukuran setiap berkas lampiran maksimal 10 MB.',
        ];
    }
}
