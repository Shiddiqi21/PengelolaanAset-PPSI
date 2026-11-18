<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\ItemPerbaikan;
use App\Models\PemeliharaanAset;
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
     * Tampilkan daftar tugas teknisi (Perbaikan & Pemeliharaan) (/teknisi/tugas)
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tabAktif = $request->query('tab', 'perbaikan');
        if (! in_array($tabAktif, ['perbaikan', 'pemeliharaan'], true)) {
            $tabAktif = 'perbaikan';
        }

        // 1. Query Tugas Perbaikan Kerusakan (ItemPerbaikan)
        $queryPerbaikan = ItemPerbaikan::query()
            ->where('id_teknisi', $user->id_pengguna)
            ->whereIn('status_perbaikan', ['dalam_perbaikan', 'diperiksa'])
            ->with(['aset.kategori', 'pengajuan.pemohon.unit']);

        if ($request->filled('q') && $tabAktif === 'perbaikan') {
            $keyword = '%' . $request->q . '%';
            $queryPerbaikan->where(function ($q) use ($keyword) {
                $q->whereHas('pengajuan', fn ($qp) => $qp->where('nomor_pengajuan', 'like', $keyword))
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword));
            });
        }

        $daftarTugas = $queryPerbaikan
            ->orderByDesc('id_item_perbaikan')
            ->paginate(10, ['*'], 'page')
            ->withQueryString()
            ->through(fn (ItemPerbaikan $item) => $this->formatItemTugas($item));

        // 2. Query Jadwal Pemeliharaan Aset (PemeliharaanAset)
        $queryPemeliharaan = PemeliharaanAset::query()
            ->where('id_pelaksana', $user->id_pengguna)
            ->whereIn('status', ['terjadwal', 'dalam_proses'])
            ->with(['aset.kategori']);

        if ($request->filled('q') && $tabAktif === 'pemeliharaan') {
            $keyword = '%' . $request->q . '%';
            $queryPemeliharaan->where(function ($q) use ($keyword) {
                $q->where('jenis_pemeliharaan', 'like', $keyword)
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword));
            });
        }

        $daftarPemeliharaan = $queryPemeliharaan
            ->orderBy('tanggal_jadwal', 'asc')
            ->orderByDesc('id_pemeliharaan')
            ->paginate(10, ['*'], 'halaman_pemeliharaan')
            ->withQueryString()
            ->through(fn (PemeliharaanAset $p) => $this->formatItemPemeliharaan($p));

        return Inertia::render('Teknisi/TugasIndex', [
            'daftarTugas' => $daftarTugas,
            'daftarPemeliharaan' => $daftarPemeliharaan,
            'tabAktif' => $tabAktif,
            'filters' => [
                'q' => $request->q ?? '',
                'tab' => $tabAktif,
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
            'status_perbaikan' => ['required', 'in:dalam_perbaikan,selesai'],
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

            $updateData = [
                'status_perbaikan' => $statusBaru,
                'hasil_pemeriksaan' => $validated['hasil_pemeriksaan'] ?? $itemPerbaikan->hasil_pemeriksaan,
                'hasil_perbaikan' => $validated['hasil_perbaikan'] ?? $itemPerbaikan->hasil_perbaikan,
                'biaya_aktual' => $validated['biaya_aktual'] ?? $itemPerbaikan->biaya_aktual,
            ];

            if ($isSelesai) {
                $updateData['tanggal_selesai'] = now();
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

        return redirect()->route('teknisi.tugas', ['tab' => 'perbaikan'])->with('status', $pesan);
    }

    /**
     * Simpan pembaruan realisasi kegiatan pemeliharaan oleh teknisi.
     */
    public function updatePemeliharaan(Request $request, PemeliharaanAset $pemeliharaan): RedirectResponse
    {
        $user = $request->user();

        // 1. Validasi hak akses kepemilikan
        if ($pemeliharaan->id_pelaksana !== $user->id_pengguna) {
            abort(403, 'Anda tidak memiliki hak akses untuk memperbarui jadwal pemeliharaan ini.');
        }

        // 2. Cegah perubahan jika sudah selesai atau dibatalkan
        if (in_array($pemeliharaan->status, ['selesai', 'dibatalkan'], true)) {
            return back()->withErrors([
                'status' => 'Jadwal pemeliharaan yang sudah selesai atau dibatalkan tidak dapat diperbarui kembali.',
            ]);
        }

        // 3. Validasi input
        $isSelesai = $request->input('status') === 'selesai';
        $validated = $request->validate([
            'status' => ['required', 'in:dalam_proses,selesai'],
            'tanggal_pelaksanaan' => [
                $isSelesai ? 'required' : 'nullable',
                'date',
            ],
            'uraian' => [
                $isSelesai ? 'required' : 'nullable',
                'string',
                'max:1500',
            ],
            'biaya' => ['nullable', 'numeric', 'min:0'],
        ], [
            'status.required' => 'Pilih status pemeliharaan.',
            'status.in' => 'Status pemeliharaan tidak valid.',
            'tanggal_pelaksanaan.required' => 'Tanggal pelaksanaan wajib diisi jika pemeliharaan dinyatakan selesai.',
            'tanggal_pelaksanaan.date' => 'Format tanggal pelaksanaan tidak valid.',
            'uraian.required' => 'Uraian pekerjaan wajib diisi jika pemeliharaan dinyatakan selesai.',
            'uraian.max' => 'Uraian pekerjaan maksimal 1500 karakter.',
            'biaya.numeric' => 'Biaya pemeliharaan harus berupa angka.',
            'biaya.min' => 'Biaya pemeliharaan tidak boleh bernilai negatif.',
        ]);

        // 4. Simpan ke database menggunakan transaksi
        DB::transaction(function () use ($pemeliharaan, $validated, $user, $isSelesai) {
            $pemeliharaan->update([
                'status' => $validated['status'],
                'tanggal_pelaksanaan' => $validated['tanggal_pelaksanaan'] ?? ($isSelesai ? now() : $pemeliharaan->tanggal_pelaksanaan),
                'uraian' => $validated['uraian'] ?? $pemeliharaan->uraian,
                'biaya' => $validated['biaya'] ?? $pemeliharaan->biaya,
            ]);

            ActivityLogger::record(
                'update_pemeliharaan_teknisi',
                'pemeliharaan_aset',
                $pemeliharaan->id_pemeliharaan,
                "Teknisi {$user->nama_lengkap} memperbarui status pemeliharaan menjadi {$validated['status']}",
                $user->id_pengguna
            );
        });

        $pesan = $isSelesai
            ? 'Pekerjaan pemeliharaan berhasil diselesaikan.'
            : 'Pembaruan progres pemeliharaan berhasil disimpan.';

        return redirect()->route('teknisi.tugas', ['tab' => 'pemeliharaan'])->with('status', $pesan);
    }

    /**
     * Tampilkan riwayat pekerjaan teknisi (Perbaikan & Pemeliharaan selesai) (/teknisi/riwayat)
     */
    public function riwayat(Request $request): Response
    {
        $user = $request->user();
        $tabAktif = $request->query('tab', 'perbaikan');
        if (! in_array($tabAktif, ['perbaikan', 'pemeliharaan'], true)) {
            $tabAktif = 'perbaikan';
        }

        // 1. Query Riwayat Perbaikan Selesai (ItemPerbaikan)
        $queryPerbaikan = ItemPerbaikan::query()
            ->where('id_teknisi', $user->id_pengguna)
            ->where('status_perbaikan', 'selesai')
            ->with(['aset.kategori', 'pengajuan.pemohon.unit']);

        if ($request->filled('q') && $tabAktif === 'perbaikan') {
            $keyword = '%' . $request->q . '%';
            $queryPerbaikan->where(function ($q) use ($keyword) {
                $q->whereHas('pengajuan', fn ($qp) => $qp->where('nomor_pengajuan', 'like', $keyword))
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword));
            });
        }

        $daftarRiwayat = $queryPerbaikan
            ->orderByDesc('tanggal_selesai')
            ->orderByDesc('id_item_perbaikan')
            ->paginate(10, ['*'], 'page')
            ->withQueryString()
            ->through(fn (ItemPerbaikan $item) => $this->formatItemTugas($item));

        // 2. Query Riwayat Pemeliharaan Selesai (PemeliharaanAset)
        $queryPemeliharaan = PemeliharaanAset::query()
            ->where('id_pelaksana', $user->id_pengguna)
            ->where('status', 'selesai')
            ->with(['aset.kategori']);

        if ($request->filled('q') && $tabAktif === 'pemeliharaan') {
            $keyword = '%' . $request->q . '%';
            $queryPemeliharaan->where(function ($q) use ($keyword) {
                $q->where('jenis_pemeliharaan', 'like', $keyword)
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword));
            });
        }

        $daftarRiwayatPemeliharaan = $queryPemeliharaan
            ->orderByDesc('tanggal_pelaksanaan')
            ->orderByDesc('id_pemeliharaan')
            ->paginate(10, ['*'], 'halaman_pemeliharaan')
            ->withQueryString()
            ->through(fn (PemeliharaanAset $p) => $this->formatItemPemeliharaanSelesai($p));

        return Inertia::render('Teknisi/RiwayatIndex', [
            'daftarRiwayat' => $daftarRiwayat,
            'daftarRiwayatPemeliharaan' => $daftarRiwayatPemeliharaan,
            'tabAktif' => $tabAktif,
            'filters' => [
                'q' => $request->q ?? '',
                'tab' => $tabAktif,
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
        ];
    }

    /**
     * Helper pemformat data jadwal pemeliharaan aktif.
     */
    private function formatItemPemeliharaan(PemeliharaanAset $p): array
    {
        $statusNada = match ($p->status) {
            'terjadwal' => 'peringatan',
            'dalam_proses' => 'info',
            'selesai' => 'sukses',
            'dibatalkan' => 'bahaya',
            default => 'netral',
        };

        $statusLabel = match ($p->status) {
            'terjadwal' => 'Terjadwal',
            'dalam_proses' => 'Sedang Dikerjakan',
            'selesai' => 'Selesai',
            'dibatalkan' => 'Dibatalkan',
            default => ucfirst(str_replace('_', ' ', $p->status)),
        };

        return [
            'id_pemeliharaan' => $p->id_pemeliharaan,
            'id_aset' => $p->id_aset,
            'kode_aset' => $p->aset?->kode_aset ?? '-',
            'nama_barang' => $p->aset?->nama_barang ?? '-',
            'merek_tipe' => $p->aset?->merek_tipe ?? '-',
            'kategori' => $p->aset?->kategori?->nama_kategori ?? '-',
            'kondisi' => $p->aset?->kondisi ?? '-',
            'jenis_pemeliharaan' => $p->jenis_pemeliharaan,
            'tanggal_jadwal' => $p->tanggal_jadwal?->format('d M Y') ?? '-',
            'tanggal_jadwal_raw' => $p->tanggal_jadwal?->format('Y-m-d') ?? '',
            'tanggal_pelaksanaan' => $p->tanggal_pelaksanaan?->format('d M Y') ?? '-',
            'tanggal_pelaksanaan_raw' => $p->tanggal_pelaksanaan?->format('Y-m-d') ?? '',
            'status' => $p->status,
            'status_label' => $statusLabel,
            'status_nada' => $statusNada,
            'uraian' => $p->uraian ?? '',
            'biaya' => (float) ($p->biaya ?? 0),
        ];
    }

    /**
     * Helper pemformat data riwayat pemeliharaan selesai.
     */
    private function formatItemPemeliharaanSelesai(PemeliharaanAset $p): array
    {
        return [
            'id_pemeliharaan' => $p->id_pemeliharaan,
            'id_aset' => $p->id_aset,
            'kode_aset' => $p->aset?->kode_aset ?? '-',
            'nama_barang' => $p->aset?->nama_barang ?? '-',
            'merek_tipe' => $p->aset?->merek_tipe ?? '-',
            'kategori' => $p->aset?->kategori?->nama_kategori ?? '-',
            'kondisi' => $p->aset?->kondisi ?? '-',
            'jenis_pemeliharaan' => $p->jenis_pemeliharaan,
            'tanggal_jadwal' => $p->tanggal_jadwal?->format('d M Y') ?? '-',
            'tanggal_pelaksanaan' => $p->tanggal_pelaksanaan?->format('d M Y') ?? '-',
            'uraian' => $p->uraian ?? '-',
            'biaya' => (float) ($p->biaya ?? 0),
            'status' => $p->status,
            'status_label' => 'Selesai',
            'status_nada' => 'sukses',
        ];
    }
}
