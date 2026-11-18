<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProsesMutasiRequest;
use App\Http\Requests\StoreMutasiRequest;
use App\Http\Requests\UpdateMutasiRequest;
use App\Models\Aset;
use App\Models\Dokumen;
use App\Models\ItemMutasi;
use App\Models\Pengajuan;
use App\Models\PenempatanAset;
use App\Models\RiwayatStatusPengajuan;
use App\Models\Ruangan;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\PengajuanStatusService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MutasiController extends Controller
{
    public function __construct(
        protected ?PengajuanStatusService $statusService = null
    ) {
        $this->statusService = $statusService ?? app(PengajuanStatusService::class);
    }

    /**
     * Tampilkan formulir pengajuan mutasi aset baru untuk Pemohon.
     */
    public function create(Request $request): Response
    {
        $user = $request->user()->load(['unit', 'subUnit']);

        // Ambil daftar aset aktif yang memiliki penempatan aktif di unit pemohon
        $queryAset = Aset::query()
            ->where('status_aset', 'aktif')
            ->whereHas('penempatan', fn ($q) => $q->whereNull('tanggal_selesai'))
            ->with([
                'kategori',
                'penempatanAktif.ruangan.gedung',
                'penempatanAktif.penanggungJawab',
            ]);

        if (! empty($user->id_unit)) {
            $queryAset->whereHas('penempatan', function ($q) use ($user) {
                $q->whereNull('tanggal_selesai')
                    ->whereHas('ruangan', fn ($qr) => $qr->where('id_unit', $user->id_unit));
            });
        }

        // Kecualikan aset yang sedang berada dalam pengajuan mutasi/penghapusan aktif lain
        $queryAset->whereDoesntHave('mutasi', function ($q) {
            $q->whereHas('pengajuan', function ($qp) {
                $qp->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
            });
        })->whereDoesntHave('penghapusan', function ($q) {
            $q->whereHas('pengajuan', function ($qp) {
                $qp->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
            });
        });

        $daftarAset = $queryAset->orderBy('nama_barang')->get()->map(function (Aset $aset) {
            $penempatan = $aset->penempatanAktif;
            $ruangan = $penempatan?->ruangan;
            $gedung = $ruangan?->gedung;
            $pj = $penempatan?->penanggungJawab;

            return [
                'id_aset' => $aset->id_aset,
                'kode_aset' => $aset->kode_aset,
                'nama_barang' => $aset->nama_barang,
                'kategori' => $aset->kategori?->nama_kategori ?? '-',
                'kondisi' => $aset->kondisi,
                'spesifikasi' => $aset->spesifikasi,
                'id_ruangan_asal' => $penempatan?->id_ruangan,
                'ruangan_asal_nama' => $ruangan ? ($gedung ? "{$gedung->nama_gedung} - {$ruangan->nama_ruangan}" : $ruangan->nama_ruangan) : 'Belum ditentukan',
                'id_pengguna_pj_asal' => $penempatan?->id_pengguna_pj,
                'pj_asal_nama' => $pj?->nama_lengkap ?? 'Belum ditentukan',
            ];
        });

        $daftarRuangan = Ruangan::query()
            ->with(['gedung', 'unit'])
            ->orderBy('nama_ruangan')
            ->get()
            ->map(fn (Ruangan $r) => [
                'id_ruangan' => $r->id_ruangan,
                'nomor_ruangan' => $r->nomor_ruangan,
                'nama_ruangan' => $r->nama_ruangan,
                'gedung_nama' => $r->gedung?->nama_gedung ?? '-',
                'unit_nama' => $r->unit?->nama_unit ?? '-',
                'label' => ($r->gedung ? "{$r->gedung->nama_gedung} - " : '') . "{$r->nomor_ruangan} ({$r->nama_ruangan})",
            ]);

        $daftarPengguna = User::query()
            ->where('is_aktif', true)
            ->orderBy('nama_lengkap')
            ->get(['id_pengguna', 'nama_lengkap', 'nip', 'email']);

        return Inertia::render('Mutasi/Create', [
            'pemohon' => [
                'id_pengguna' => $user->id_pengguna,
                'nama_lengkap' => $user->nama_lengkap,
                'nip' => $user->nip,
                'unit_nama' => $user->unit?->nama_unit ?? 'Fakultas Teknologi Informasi',
                'sub_unit_nama' => $user->subUnit?->nama_sub_unit,
            ],
            'daftarAset' => $daftarAset,
            'daftarRuangan' => $daftarRuangan,
            'daftarPengguna' => $daftarPengguna,
        ]);
    }

    /**
     * Simpan pengajuan mutasi aset baru (draf atau diajukan).
     */
    public function store(StoreMutasiRequest $request): RedirectResponse
    {
        $user = $request->user()->load(['unit', 'subUnit']);
        $status = $request->input('aksi') === 'draft' ? 'draft' : 'diajukan';

        $pengajuan = DB::transaction(function () use ($request, $user, $status) {
            $nomorPengajuan = $this->generateNomorPengajuan();

            $unitPengusul = $user->unit?->nama_unit ?? '-';
            if ($user->subUnit) {
                $unitPengusul .= ' (' . $user->subUnit->nama_sub_unit . ')';
            }

            $keteranganParts = [
                "Perihal: {$request->input('perihal')}",
                "Unit Pengusul: {$unitPengusul}",
                "Jenis Mutasi: {$request->input('jenis_mutasi')}",
                "Tanggal Usulan Pemindahan: {$request->input('tanggal_mutasi')}",
                "Alasan & Manfaat: {$request->input('alasan_mutasi')}",
            ];
            $keterangan = implode("\n", $keteranganParts);

            // 1. Simpan tabel pengajuan
            $pengajuan = Pengajuan::create([
                'id_pemohon' => $user->id_pengguna,
                'nomor_pengajuan' => $nomorPengajuan,
                'jenis_pengajuan' => 'mutasi',
                'tanggal_pengajuan' => now(),
                'keterangan' => $keterangan,
                'status' => $status,
            ]);

            // 2. Simpan item_mutasi
            foreach ($request->input('items', []) as $itemData) {
                ItemMutasi::create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_aset' => $itemData['id_aset'],
                    'id_ruangan_tujuan' => $itemData['id_ruangan_tujuan'],
                    'id_pengguna_pj' => $itemData['id_pengguna_pj_tujuan'] ?? null,
                ]);
            }

            // 3. Simpan berkas lampiran
            if ($request->hasFile('lampiran')) {
                foreach ($request->file('lampiran') as $file) {
                    if (! $file->isValid()) {
                        continue;
                    }

                    $namaAsli = $file->getClientOriginalName();
                    $namaSimpan = Str::uuid() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs("dokumen/mutasi/{$pengajuan->id_pengajuan}", $namaSimpan, 'public');

                    Dokumen::create([
                        'id_pengajuan' => $pengajuan->id_pengajuan,
                        'id_pengunggah' => $user->id_pengguna,
                        'nama_file' => $namaAsli,
                        'path_file' => $path,
                        'jenis_dokumen' => 'surat_persetujuan',
                        'tanggal_unggah' => now(),
                    ]);
                }
            }

            // 4. Catat riwayat status
            $catatanRiwayat = $status === 'draft'
                ? 'Draf pengajuan mutasi disimpan'
                : 'Pengajuan mutasi dikirim oleh pemohon';

            RiwayatStatusPengajuan::create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $user->id_pengguna,
                'status_baru' => $status,
                'catatan' => $catatanRiwayat,
                'waktu' => now(),
            ]);

            // 5. Audit log
            ActivityLogger::record(
                $status === 'draft' ? 'simpan_draft_mutasi' : 'kirim_pengajuan_mutasi',
                'pengajuan',
                $pengajuan->id_pengajuan,
                $status === 'draft'
                    ? "Menyimpan draf pengajuan mutasi {$pengajuan->nomor_pengajuan}"
                    : "Mengirimkan pengajuan mutasi {$pengajuan->nomor_pengajuan}",
                $user->id_pengguna
            );

            return $pengajuan;
        });

        $pesanStatus = $request->input('aksi') === 'draft'
            ? 'Draf pengajuan mutasi aset berhasil disimpan.'
            : 'Pengajuan mutasi aset berhasil dikirim ke antrean verifikasi Operator.';

        return redirect()
            ->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
            ->with('status', $pesanStatus);
    }

    /**
     * Tampilkan formulir edit mutasi aset (untuk status 'draft' / perlu revisi).
     */
    public function edit(Request $request, Pengajuan $pengajuan): Response
    {
        $user = $request->user();

        if ($pengajuan->id_pemohon !== $user->id_pengguna) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah pengajuan mutasi ini.');
        }

        if ($pengajuan->status !== 'draft') {
            abort(403, 'Pengajuan mutasi yang sudah diproses atau disetujui tidak dapat diedit.');
        }

        if ($pengajuan->jenis_pengajuan !== 'mutasi') {
            abort(404, 'Formulir edit ini hanya untuk pengajuan mutasi.');
        }

        $pengajuan->load([
            'itemMutasi.aset.kategori',
            'itemMutasi.aset.penempatanAktif.ruangan.gedung',
            'itemMutasi.aset.penempatanAktif.penanggungJawab',
            'itemMutasi.ruanganTujuan.gedung',
            'itemMutasi.penanggungJawabTujuan',
            'dokumen',
            'riwayatStatus.pengguna',
        ]);

        // Ekstraksi data keterangan
        $perihal = '';
        if (preg_match('/^Perihal:\s*(.*)$/m', $pengajuan->keterangan, $m)) {
            $perihal = trim($m[1]);
        }
        $jenisMutasi = 'Antarruangan dalam fakultas';
        if (preg_match('/^Jenis Mutasi:\s*(.*)$/m', $pengajuan->keterangan, $m)) {
            $jenisMutasi = trim($m[1]);
        }
        $tanggalMutasi = '';
        if (preg_match('/^Tanggal Usulan Pemindahan:\s*(.*)$/m', $pengajuan->keterangan, $m)) {
            $tanggalMutasi = trim($m[1]);
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

        $isRevisi = $pengajuan->is_revisi;
        $catatanRevisiTerakhir = null;
        if ($isRevisi) {
            $riwayatRevisi = $pengajuan->riwayatStatus
                ->filter(function ($r) {
                    $catatan = strtolower($r->catatan ?? '');
                    return str_contains($catatan, 'kembali') || str_contains($catatan, 'revisi') || str_contains($catatan, 'perbaikan');
                })
                ->sortByDesc('id_riwayat_status')
                ->first();
            $catatanRevisiTerakhir = $riwayatRevisi?->catatan;
        }

        // Ambil daftar aset yang dapat dipilih (aset unit + aset yang sudah ada dalam pengajuan ini)
        $asetTerpilihIds = $pengajuan->itemMutasi->pluck('id_aset')->all();

        $queryAset = Aset::query()
            ->where('status_aset', 'aktif')
            ->whereHas('penempatan', fn ($q) => $q->whereNull('tanggal_selesai'))
            ->with(['kategori', 'penempatanAktif.ruangan.gedung', 'penempatanAktif.penanggungJawab']);

        if (! empty($user->id_unit)) {
            $queryAset->whereHas('penempatan', function ($q) use ($user) {
                $q->whereNull('tanggal_selesai')
                    ->whereHas('ruangan', fn ($qr) => $qr->where('id_unit', $user->id_unit));
            });
        }

        // Kecualikan aset yang ada di pengajuan lain yang aktif
        $queryAset->where(function ($q) use ($pengajuan, $asetTerpilihIds) {
            $q->whereIn('id_aset', $asetTerpilihIds)
                ->orWhere(function ($sub) use ($pengajuan) {
                    $sub->whereDoesntHave('mutasi', function ($qm) use ($pengajuan) {
                        $qm->where('id_pengajuan', '!=', $pengajuan->id_pengajuan)
                            ->whereHas('pengajuan', function ($qp) {
                                $qp->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
                            });
                    })->whereDoesntHave('penghapusan', function ($qp) {
                        $qp->whereHas('pengajuan', function ($qpp) {
                            $qpp->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
                        });
                    });
                });
        });

        $daftarAset = $queryAset->orderBy('nama_barang')->get()->map(function (Aset $aset) {
            $penempatan = $aset->penempatanAktif;
            $ruangan = $penempatan?->ruangan;
            $gedung = $ruangan?->gedung;
            $pj = $penempatan?->penanggungJawab;

            return [
                'id_aset' => $aset->id_aset,
                'kode_aset' => $aset->kode_aset,
                'nama_barang' => $aset->nama_barang,
                'kategori' => $aset->kategori?->nama_kategori ?? '-',
                'kondisi' => $aset->kondisi,
                'spesifikasi' => $aset->spesifikasi,
                'id_ruangan_asal' => $penempatan?->id_ruangan,
                'ruangan_asal_nama' => $ruangan ? ($gedung ? "{$gedung->nama_gedung} - {$ruangan->nama_ruangan}" : $ruangan->nama_ruangan) : 'Belum ditentukan',
                'id_pengguna_pj_asal' => $penempatan?->id_pengguna_pj,
                'pj_asal_nama' => $pj?->nama_lengkap ?? 'Belum ditentukan',
            ];
        });

        $daftarRuangan = Ruangan::query()
            ->with(['gedung', 'unit'])
            ->orderBy('nama_ruangan')
            ->get()
            ->map(fn (Ruangan $r) => [
                'id_ruangan' => $r->id_ruangan,
                'nomor_ruangan' => $r->nomor_ruangan,
                'nama_ruangan' => $r->nama_ruangan,
                'gedung_nama' => $r->gedung?->nama_gedung ?? '-',
                'unit_nama' => $r->unit?->nama_unit ?? '-',
                'label' => ($r->gedung ? "{$r->gedung->nama_gedung} - " : '') . "{$r->nomor_ruangan} ({$r->nama_ruangan})",
            ]);

        $daftarPengguna = User::query()
            ->where('is_aktif', true)
            ->orderBy('nama_lengkap')
            ->get(['id_pengguna', 'nama_lengkap', 'nip', 'email']);

        $user->load(['unit', 'subUnit']);

        return Inertia::render('Mutasi/Edit', [
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
                'jenis_mutasi' => $jenisMutasi,
                'tanggal_mutasi' => $tanggalMutasi,
                'alasan_mutasi' => $alasan,
                'items' => $pengajuan->itemMutasi->map(function ($it) {
                    $penempatanAktif = $it->aset?->penempatanAktif;
                    return [
                        'id_item_mutasi' => $it->id_item_mutasi,
                        'id_aset' => $it->id_aset,
                        'id_ruangan_tujuan' => $it->id_ruangan_tujuan,
                        'id_pengguna_pj_tujuan' => $it->id_pengguna_pj,
                        'kode_aset' => $it->aset?->kode_aset,
                        'nama_barang' => $it->aset?->nama_barang,
                        'kategori' => $it->aset?->kategori?->nama_kategori ?? '-',
                        'kondisi' => $it->aset?->kondisi,
                        'id_ruangan_asal' => $penempatanAktif?->id_ruangan,
                        'ruangan_asal_nama' => $penempatanAktif?->ruangan?->nama_ruangan,
                        'id_pengguna_pj_asal' => $penempatanAktif?->id_pengguna_pj,
                        'pj_asal_nama' => $penempatanAktif?->penanggungJawab?->nama_lengkap,
                    ];
                }),
                'dokumen' => $pengajuan->dokumen->map(fn ($doc) => [
                    'id_dokumen' => $doc->id_dokumen,
                    'nama_file' => $doc->nama_file,
                    'path_file' => $doc->path_file,
                    'url' => route('dokumen.unduh', $doc->id_dokumen),
                    'tanggal_unggah' => $doc->tanggal_unggah?->format('d M Y, H:i') ?? '-',
                ]),
            ],
            'daftarAset' => $daftarAset,
            'daftarRuangan' => $daftarRuangan,
            'daftarPengguna' => $daftarPengguna,
        ]);
    }

    /**
     * Perbarui pengajuan mutasi aset draf/revisi.
     */
    public function update(UpdateMutasiRequest $request, Pengajuan $pengajuan): RedirectResponse
    {
        $user = $request->user()->load(['unit', 'subUnit']);
        $statusTujuan = $request->input('aksi') === 'draft' ? 'draft' : 'diajukan';

        DB::transaction(function () use ($request, $user, $pengajuan, $statusTujuan) {
            $unitPengusul = $user->unit?->nama_unit ?? '-';
            if ($user->subUnit) {
                $unitPengusul .= ' (' . $user->subUnit->nama_sub_unit . ')';
            }

            $keteranganParts = [
                "Perihal: {$request->input('perihal')}",
                "Unit Pengusul: {$unitPengusul}",
                "Jenis Mutasi: {$request->input('jenis_mutasi')}",
                "Tanggal Usulan Pemindahan: {$request->input('tanggal_mutasi')}",
                "Alasan & Manfaat: {$request->input('alasan_mutasi')}",
            ];
            $keterangan = implode("\n", $keteranganParts);

            // 1. Update tabel pengajuan
            $pengajuan->update([
                'keterangan' => $keterangan,
            ]);

            // 2. Sync item_mutasi
            ItemMutasi::where('id_pengajuan', $pengajuan->id_pengajuan)->delete();
            foreach ($request->input('items', []) as $itemData) {
                ItemMutasi::create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_aset' => $itemData['id_aset'],
                    'id_ruangan_tujuan' => $itemData['id_ruangan_tujuan'],
                    'id_pengguna_pj' => $itemData['id_pengguna_pj_tujuan'] ?? null,
                ]);
            }

            // 3. Hapus dokumen yang ditandai hapus
            if ($request->filled('hapus_dokumen')) {
                $dokumenDihapus = Dokumen::where('id_pengajuan', $pengajuan->id_pengajuan)
                    ->whereIn('id_dokumen', $request->input('hapus_dokumen'))
                    ->get();

                foreach ($dokumenDihapus as $dok) {
                    Storage::disk('public')->delete($dok->path_file);
                    $dok->delete();
                }
            }

            // 4. Unggah berkas dokumen baru
            if ($request->hasFile('lampiran')) {
                foreach ($request->file('lampiran') as $file) {
                    if (! $file->isValid()) {
                        continue;
                    }

                    $namaAsli = $file->getClientOriginalName();
                    $namaSimpan = Str::uuid() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs("dokumen/mutasi/{$pengajuan->id_pengajuan}", $namaSimpan, 'public');

                    Dokumen::create([
                        'id_pengajuan' => $pengajuan->id_pengajuan,
                        'id_pengunggah' => $user->id_pengguna,
                        'nama_file' => $namaAsli,
                        'path_file' => $path,
                        'jenis_dokumen' => 'surat_persetujuan',
                        'tanggal_unggah' => now(),
                    ]);
                }
            }

            // 5. Update status & lini masa
            if ($statusTujuan === 'diajukan') {
                $this->statusService->kirimDraft($pengajuan, $user->id_pengguna);

                ActivityLogger::record(
                    'kirim_ulang_mutasi',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Mengirimkan pengajuan mutasi {$pengajuan->nomor_pengajuan} ke antrean verifikasi",
                    $user->id_pengguna
                );
            } else {
                // Jangan menambah baris riwayat baru jika tetap draf
                $riwayatDraftTerakhir = RiwayatStatusPengajuan::where('id_pengajuan', $pengajuan->id_pengajuan)
                    ->where('status_baru', 'draft')
                    ->orderByDesc('id_riwayat_status')
                    ->first();

                if ($riwayatDraftTerakhir) {
                    $riwayatDraftTerakhir->update(['waktu' => now()]);
                }

                ActivityLogger::record(
                    'update_draft_mutasi',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Memperbarui draf pengajuan mutasi {$pengajuan->nomor_pengajuan}",
                    $user->id_pengguna
                );
            }
        });

        $pesanStatus = $statusTujuan === 'diajukan'
            ? 'Pengajuan mutasi aset berhasil dikirim ke antrean verifikasi Operator.'
            : 'Perubahan draf pengajuan mutasi aset berhasil disimpan.';

        return redirect()
            ->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
            ->with('status', $pesanStatus);
    }

    /**
     * Tampilkan meja kerja Operator untuk pemrosesan dan riwayat mutasi aset.
     */
    public function indexOperator(Request $request): Response
    {
        // 1. Antrean mutasi yang siap dieksekusi (status: disetujui_pimpinan)
        $antreanMutasi = Pengajuan::query()
            ->where('jenis_pengajuan', 'mutasi')
            ->where('status', 'disetujui_pimpinan')
            ->with([
                'pemohon.unit',
                'itemMutasi.aset.kategori',
                'itemMutasi.aset.penempatanAktif.ruangan.gedung',
                'itemMutasi.aset.penempatanAktif.penanggungJawab',
                'itemMutasi.ruanganTujuan.gedung',
                'itemMutasi.penanggungJawabTujuan',
                'dokumen',
                'riwayatStatus.pengguna',
            ])
            ->orderByDesc('id_pengajuan')
            ->get()
            ->map(function (Pengajuan $p) {
                $p->mutasi_meta = $this->ekstrakMutasiMeta($p);
                // Pasang ruanganAsal dan penanggungJawabAsal pada setiap itemMutasi
                $p->itemMutasi->each(function (ItemMutasi $item) {
                    $penempatan = $item->aset?->penempatanAktif;
                    $ruanganAsal = $penempatan?->ruangan;
                    $pjAsal = $penempatan?->penanggungJawab;

                    $item->setRelation('ruanganAsal', $ruanganAsal);
                    $item->setRelation('ruangan_asal', $ruanganAsal);
                    $item->setRelation('penanggungJawabAsal', $pjAsal);
                    $item->setRelation('penanggung_jawab_asal', $pjAsal);
                });
                return $p;
            });

        // 2. Riwayat mutasi yang telah selesai dieksekusi (status: selesai)
        $queryRiwayat = Pengajuan::query()
            ->where('jenis_pengajuan', 'mutasi')
            ->where('status', 'selesai')
            ->with([
                'pemohon.unit',
                'itemMutasi.aset.kategori',
                'itemMutasi.ruanganAsal.gedung',
                'itemMutasi.ruanganTujuan.gedung',
                'itemMutasi.penanggungJawabAsal',
                'itemMutasi.penanggungJawabTujuan',
                'dokumen',
                'beritaAcara',
                'riwayatStatus.pengguna',
            ]);

        if ($request->filled('q')) {
            $q = trim($request->q);
            $queryRiwayat->where(function ($sub) use ($q) {
                $sub->where('nomor_pengajuan', 'like', "%{$q}%")
                    ->orWhere('keterangan', 'like', "%{$q}%")
                    ->orWhereHas('pemohon', fn ($qp) => $qp->where('nama_lengkap', 'like', "%{$q}%"))
                    ->orWhereHas('itemMutasi.aset', fn ($qa) => $qa->where('nama_barang', 'like', "%{$q}%")->orWhere('kode_aset', 'like', "%{$q}%"))
                    ->orWhereHas('itemMutasi.ruanganTujuan', fn ($qr) => $qr->where('nama_ruangan', 'like', "%{$q}%"));
            });
        }

        $riwayatMutasi = $queryRiwayat->orderByDesc('id_pengajuan')
            ->paginate(10)
            ->withQueryString()
            ->through(function (Pengajuan $p) {
                $p->mutasi_meta = $this->ekstrakMutasiMeta($p);
                $p->itemMutasi->each(function (ItemMutasi $item) {
                    $ruanganAsal = $item->ruanganAsal;
                    $pjAsal = $item->penanggungJawabAsal;

                    if (! $ruanganAsal || ! $pjAsal) {
                        $penempatanLama = PenempatanAset::with(['ruangan.gedung', 'penanggungJawab'])
                            ->where('id_aset', $item->id_aset)
                            ->whereNotNull('tanggal_selesai')
                            ->orderByDesc('id_penempatan')
                            ->first();

                        $ruanganAsal = $ruanganAsal ?? $penempatanLama?->ruangan ?? $item->aset?->penempatanAktif?->ruangan;
                        $pjAsal = $pjAsal ?? $penempatanLama?->penanggungJawab ?? $item->aset?->penempatanAktif?->penanggungJawab;
                    }

                    $item->setRelation('ruanganAsal', $ruanganAsal);
                    $item->setRelation('ruangan_asal', $ruanganAsal);
                    $item->setRelation('penanggungJawabAsal', $pjAsal);
                    $item->setRelation('penanggung_jawab_asal', $pjAsal);
                });
                return $p;
            });

        // 3. Referensi Ruangan dan Pengguna
        $daftarRuangan = Ruangan::query()
            ->with(['gedung', 'unit'])
            ->orderBy('nama_ruangan')
            ->get(['id_ruangan', 'id_gedung', 'id_unit', 'nomor_ruangan', 'nama_ruangan']);

        $daftarPengguna = User::query()
            ->where('is_aktif', true)
            ->orderBy('nama_lengkap')
            ->get(['id_pengguna', 'nama_lengkap', 'nip', 'email']);

        // 4. Statistik Meja Kerja Operator Mutasi
        $statistik = [
            'siap_diproses' => Pengajuan::where('jenis_pengajuan', 'mutasi')->where('status', 'disetujui_pimpinan')->count(),
            'menunggu_persetujuan' => Pengajuan::where('jenis_pengajuan', 'mutasi')->whereIn('status', ['diajukan', 'disetujui_kadep'])->count(),
            'mutasi_selesai' => Pengajuan::where('jenis_pengajuan', 'mutasi')->where('status', 'selesai')->count(),
            'total_aset_dimutasi' => ItemMutasi::whereHas('pengajuan', fn ($q) => $q->where('status', 'selesai'))->count(),
        ];

        return Inertia::render('Mutasi/Index', [
            'antreanMutasi' => $antreanMutasi,
            'riwayatMutasi' => $riwayatMutasi,
            'daftarRuangan' => $daftarRuangan,
            'daftarPengguna' => $daftarPengguna,
            'statistik' => $statistik,
            'filters' => [
                'q' => $request->input('q', ''),
            ],
        ]);
    }

    /**
     * Eksekusi pemindahan aset dan pembaruan penempatan oleh Operator.
     */
    public function proses(ProsesMutasiRequest $request, Pengajuan $pengajuan): RedirectResponse
    {
        $user = $request->user();

        if ($pengajuan->jenis_pengajuan !== 'mutasi') {
            abort(422, 'Pengajuan ini bukan pengajuan mutasi aset.');
        }

        if ($pengajuan->status !== 'disetujui_pimpinan') {
            abort(422, 'Pengajuan mutasi belum disetujui Pimpinan atau sudah selesai diproses.');
        }

        DB::transaction(function () use ($request, $user, $pengajuan) {
            $tanggalEksekusi = $request->filled('tanggal_eksekusi')
                ? Carbon::parse($request->tanggal_eksekusi)
                : now();

            $catatanEksekusi = $request->input('catatan_mutasi');
            $nomorDisposisi = $request->input('nomor_disposisi');

            $itemsInput = collect($request->input('items', []))->keyBy('id_item_mutasi');

            $pengajuan->load(['itemMutasi.aset']);

            foreach ($pengajuan->itemMutasi as $item) {
                $override = $itemsInput->get($item->id_item_mutasi);
                $ruanganTujuanFinal = $override['id_ruangan_tujuan'] ?? $item->id_ruangan_tujuan;
                $pjTujuanFinal = array_key_exists('id_pengguna_pj_tujuan', $override ?? [])
                    ? $override['id_pengguna_pj_tujuan']
                    : $item->id_pengguna_pj;

                // 1. Tutup penempatan lama yang masih aktif
                PenempatanAset::where('id_aset', $item->id_aset)
                    ->whereNull('tanggal_selesai')
                    ->update(['tanggal_selesai' => $tanggalEksekusi]);

                // 2. Buat penempatan baru
                $keteranganPenempatan = "Penempatan mutasi berdasarkan pengajuan {$pengajuan->nomor_pengajuan}";
                if ($nomorDisposisi) {
                    $keteranganPenempatan .= " (Disposisi: {$nomorDisposisi})";
                }
                if ($catatanEksekusi) {
                    $keteranganPenempatan .= ". {$catatanEksekusi}";
                }

                PenempatanAset::create([
                    'id_aset' => $item->id_aset,
                    'id_ruangan' => $ruanganTujuanFinal,
                    'id_pengguna_pj' => $pjTujuanFinal,
                    'id_item_mutasi' => $item->id_item_mutasi,
                    'tanggal_mulai' => $tanggalEksekusi,
                    'tanggal_selesai' => null,
                    'keterangan' => $keteranganPenempatan,
                ]);

                // Perbarui item_mutasi jika ada penyesuaian ruangan/PJ dari operator
                if ($ruanganTujuanFinal !== $item->id_ruangan_tujuan || $pjTujuanFinal !== $item->id_pengguna_pj) {
                    $item->update([
                        'id_ruangan_tujuan' => $ruanganTujuanFinal,
                        'id_pengguna_pj' => $pjTujuanFinal,
                    ]);
                }
            }

            // 3. Ubah status pengajuan menjadi selesai
            $catatanStatus = 'Mutasi aset telah selesai dieksekusi oleh Operator.';
            if ($catatanEksekusi) {
                $catatanStatus .= " Catatan: {$catatanEksekusi}";
            }

            $this->statusService->ubahStatus(
                $pengajuan,
                'selesai',
                $user->id_pengguna,
                $catatanStatus
            );

            // 4. Audit log
            ActivityLogger::record(
                'eksekusi_mutasi',
                'pengajuan',
                $pengajuan->id_pengajuan,
                "Eksekusi mutasi aset pengajuan {$pengajuan->nomor_pengajuan} selesai diproses ke ruangan baru",
                $user->id_pengguna
            );
        });

        return redirect()
            ->route('mutasi.index')
            ->with('status', "Mutasi aset untuk pengajuan {$pengajuan->nomor_pengajuan} berhasil diproses dan penempatan baru telah diperbarui.");
    }

    /**
     * Generate nomor pengajuan unik dengan format MTS-YYYY-XXXX.
     */
    protected function generateNomorPengajuan(): string
    {
        $tahun = date('Y');
        $prefix = "MTS-{$tahun}-";

        $terakhir = Pengajuan::query()
            ->where('nomor_pengajuan', 'like', "{$prefix}%")
            ->orderByDesc('nomor_pengajuan')
            ->lockForUpdate()
            ->first();

        $urutan = 1;
        if ($terakhir && preg_match('/' . preg_quote($prefix, '/') . '(\d+)/', $terakhir->nomor_pengajuan, $matches)) {
            $urutan = (int) $matches[1] + 1;
        }

        $nomor = sprintf('%s%04d', $prefix, $urutan);
        while (Pengajuan::where('nomor_pengajuan', $nomor)->exists()) {
            $urutan++;
            $nomor = sprintf('%s%04d', $prefix, $urutan);
        }

        return $nomor;
    }

    /**
     * Ekstrak metadata usulan mutasi dari teks pengajuan->keterangan.
     *
     * @return array{perihal: string, jenis_mutasi: string, tanggal_mutasi: string, alasan_mutasi: string}
     */
    private function ekstrakMutasiMeta(Pengajuan $pengajuan): array
    {
        $jenisMutasi = 'Antarruangan dalam fakultas';
        if (preg_match('/^Jenis Mutasi:\s*(.*)$/m', $pengajuan->keterangan ?? '', $m)) {
            $jenisMutasi = trim($m[1]);
        }

        $tanggalMutasi = '-';
        if (preg_match('/^Tanggal Usulan Pemindahan:\s*(.*)$/m', $pengajuan->keterangan ?? '', $m)) {
            $tanggalMutasi = trim($m[1]);
        }

        $alasanMutasi = '';
        if (preg_match('/^Alasan & Manfaat:\s*(.*)$/ms', $pengajuan->keterangan ?? '', $m)) {
            $alasanMutasi = trim($m[1]);
        } else {
            $alasanMutasi = $pengajuan->keterangan ?? '-';
        }

        $perihal = '-';
        if (preg_match('/^Perihal:\s*(.*)$/m', $pengajuan->keterangan ?? '', $m)) {
            $perihal = trim($m[1]);
        }

        return [
            'perihal' => $perihal,
            'jenis_mutasi' => $jenisMutasi,
            'tanggal_mutasi' => $tanggalMutasi,
            'alasan_mutasi' => $alasanMutasi,
        ];
    }
}
