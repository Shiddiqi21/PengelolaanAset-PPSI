<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePengadaanRequest;
use App\Models\Dokumen;
use App\Models\ItemPengadaan;
use App\Models\KategoriAset;
use App\Models\Pengajuan;
use App\Models\RiwayatStatusPengajuan;
use App\Models\Ruangan;
use App\Services\PengajuanStatusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PengadaanController extends Controller
{
    public function __construct(
        protected ?PengajuanStatusService $statusService = null
    ) {
        $this->statusService = $statusService ?? app(PengajuanStatusService::class);
    }

    /**
     * Tampilkan formulir pengajuan pengadaan aset baru.
     */
    public function create(Request $request): Response
    {
        $user = $request->user()->load(['unit', 'subUnit']);

        $kategoriAset = KategoriAset::query()
            ->select(['id_kategori', 'kode_kategori', 'nama_kategori'])
            ->orderBy('nama_kategori')
            ->get();

        $ruangan = Ruangan::query()
            ->select(['id_ruangan', 'nomor_ruangan', 'nama_ruangan'])
            ->orderBy('nomor_ruangan')
            ->get();

        return Inertia::render('Pengadaan/Create', [
            'pemohon' => [
                'id_pengguna' => $user->id_pengguna,
                'nama_lengkap' => $user->nama_lengkap,
                'nip' => $user->nip,
                'unit_nama' => $user->unit?->nama_unit ?? 'Fakultas Teknologi Informasi',
                'sub_unit_nama' => $user->subUnit?->nama_sub_unit,
            ],
            'kategoriAset' => $kategoriAset,
            'ruangan' => $ruangan,
        ]);
    }

    /**
     * Simpan pengajuan pengadaan baru (draf atau dikirim).
     */
    public function store(StorePengadaanRequest $request): RedirectResponse
    {
        $user = $request->user()->load(['unit', 'subUnit']);
        $status = $request->input('aksi') === 'draft' ? 'draft' : 'diajukan';

        DB::transaction(function () use ($request, $user, $status) {
            $nomorPengajuan = $this->generateNomorPengajuan();

            $unitPengusul = $user->unit?->nama_unit ?? '-';
            if ($user->subUnit) {
                $unitPengusul .= ' (' . $user->subUnit->nama_sub_unit . ')';
            }

            $keteranganParts = [
                "Perihal: {$request->input('perihal')}",
                "Unit Pengusul: {$unitPengusul}",
                "Sumber Dana: {$request->input('sumber_dana')}",
            ];

            if ($request->filled('id_ruangan')) {
                $ruangan = Ruangan::find($request->input('id_ruangan'));
                if ($ruangan) {
                    $keteranganParts[] = "Lokasi Penempatan: {$ruangan->nomor_ruangan} - {$ruangan->nama_ruangan}";
                }
            }

            $keteranganParts[] = "Alasan & Manfaat: {$request->input('alasan')}";
            $keterangan = implode("\n", $keteranganParts);

            // 1. Simpan tabel pengajuan
            $pengajuan = Pengajuan::query()->create([
                'id_pemohon' => $user->id_pengguna,
                'nomor_pengajuan' => $nomorPengajuan,
                'jenis_pengajuan' => 'pengadaan',
                'tanggal_pengajuan' => now(),
                'keterangan' => $keterangan,
                'status' => $status,
            ]);

            // 2. Simpan rincian item pengadaan
            foreach ($request->input('items', []) as $item) {
                $jumlah = (int) $item['jumlah'];
                $hargaSatuan = (float) $item['harga_satuan'];
                $estimasiAnggaran = $jumlah * $hargaSatuan;

                ItemPengadaan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_kategori' => $item['id_kategori'],
                    'nama_barang' => $item['nama_barang'],
                    'spesifikasi' => $item['spesifikasi'],
                    'jumlah' => $jumlah,
                    'estimasi_anggaran' => $estimasiAnggaran,
                ]);
            }

            // 3. Catat riwayat status pengajuan awal
            $catatanRiwayat = $status === 'draft'
                ? 'Draf pengajuan pengadaan disimpan'
                : 'Pengajuan pengadaan dikirim oleh pemohon';

            RiwayatStatusPengajuan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $user->id_pengguna,
                'status_baru' => $status,
                'catatan' => $catatanRiwayat,
                'waktu' => now(),
            ]);

            // 4. Simpan berkas lampiran pendukung
            if ($request->hasFile('lampiran')) {
                foreach ($request->file('lampiran') as $berkas) {
                    $path = $berkas->store('dokumen/pengadaan', 'public');
                    $namaAsli = Str::limit($berkas->getClientOriginalName(), 145);

                    Dokumen::query()->create([
                        'id_pengajuan' => $pengajuan->id_pengajuan,
                        'id_aset' => null,
                        'id_pengunggah' => $user->id_pengguna,
                        'jenis_dokumen' => 'surat_pengajuan',
                        'nama_file' => $namaAsli,
                        'path_file' => $path,
                        'tanggal_unggah' => now(),
                    ]);
                }
            }
        });

        $pesanStatus = $status === 'draft'
            ? 'Draf pengajuan pengadaan berhasil disimpan.'
            : 'Pengajuan pengadaan berhasil dikirim.';

        return redirect()->route('pemohon.pengajuan')->with('status', $pesanStatus);
    }

    /**
     * Tampilkan formulir edit pengajuan pengadaan (untuk status 'draft' / perlu revisi).
     */
    public function edit(Request $request, Pengajuan $pengajuan): Response
    {
        $user = $request->user();

        // Pastikan hanya pemohon pemilik pengajuan yang dapat mengedit
        if ($pengajuan->id_pemohon !== $user->id_pengguna) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah pengajuan ini.');
        }

        // Pastikan pengajuan masih berupa draf / belum diproses
        if ($pengajuan->status !== 'draft') {
            abort(403, 'Pengajuan yang sudah diproses atau disetujui tidak dapat diedit.');
        }

        if ($pengajuan->jenis_pengajuan === 'mutasi') {
            return app(MutasiController::class)->edit($request, $pengajuan);
        }

        if ($pengajuan->jenis_pengajuan === 'penghapusan') {
            return app(PenghapusanController::class)->edit($request, $pengajuan);
        }

        if ($pengajuan->jenis_pengajuan !== 'pengadaan') {
            abort(404, 'Formulir edit ini hanya untuk pengajuan pengadaan.');
        }

        $pengajuan->load(['itemPengadaan.kategori', 'dokumen', 'riwayatStatus']);

        // Ekstraksi data keterangan
        $perihal = '';
        if (preg_match('/^Perihal:\s*(.*)$/m', $pengajuan->keterangan, $m)) {
            $perihal = trim($m[1]);
        }
        $sumberDana = 'RKAT FTI 2026';
        if (preg_match('/^Sumber Dana:\s*(.*)$/m', $pengajuan->keterangan, $m)) {
            $sumberDana = trim($m[1]);
        }
        $idRuangan = null;
        if (preg_match('/^Lokasi Penempatan:\s*([^\s-]+)/m', $pengajuan->keterangan, $m)) {
            $nomorRuangan = trim($m[1]);
            $r = Ruangan::where('nomor_ruangan', $nomorRuangan)->first();
            if ($r) {
                $idRuangan = $r->id_ruangan;
            }
        }
        $alasan = '';
        if (preg_match('/^Alasan & Manfaat:\s*(.*)$/ms', $pengajuan->keterangan, $m)) {
            $alasan = trim($m[1]);
        } else {
            $alasan = $pengajuan->keterangan;
        }

        if (empty($perihal)) {
            $perihal = $pengajuan->keterangan;
        }

        // Ambil catatan revisi jika statusnya Perlu Revisi
        $isRevisi = $pengajuan->is_revisi;
        $catatanRevisiTerakhir = null;
        if ($isRevisi) {
            $riwayatRevisi = $pengajuan->riwayatStatus
                ->filter(function ($r) {
                    $catatan = strtolower($r->catatan ?? '');

                    return str_contains($catatan, 'kembali')
                        || str_contains($catatan, 'revisi')
                        || str_contains($catatan, 'perbaikan');
                })
                ->sortByDesc('id_riwayat_status')
                ->first();
            $catatanRevisiTerakhir = $riwayatRevisi?->catatan;
        }

        $kategoriAset = KategoriAset::query()
            ->select(['id_kategori', 'kode_kategori', 'nama_kategori'])
            ->orderBy('nama_kategori')
            ->get();

        $ruangan = Ruangan::query()
            ->select(['id_ruangan', 'nomor_ruangan', 'nama_ruangan'])
            ->orderBy('nomor_ruangan')
            ->get();

        $user->load(['unit', 'subUnit']);

        return Inertia::render('Pengadaan/Edit', [
            'pemohon' => [
                'id_pengguna' => $user->id_pengguna,
                'nama_lengkap' => $user->nama_lengkap,
                'nip' => $user->nip,
                'unit_nama' => $user->unit?->nama_unit ?? 'Fakultas Teknologi Informasi',
                'sub_unit_nama' => $user->subUnit?->nama_sub_unit,
            ],
            'pengajuan' => [
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'nomor_pengajuan' => $pengajuan->nomor_pengajuan,
                'status' => $pengajuan->status,
                'is_revisi' => $isRevisi,
                'catatan_revisi_terakhir' => $catatanRevisiTerakhir,
                'perihal' => $perihal,
                'sumber_dana' => $sumberDana,
                'id_ruangan' => $idRuangan,
                'alasan' => $alasan,
                'items' => $pengajuan->itemPengadaan->map(function ($it) {
                    $jumlah = (int) $it->jumlah;
                    $estimasi = (float) $it->estimasi_anggaran;
                    $hargaSatuan = $jumlah > 0 ? ($estimasi / $jumlah) : 0;

                    return [
                        'id_item_pengadaan' => $it->id_item_pengadaan,
                        'id_kategori' => $it->id_kategori,
                        'nama_barang' => $it->nama_barang,
                        'spesifikasi' => $it->spesifikasi,
                        'jumlah' => $jumlah,
                        'harga_satuan' => $hargaSatuan,
                    ];
                })->values(),
                'dokumen' => $pengajuan->dokumen->map(fn ($d) => [
                    'id_dokumen' => $d->id_dokumen,
                    'nama_file' => $d->nama_file,
                    'url' => route('dokumen.unduh', $d->id_dokumen),
                    'tanggal_unggah' => $d->tanggal_unggah?->format('d M Y') ?? '-',
                ])->values(),
            ],
            'kategoriAset' => $kategoriAset,
            'ruangan' => $ruangan,
        ]);
    }

    /**
     * Perbarui pengajuan pengadaan (draf atau kirim ulang).
     */
    public function update(StorePengadaanRequest $request, Pengajuan $pengajuan): RedirectResponse
    {
        $user = $request->user();

        if ($pengajuan->id_pemohon !== $user->id_pengguna) {
            abort(403, 'Anda tidak memiliki hak akses untuk memperbarui pengajuan ini.');
        }

        if ($pengajuan->status !== 'draft') {
            abort(403, 'Pengajuan yang sudah diproses atau disetujui tidak dapat diedit.');
        }

        $user->load(['unit', 'subUnit']);
        $statusAksi = $request->input('aksi') === 'diajukan' ? 'diajukan' : 'draft';
        $isRevisiSebelumnya = $pengajuan->is_revisi;

        if ($statusAksi === 'diajukan') {
            $hapusIds = (array) $request->input('hapus_dokumen', []);
            $sisaDokumenLama = $pengajuan->dokumen()->whereNotIn('id_dokumen', $hapusIds)->count();
            $dokumenBaruCount = $request->hasFile('lampiran') ? count($request->file('lampiran')) : 0;

            if (($sisaDokumenLama + $dokumenBaruCount) < 1) {
                return back()->withErrors([
                    'lampiran' => 'Minimal satu berkas lampiran permohonan/RAB wajib diunggah sebelum mengirim pengajuan.',
                ]);
            }
        }

        DB::transaction(function () use ($request, $user, $pengajuan, $statusAksi, $isRevisiSebelumnya) {
            $unitPengusul = $user->unit?->nama_unit ?? '-';
            if ($user->subUnit) {
                $unitPengusul .= ' (' . $user->subUnit->nama_sub_unit . ')';
            }

            $keteranganParts = [
                "Perihal: {$request->input('perihal')}",
                "Unit Pengusul: {$unitPengusul}",
                "Sumber Dana: {$request->input('sumber_dana')}",
            ];

            if ($request->filled('id_ruangan')) {
                $ruangan = Ruangan::find($request->input('id_ruangan'));
                if ($ruangan) {
                    $keteranganParts[] = "Lokasi Penempatan: {$ruangan->nomor_ruangan} - {$ruangan->nama_ruangan}";
                }
            }

            $keteranganParts[] = "Alasan & Manfaat: {$request->input('alasan')}";
            $keterangan = implode("\n", $keteranganParts);

            // 1. Perbarui tabel pengajuan
            $pengajuan->update([
                'keterangan' => $keterangan,
                'status' => $statusAksi,
                'tanggal_pengajuan' => now(),
            ]);

            // 2. Perbarui rincian item pengadaan
            ItemPengadaan::query()->where('id_pengajuan', $pengajuan->id_pengajuan)->delete();

            foreach ($request->input('items', []) as $item) {
                $jumlah = (int) $item['jumlah'];
                $hargaSatuan = (float) $item['harga_satuan'];
                $estimasiAnggaran = $jumlah * $hargaSatuan;

                ItemPengadaan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_kategori' => $item['id_kategori'],
                    'nama_barang' => $item['nama_barang'],
                    'spesifikasi' => $item['spesifikasi'],
                    'jumlah' => $jumlah,
                    'estimasi_anggaran' => $estimasiAnggaran,
                ]);
            }

            // 3. Catat riwayat status
            if ($statusAksi === 'diajukan') {
                $catatanRiwayat = $isRevisiSebelumnya
                    ? 'Pengajuan pengadaan hasil perbaikan dikirim ulang oleh pemohon'
                    : 'Pengajuan pengadaan dikirim oleh pemohon';

                RiwayatStatusPengajuan::query()->create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_pengguna' => $user->id_pengguna,
                    'status_baru' => 'diajukan',
                    'catatan' => $catatanRiwayat,
                    'waktu' => now(),
                ]);
            } else {
                // Ketika masih berstatus draft, jangan buat baris baru di riwayat_status_pengajuan
                // Cukup perbarui waktu pada baris 'draft' terakhir
                $this->statusService->perbaruiWaktuDraft($pengajuan, $user->id_pengguna);
            }

            // 4. Hapus dokumen yang dipilih jika ada
            if ($request->filled('hapus_dokumen') && is_array($request->input('hapus_dokumen'))) {
                $dokumenDihapus = Dokumen::query()
                    ->where('id_pengajuan', $pengajuan->id_pengajuan)
                    ->whereIn('id_dokumen', $request->input('hapus_dokumen'))
                    ->get();

                $disk = Storage::disk('public');
                foreach ($dokumenDihapus as $doc) {
                    if ($disk->exists($doc->path_file)) {
                        $disk->delete($doc->path_file);
                    }
                    $doc->delete();
                }
            }

            // 5. Tambah dokumen baru jika ada
            if ($request->hasFile('lampiran')) {
                foreach ($request->file('lampiran') as $berkas) {
                    $path = $berkas->store('dokumen/pengadaan', 'public');
                    $namaAsli = Str::limit($berkas->getClientOriginalName(), 145);

                    Dokumen::query()->create([
                        'id_pengajuan' => $pengajuan->id_pengajuan,
                        'id_aset' => null,
                        'id_pengunggah' => $user->id_pengguna,
                        'jenis_dokumen' => 'surat_pengajuan',
                        'nama_file' => $namaAsli,
                        'path_file' => $path,
                        'tanggal_unggah' => now(),
                    ]);
                }
            }
        });

        $pesanStatus = $statusAksi === 'diajukan'
            ? ($isRevisiSebelumnya ? 'Pengajuan hasil revisi berhasil dikirim ulang.' : 'Pengajuan pengadaan berhasil dikirim.')
            : 'Perubahan draf pengajuan pengadaan berhasil disimpan.';

        return redirect()->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)->with('status', $pesanStatus);
    }

    /**
     * Hasilkan nomor pengajuan unik dengan format PGD-YYYY-XXXX.
     */
    private function generateNomorPengajuan(): string
    {
        $tahun = now()->format('Y');
        $prefix = "PGD-{$tahun}-";

        $terakhir = Pengajuan::query()
            ->where('nomor_pengajuan', 'like', "{$prefix}%")
            ->lockForUpdate()
            ->orderByDesc('nomor_pengajuan')
            ->value('nomor_pengajuan');

        $nomorUrut = 1;
        if ($terakhir && preg_match('/^PGD-\d{4}-(\d{4})$/', $terakhir, $matches)) {
            $nomorUrut = ((int) $matches[1]) + 1;
        }

        $nomorPengajuan = $prefix . str_pad((string) $nomorUrut, 4, '0', STR_PAD_LEFT);

        while (Pengajuan::query()->where('nomor_pengajuan', $nomorPengajuan)->exists()) {
            $nomorUrut++;
            $nomorPengajuan = $prefix . str_pad((string) $nomorUrut, 4, '0', STR_PAD_LEFT);
        }

        return $nomorPengajuan;
    }
}
