<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\ItemPerbaikan;
use App\Models\Pengajuan;
use App\Models\RiwayatStatusPengajuan;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeknisiTugasController extends Controller
{
    /**
     * Tampilkan daftar tugas perbaikan yang sedang ditugaskan kepada teknisi login (/teknisi/tugas)
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = ItemPerbaikan::query()
            ->where('id_teknisi', $user->id_pengguna)
            ->whereIn('status_perbaikan', ['dalam_perbaikan', 'diperiksa'])
            ->with(['aset.kategori', 'pengajuan.pemohon.unit']);

        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->whereHas('pengajuan', fn ($qp) => $qp->where('nomor_pengajuan', 'like', $keyword))
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword));
            });
        }

        $daftarTugas = $query
            ->orderByDesc('id_item_perbaikan')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ItemPerbaikan $item) => $this->formatItemTugas($item));

        return Inertia::render('Teknisi/TugasIndex', [
            'daftarTugas' => $daftarTugas,
            'filters' => [
                'q' => $request->q ?? '',
            ],
        ]);
    }

    /**
     * Simpan pembaruan status dan hasil pemeriksaan/perbaikan oleh teknisi.
     */
    public function update(Request $request, ItemPerbaikan $itemPerbaikan): RedirectResponse
    {
        $user = $request->user();

        if ($itemPerbaikan->id_teknisi !== $user->id_pengguna) {
            abort(403, 'Anda tidak memiliki hak akses untuk memperbarui tugas perbaikan ini.');
        }

        $validated = $request->validate([
            'status_perbaikan' => ['required', 'in:dalam_perbaikan,selesai,perlu_vendor'],
            'hasil_pemeriksaan' => ['nullable', 'string', 'max:1500'],
            'hasil_perbaikan' => [
                $request->input('status_perbaikan') === 'selesai' ? 'required' : 'nullable',
                'string',
                'max:1500',
            ],
            'biaya_aktual' => ['nullable', 'numeric', 'min:0'],
        ], [
            'status_perbaikan.required' => 'Pilih status perbaikan.',
            'status_perbaikan.in' => 'Status perbaikan tidak valid.',
            'hasil_perbaikan.required' => 'Tindakan hasil perbaikan wajib diisi jika status selesai.',
        ]);

        DB::transaction(function () use ($itemPerbaikan, $validated, $user) {
            $statusBaru = $validated['status_perbaikan'];
            $isSelesai = $statusBaru === 'selesai';
            $isPerluVendor = $statusBaru === 'perlu_vendor';

            $updateData = [
                'status_perbaikan' => $isPerluVendor ? 'dalam_perbaikan' : $statusBaru,
                'hasil_pemeriksaan' => $validated['hasil_pemeriksaan'] ?? $itemPerbaikan->hasil_pemeriksaan,
                'hasil_perbaikan' => $validated['hasil_perbaikan'] ?? $itemPerbaikan->hasil_perbaikan,
                'biaya_aktual' => $validated['biaya_aktual'] ?? $itemPerbaikan->biaya_aktual,
            ];

            if ($isSelesai) {
                $updateData['tanggal_selesai'] = now();
            }

            if ($isPerluVendor) {
                $updateData['perlu_vendor'] = true;
            }

            $itemPerbaikan->update($updateData);

            $pengajuan = $itemPerbaikan->pengajuan;

            if ($isSelesai) {
                // Perbarui status pengajuan menjadi selesai
                $pengajuan->update(['status' => 'selesai']);

                // Kembalikan aset ke kondisi baik dan aktif
                $itemPerbaikan->aset()->update([
                    'kondisi' => 'baik',
                    'status_aset' => 'aktif',
                ]);

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $user->id_pengguna,
                    'status_baru' => 'selesai',
                    'catatan' => 'Perbaikan aset telah selesai dikerjakan oleh teknisi fakultas (' . $user->nama_lengkap . '). Tindakan: ' . $validated['hasil_perbaikan'],
                    'waktu' => now(),
                ]);
            } elseif ($isPerluVendor) {
                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $user->id_pengguna,
                    'status_baru' => 'diproses',
                    'catatan' => 'Teknisi merekomendasikan penanganan oleh vendor eksternal. Hasil pemeriksaan: ' . ($validated['hasil_pemeriksaan'] ?? '-'),
                    'waktu' => now(),
                ]);
            } else {
                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $user->id_pengguna,
                    'status_baru' => 'diproses',
                    'catatan' => 'Pembaruan progres pengerjaan teknisi (' . $user->nama_lengkap . '). Hasil pemeriksaan: ' . ($validated['hasil_pemeriksaan'] ?? '-'),
                    'waktu' => now(),
                ]);
            }

            ActivityLogger::record(
                'update_tugas_teknisi',
                'item_perbaikan',
                $itemPerbaikan->id_item_perbaikan,
                "Teknisi {$user->nama_lengkap} memperbarui status tugas menjadi {$statusBaru}",
                $user->id_pengguna
            );
        });

        $pesan = $validated['status_perbaikan'] === 'selesai'
            ? 'Pekerjaan perbaikan berhasil diselesaikan dan status aset telah diperbarui.'
            : 'Pembaruan progres perbaikan berhasil disimpan.';

        return redirect()->route('teknisi.tugas')->with('status', $pesan);
    }

    /**
     * Tampilkan riwayat pekerjaan perbaikan yang telah diselesaikan teknisi (/teknisi/riwayat)
     */
    public function riwayat(Request $request): Response
    {
        $user = $request->user();

        $query = ItemPerbaikan::query()
            ->where('id_teknisi', $user->id_pengguna)
            ->where('status_perbaikan', 'selesai')
            ->with(['aset.kategori', 'pengajuan.pemohon.unit']);

        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->whereHas('pengajuan', fn ($qp) => $qp->where('nomor_pengajuan', 'like', $keyword))
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword));
            });
        }

        $daftarRiwayat = $query
            ->orderByDesc('tanggal_selesai')
            ->orderByDesc('id_item_perbaikan')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ItemPerbaikan $item) => $this->formatItemTugas($item));

        return Inertia::render('Teknisi/RiwayatIndex', [
            'daftarRiwayat' => $daftarRiwayat,
            'filters' => [
                'q' => $request->q ?? '',
            ],
        ]);
    }

    /**
     * Helper pemformat data tugas perbaikan.
     */
    private function formatItemTugas(ItemPerbaikan $item): array
    {
        return [
            'id_item_perbaikan' => $item->id_item_perbaikan,
            'id_pengajuan' => $item->id_pengajuan,
            'nomor_pengajuan' => $item->pengajuan?->nomor_pengajuan ?? '-',
            'tanggal_mulai' => $item->tanggal_mulai?->format('d M Y') ?? ($item->pengajuan?->tanggal_pengajuan?->format('d M Y') ?? '-'),
            'tanggal_selesai' => $item->tanggal_selesai?->format('d M Y, H:i') ?? '-',
            'pemohon_nama' => $item->pengajuan?->pemohon?->nama_lengkap ?? '-',
            'unit_nama' => $item->pengajuan?->pemohon?->unit?->nama_unit ?? '-',
            'kode_aset' => $item->aset?->kode_aset ?? '-',
            'nama_barang' => $item->aset?->nama_barang ?? '-',
            'merek_tipe' => $item->aset?->merek_tipe ?? '-',
            'kondisi_aset' => $item->aset?->kondisi ?? '-',
            'deskripsi_kerusakan' => $item->deskripsi_kerusakan,
            'foto_url' => $item->foto_kerusakan_path ? asset('storage/' . $item->foto_kerusakan_path) : null,
            'estimasi_biaya' => (float) ($item->estimasi_biaya ?? 0),
            'biaya_aktual' => (float) ($item->biaya_aktual ?? 0),
            'hasil_pemeriksaan' => $item->hasil_pemeriksaan,
            'hasil_perbaikan' => $item->hasil_perbaikan,
            'status_perbaikan' => $item->status_perbaikan,
            'perlu_vendor' => (bool) $item->perlu_vendor,
        ];
    }
}
