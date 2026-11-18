<?php

namespace App\Http\Requests;

use App\Models\Aset;
use App\Models\ItemMutasi;
use App\Models\Pengajuan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreMutasiRequest extends FormRequest
{
    /**
     * Tentukan apakah pengguna memiliki hak akses untuk mengajukan mutasi.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('pemohon') ?? false;
    }

    /**
     * Aturan validasi pengajuan mutasi aset.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'aksi' => ['required', 'in:draft,diajukan'],
            'perihal' => ['required', 'string', 'max:255'],
            'jenis_mutasi' => ['required', 'string', 'max:100'],
            'tanggal_mutasi' => ['required', 'date'],
            'alasan_mutasi' => ['required', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id_aset' => ['required', 'integer', 'exists:aset,id_aset'],
            'items.*.id_ruangan_tujuan' => ['required', 'integer', 'exists:ruangan,id_ruangan'],
            'items.*.id_pengguna_pj_tujuan' => ['nullable', 'integer', 'exists:pengguna,id_pengguna'],
            'lampiran' => ['nullable', 'array'],
            'lampiran.*' => ['file', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx', 'max:10240'],
        ];

        if ($this->input('aksi') === 'diajukan') {
            $rules['lampiran'] = ['required', 'array', 'min:1'];
        }

        return $rules;
    }

    /**
     * Validasi lanjutan: cegah duplikasi aset, bentrok pengajuan aktif, dan validasi ruangan/PJ tujuan.
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
                $idRuanganTujuan = $item['id_ruangan_tujuan'] ?? null;
                $idPjTujuan = $item['id_pengguna_pj_tujuan'] ?? null;

                if (! $idAset) {
                    continue;
                }

                // 1. Cek duplikasi aset dalam satu formulir
                if (in_array($idAset, $asetIds, true)) {
                    $validator->errors()->add("items.{$idx}.id_aset", 'Aset ini telah ditambahkan lebih dari satu kali dalam daftar mutasi.');
                    continue;
                }
                $asetIds[] = $idAset;

                // 2. Ambil data aset beserta penempatan aktif
                $aset = Aset::with(['penempatanAktif.ruangan', 'penempatanAktif.penanggungJawab'])->find($idAset);
                if (! $aset) {
                    continue;
                }

                if ($aset->status_aset !== 'aktif') {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" ({$aset->kode_aset}) tidak berstatus aktif sehingga tidak dapat dimutasi.");
                    continue;
                }

                $penempatanAktif = $aset->penempatanAktif;
                if (! $penempatanAktif) {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" ({$aset->kode_aset}) belum memiliki penempatan aktif.");
                    continue;
                }

                // 3. Cek kepemilikan unit (jika user memiliki id_unit)
                if (! empty($user->id_unit) && $penempatanAktif->ruangan?->id_unit !== $user->id_unit) {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" berada di luar unit kerja Anda.");
                    continue;
                }

                // 4. Cek bentrok pengajuan mutasi/penghapusan lain yang sedang aktif
                $sedangDiajukan = ItemMutasi::where('id_aset', $idAset)
                    ->whereHas('pengajuan', function ($q) {
                        $q->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
                    })
                    ->exists();

                if ($sedangDiajukan) {
                    $validator->errors()->add("items.{$idx}.id_aset", "Aset \"{$aset->nama_barang}\" ({$aset->kode_aset}) sedang berada dalam pengajuan mutasi lain yang masih aktif.");
                    continue;
                }

                // 5. Validasi ruangan/PJ tujuan vs asal:
                // Harus berbeda dari ruangan asal, ATAU jika ruangan sama, PJ tujuan harus berbeda dari PJ asal
                $idRuanganAsal = $penempatanAktif->id_ruangan;
                $idPjAsal = $penempatanAktif->id_pengguna_pj;

                if ($idRuanganTujuan && (int) $idRuanganTujuan === (int) $idRuanganAsal) {
                    $pjBerubah = ! empty($idPjTujuan) && (int) $idPjTujuan !== (int) $idPjAsal;
                    if (! $pjBerubah) {
                        $validator->errors()->add(
                            "items.{$idx}.id_ruangan_tujuan",
                            "Ruangan tujuan tidak boleh sama dengan ruangan asal ({$penempatanAktif->ruangan?->nama_ruangan}) kecuali penanggung jawab tujuan diubah."
                        );
                    }
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
            'perihal.required' => 'Perihal pengajuan mutasi wajib diisi.',
            'perihal.max' => 'Perihal mutasi maksimal 255 karakter.',
            'jenis_mutasi.required' => 'Jenis mutasi wajib dipilih.',
            'tanggal_mutasi.required' => 'Tanggal usulan pemindahan wajib diisi.',
            'tanggal_mutasi.date' => 'Format tanggal pemindahan tidak valid.',
            'alasan_mutasi.required' => 'Alasan dan pertimbangan mutasi wajib diisi.',
            'alasan_mutasi.max' => 'Alasan mutasi maksimal 2000 karakter.',
            'items.required' => 'Minimal satu aset wajib dipilih untuk pengajuan mutasi.',
            'items.min' => 'Minimal satu aset wajib dipilih untuk pengajuan mutasi.',
            'items.*.id_aset.required' => 'Aset wajib dipilih.',
            'items.*.id_aset.exists' => 'Aset yang dipilih tidak ditemukan dalam sistem.',
            'items.*.id_ruangan_tujuan.required' => 'Lokasi ruangan tujuan wajib dipilih.',
            'items.*.id_ruangan_tujuan.exists' => 'Ruangan tujuan tidak ditemukan dalam sistem.',
            'items.*.id_pengguna_pj_tujuan.exists' => 'Pengguna penanggung jawab tujuan tidak ditemukan.',
            'lampiran.required' => 'Minimal satu berkas dokumen persetujuan/pendukung wajib diunggah sebelum mengirim pengajuan.',
            'lampiran.min' => 'Minimal satu berkas dokumen persetujuan/pendukung wajib diunggah sebelum mengirim pengajuan.',
            'lampiran.*.file' => 'Berkas lampiran harus berupa file yang valid.',
            'lampiran.*.mimes' => 'Format berkas lampiran harus PDF, JPG, PNG, Word, atau Excel.',
            'lampiran.*.max' => 'Ukuran setiap berkas lampiran maksimal 10 MB.',
        ];
    }
}
