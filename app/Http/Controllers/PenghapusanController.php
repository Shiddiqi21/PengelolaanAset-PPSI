<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProsesPenghapusanRequest;
use App\Http\Requests\StorePenghapusanRequest;
use App\Http\Requests\UpdatePenghapusanRequest;
use App\Models\Aset;
use App\Models\Dokumen;
use App\Models\ItemPenghapusan;
use App\Models\Pengajuan;
use App\Models\PenempatanAset;
use App\Models\RiwayatStatusPengajuan;
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

class PenghapusanController extends Controller
{
    public function __construct(
        protected ?PengajuanStatusService $statusService = null
    ) {
        $this->statusService = $statusService ?? app(PengajuanStatusService::class);
    }

    /**
     * Tampilkan formulir pengajuan penghapusan aset baru untuk Pemohon.
     */
    public function create(Request $request): Response
    {
        $user = $request->user()->load(['unit', 'subUnit']);

        // Ambil daftar aset aktif unit pemohon
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
                'tahun_perolehan' => $aset->tahun_perolehan ?? '-',
                'harga_perolehan' => (float) ($aset->harga_perolehan ?? 0),
                'spesifikasi' => $aset->spesifikasi,
                'ruangan_nama' => $ruangan ? ($gedung ? "{$gedung->nama_gedung} - {$ruangan->nama_ruangan}" : $ruangan->nama_ruangan) : 'Belum ditentukan',
                'pj_nama' => $pj?->nama_lengkap ?? 'Belum ditentukan',
            ];
        });

        return Inertia::render('Penghapusan/Create', [
            'pemohon' => [
                'id_pengguna' => $user->id_pengguna,
                'nama_lengkap' => $user->nama_lengkap,
                'nip' => $user->nip,
                'unit_nama' => $user->unit?->nama_unit ?? 'Fakultas Teknologi Informasi',
                'sub_unit_nama' => $user->subUnit?->nama_sub_unit,
            ],
            'daftarAset' => $daftarAset,
        ]);
    }

    /**
     * Simpan pengajuan usulan penghapusan baru (draf atau diajukan).
     */
    public function store(StorePenghapusanRequest $request): RedirectResponse
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
                "Dasar Usulan: {$request->input('dasar_usulan')}",
                "Alasan & Penjelasan Kondisi: {$request->input('alasan_penghapusan')}",
            ];
            $keterangan = implode("\n", $keteranganParts);

            // 1. Simpan tabel pengajuan
            $pengajuan = Pengajuan::create([
                'id_pemohon' => $user->id_pengguna,
                'nomor_pengajuan' => $nomorPengajuan,
                'jenis_pengajuan' => 'penghapusan',
                'tanggal_pengajuan' => now(),
                'keterangan' => $keterangan,
                'status' => $status,
            ]);

            // 2. Simpan item_penghapusan
            foreach ($request->input('items', []) as $itemData) {
                ItemPenghapusan::create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_aset' => $itemData['id_aset'],
                    'jalur_penghapusan' => null,
                    'catatan_tim_penilai' => null,
                    'pihak_penerima' => null,
                    'nilai_penjualan' => null,
                    'tanggal_penghapusan' => null,
                ]);
            }

            // 3. Simpan dokumen lampiran
            if ($request->hasFile('lampiran')) {
                foreach ($request->file('lampiran') as $file) {
                    if (! $file->isValid()) {
                        continue;
                    }

                    $namaAsli = $file->getClientOriginalName();
                    $namaSimpan = Str::uuid() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs("dokumen/penghapusan/{$pengajuan->id_pengajuan}", $namaSimpan, 'public');

                    Dokumen::create([
                        'id_pengajuan' => $pengajuan->id_pengajuan,
                        'id_pengunggah' => $user->id_pengguna,
                        'nama_file' => $namaAsli,
                        'path_file' => $path,
                        'jenis_dokumen' => 'surat_pengajuan',
                        'tanggal_unggah' => now(),
                    ]);
                }
            }

            // 4. Catat riwayat status
            $catatanRiwayat = $status === 'draft'
                ? 'Draf usulan penghapusan disimpan'
                : 'Usulan penghapusan aset diajukan ke antrean pemeriksaan';

            RiwayatStatusPengajuan::create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $user->id_pengguna,
                'status_baru' => $status,
                'catatan' => $catatanRiwayat,
                'waktu' => now(),
            ]);

            // 5. Audit log
            ActivityLogger::record(
                $status === 'draft' ? 'simpan_draft_penghapusan' : 'kirim_pengajuan_penghapusan',
                'pengajuan',
                $pengajuan->id_pengajuan,
                $status === 'draft'
                    ? "Menyimpan draf usulan penghapusan {$pengajuan->nomor_pengajuan}"
                    : "Mengirimkan usulan penghapusan aset {$pengajuan->nomor_pengajuan}",
                $user->id_pengguna
            );

            return $pengajuan;
        });

        $pesanStatus = $status === 'draft'
            ? 'Draf usulan penghapusan aset berhasil disimpan.'
            : 'Usulan penghapusan aset berhasil dikirim ke antrean verifikasi Operator.';

        return redirect()
            ->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
            ->with('status', $pesanStatus);
    }

    /**
     * Tampilkan formulir edit usulan penghapusan (status 'draft' / perlu revisi).
     */
    public function edit(Request $request, Pengajuan $pengajuan): Response
    {
        $user = $request->user();

        if ($pengajuan->id_pemohon !== $user->id_pengguna) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah usulan penghapusan ini.');
        }

        if ($pengajuan->status !== 'draft') {
            abort(403, 'Usulan penghapusan yang sudah diproses atau disetujui tidak dapat diedit.');
        }

        if ($pengajuan->jenis_pengajuan !== 'penghapusan') {
            abort(404, 'Formulir edit ini hanya untuk usulan penghapusan aset.');
        }

        $pengajuan->load([
            'itemPenghapusan.aset.kategori',
            'itemPenghapusan.aset.penempatanAktif.ruangan.gedung',
            'itemPenghapusan.aset.penempatanAktif.penanggungJawab',
            'dokumen',
            'riwayatStatus.pengguna',
        ]);

        // Ekstraksi data keterangan
        $perihal = '';
        if (preg_match('/^Perihal:\s*(.*)$/m', $pengajuan->keterangan, $m)) {
            $perihal = trim($m[1]);
        }
        $dasarUsulan = 'Rusak berat / tidak ekonomis';
        if (preg_match('/^Dasar Usulan:\s*(.*)$/m', $pengajuan->keterangan, $m)) {
            $dasarUsulan = trim($m[1]);
        }
        $alasan = '';
        if (preg_match('/^Alasan & Penjelasan Kondisi:\s*(.*)$/ms', $pengajuan->keterangan, $m)) {
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

        // Ambil daftar aset yang dapat dipilih
        $asetTerpilihIds = $pengajuan->itemPenghapusan->pluck('id_aset')->all();

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

        $queryAset->where(function ($q) use ($pengajuan, $asetTerpilihIds) {
            $q->whereIn('id_aset', $asetTerpilihIds)
                ->orWhere(function ($sub) use ($pengajuan) {
                    $sub->whereDoesntHave('mutasi', function ($qm) {
                        $qm->whereHas('pengajuan', function ($qp) {
                            $qp->whereIn('status', ['draft', 'diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses']);
                        });
                    })->whereDoesntHave('penghapusan', function ($qp) use ($pengajuan) {
                        $qp->where('id_pengajuan', '!=', $pengajuan->id_pengajuan)
                            ->whereHas('pengajuan', function ($qpp) {
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
                'tahun_perolehan' => $aset->tahun_perolehan ?? '-',
                'harga_perolehan' => (float) ($aset->harga_perolehan ?? 0),
                'spesifikasi' => $aset->spesifikasi,
                'ruangan_nama' => $ruangan ? ($gedung ? "{$gedung->nama_gedung} - {$ruangan->nama_ruangan}" : $ruangan->nama_ruangan) : 'Belum ditentukan',
                'pj_nama' => $pj?->nama_lengkap ?? 'Belum ditentukan',
            ];
        });

        $user->load(['unit', 'subUnit']);

        return Inertia::render('Penghapusan/Edit', [
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
                'dasar_usulan' => $dasarUsulan,
                'alasan_penghapusan' => $alasan,
                'items' => $pengajuan->itemPenghapusan->map(function ($it) {
                    $aset = $it->aset;
                    $penempatan = $aset?->penempatanAktif;
                    return [
                        'id_item_penghapusan' => $it->id_item_penghapusan,
                        'id_aset' => $it->id_aset,
                        'kode_aset' => $aset?->kode_aset,
                        'nama_barang' => $aset?->nama_barang,
                        'kategori' => $aset?->kategori?->nama_kategori ?? '-',
                        'kondisi' => $aset?->kondisi,
                        'tahun_perolehan' => $aset?->tahun_perolehan ?? '-',
                        'harga_perolehan' => (float) ($aset?->harga_perolehan ?? 0),
                        'ruangan_nama' => $penempatan?->ruangan?->nama_ruangan ?? '-',
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
        ]);
    }

    /**
     * Perbarui pengajuan penghapusan aset draf/revisi.
     */
    public function update(UpdatePenghapusanRequest $request, Pengajuan $pengajuan): RedirectResponse
    {
        $user = $request->user()->load(['unit', 'subUnit']);
        $statusTujuan = $request->input('aksi') === 'diajukan' ? 'diajukan' : 'draft';

        DB::transaction(function () use ($request, $user, $pengajuan, $statusTujuan) {
            $unitPengusul = $user->unit?->nama_unit ?? '-';
            if ($user->subUnit) {
                $unitPengusul .= ' (' . $user->subUnit->nama_sub_unit . ')';
            }

            $keteranganParts = [
                "Perihal: {$request->input('perihal')}",
                "Unit Pengusul: {$unitPengusul}",
                "Dasar Usulan: {$request->input('dasar_usulan')}",
                "Alasan & Penjelasan Kondisi: {$request->input('alasan_penghapusan')}",
            ];
            $keterangan = implode("\n", $keteranganParts);

            // 1. Update tabel pengajuan
            $pengajuan->update([
                'keterangan' => $keterangan,
            ]);

            // 2. Sync item_penghapusan
            ItemPenghapusan::where('id_pengajuan', $pengajuan->id_pengajuan)->delete();
            foreach ($request->input('items', []) as $itemData) {
                ItemPenghapusan::create([
                    'id_pengajuan' => $pengajuan->id_pengajuan,
                    'id_aset' => $itemData['id_aset'],
                    'jalur_penghapusan' => null,
                    'catatan_tim_penilai' => null,
                    'pihak_penerima' => null,
                    'nilai_penjualan' => null,
                    'tanggal_penghapusan' => null,
                ]);
            }

            // 3. Hapus dokumen yang ditandai
            if ($request->filled('hapus_dokumen')) {
                $dokumenDihapus = Dokumen::where('id_pengajuan', $pengajuan->id_pengajuan)
                    ->whereIn('id_dokumen', $request->input('hapus_dokumen'))
                    ->get();

                foreach ($dokumenDihapus as $dok) {
                    Storage::disk('public')->delete($dok->path_file);
                    $dok->delete();
                }
            }

            // 4. Unggah dokumen baru
            if ($request->hasFile('lampiran')) {
                foreach ($request->file('lampiran') as $file) {
                    if (! $file->isValid()) {
                        continue;
                    }

                    $namaAsli = $file->getClientOriginalName();
                    $namaSimpan = Str::uuid() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs("dokumen/penghapusan/{$pengajuan->id_pengajuan}", $namaSimpan, 'public');

                    Dokumen::create([
                        'id_pengajuan' => $pengajuan->id_pengajuan,
                        'id_pengunggah' => $user->id_pengguna,
                        'nama_file' => $namaAsli,
                        'path_file' => $path,
                        'jenis_dokumen' => 'surat_pengajuan',
                        'tanggal_unggah' => now(),
                    ]);
                }
            }

            // 5. Update status
            if ($statusTujuan === 'diajukan') {
                $this->statusService->kirimDraft($pengajuan, $user->id_pengguna);

                ActivityLogger::record(
                    'kirim_ulang_penghapusan',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Mengirimkan usulan penghapusan aset {$pengajuan->nomor_pengajuan} ke antrean pemeriksaan",
                    $user->id_pengguna
                );
            } else {
                $riwayatDraftTerakhir = RiwayatStatusPengajuan::where('id_pengajuan', $pengajuan->id_pengajuan)
                    ->where('status_baru', 'draft')
                    ->orderByDesc('id_riwayat_status')
                    ->first();

                if ($riwayatDraftTerakhir) {
                    $riwayatDraftTerakhir->update(['waktu' => now()]);
                }

                ActivityLogger::record(
                    'update_draft_penghapusan',
                    'pengajuan',
                    $pengajuan->id_pengajuan,
                    "Memperbarui draf usulan penghapusan aset {$pengajuan->nomor_pengajuan}",
                    $user->id_pengguna
                );
            }
        });

        $pesanStatus = $statusTujuan === 'diajukan'
            ? 'Usulan penghapusan aset berhasil dikirim ke antrean verifikasi Operator.'
            : 'Perubahan draf usulan penghapusan aset berhasil disimpan.';

        return redirect()
            ->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
            ->with('status', $pesanStatus);
    }

    /**
     * Tampilkan meja kerja Operator untuk pemrosesan penghapusan aset 3 jalur.
     */
    public function indexOperator(Request $request): Response
    {
        // 1. Antrean penghapusan siap eksekusi (status: disetujui_pimpinan atau diproses)
        $antreanPenghapusan = Pengajuan::query()
            ->where('jenis_pengajuan', 'penghapusan')
            ->whereIn('status', ['disetujui_pimpinan', 'diproses'])
            ->with([
                'pemohon.unit',
                'itemPenghapusan.aset.kategori',
                'itemPenghapusan.aset.penempatanAktif.ruangan.gedung',
                'itemPenghapusan.aset.penempatanAktif.penanggungJawab',
                'dokumen',
                'riwayatStatus.pengguna',
            ])
            ->orderByDesc('id_pengajuan')
            ->get();

        // 2. Riwayat penghapusan yang telah selesai
        $queryRiwayat = Pengajuan::query()
            ->where('jenis_pengajuan', 'penghapusan')
            ->where('status', 'selesai')
            ->with([
                'pemohon.unit',
                'itemPenghapusan.aset.kategori',
                'itemPenghapusan.aset.penempatanAktif.ruangan',
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
                    ->orWhereHas('itemPenghapusan.aset', fn ($qa) => $qa->where('nama_barang', 'like', "%{$q}%")->orWhere('kode_aset', 'like', "%{$q}%"))
                    ->orWhereHas('itemPenghapusan', fn ($qi) => $qi->where('pihak_penerima', 'like', "%{$q}%"));
            });
        }

        $riwayatPenghapusan = $queryRiwayat->orderByDesc('id_pengajuan')
            ->paginate(10)
            ->withQueryString();

        // 3. Statistik Meja Kerja Operator
        $statistik = [
            'siap_diproses' => Pengajuan::where('jenis_pengajuan', 'penghapusan')->whereIn('status', ['disetujui_pimpinan', 'diproses'])->count(),
            'menunggu_persetujuan' => Pengajuan::where('jenis_pengajuan', 'penghapusan')->whereIn('status', ['diajukan', 'disetujui_kadep'])->count(),
            'penghapusan_selesai' => Pengajuan::where('jenis_pengajuan', 'penghapusan')->where('status', 'selesai')->count(),
            'total_aset_dihapus' => ItemPenghapusan::whereHas('pengajuan', fn ($q) => $q->where('status', 'selesai'))->count(),
        ];

        return Inertia::render('Penghapusan/Index', [
            'antreanPenghapusan' => $antreanPenghapusan,
            'riwayatPenghapusan' => $riwayatPenghapusan,
            'statistik' => $statistik,
            'filters' => [
                'q' => $request->input('q', ''),
            ],
        ]);
    }

    /**
     * Eksekusi penghapusan aset 3 jalur oleh Operator Aset Fakultas.
     */
    public function proses(ProsesPenghapusanRequest $request, Pengajuan $pengajuan): RedirectResponse
    {
        $user = $request->user();

        if ($pengajuan->jenis_pengajuan !== 'penghapusan') {
            abort(422, 'Pengajuan ini bukan pengajuan penghapusan aset.');
        }

        if (! in_array($pengajuan->status, ['disetujui_pimpinan', 'diproses'], true)) {
            abort(422, 'Pengajuan penghapusan belum disetujui Pimpinan atau sudah selesai diproses.');
        }

        DB::transaction(function () use ($request, $user, $pengajuan) {
            $tanggalPenghapusan = Carbon::parse($request->tanggal_penghapusan);
            $jalur = $request->jalur_penghapusan;
            $pihakPenerima = in_array($jalur, ['sharing_internal', 'hibah_luar', 'hibah'], true)
                ? $request->pihak_penerima
                : null;

            $catatanPenilai = null;
            if (in_array($jalur, ['penjualan_lelang', 'penjualan'], true)) {
                $catatanPenilai = "Kajian Tim Peneliti: {$request->catatan_tim_peneliti}\nTim Penilai Rektorat: {$request->catatan_tim_penilai}";
                if ($request->nomor_persetujuan_rektor) {
                    $catatanPenilai .= "\nSK/Persetujuan Rektorat: {$request->nomor_persetujuan_rektor}";
                }
            } elseif ($request->nomor_persetujuan_rektor) {
                $catatanPenilai = "Persetujuan Rektorat: {$request->nomor_persetujuan_rektor}";
            }

            $nilaiPenjualan = in_array($jalur, ['penjualan_lelang', 'penjualan'], true)
                ? (float) $request->nilai_taksiran
                : null;

            $pengajuan->load(['itemPenghapusan.aset']);

            foreach ($pengajuan->itemPenghapusan as $item) {
                // 1. Simpan metadata eksekusi pada item_penghapusan
                $item->update([
                    'jalur_penghapusan' => $jalur,
                    'tanggal_penghapusan' => $tanggalPenghapusan,
                    'pihak_penerima' => $pihakPenerima,
                    'catatan_tim_penilai' => $catatanPenilai,
                    'nilai_penjualan' => $nilaiPenjualan,
                ]);

                // 2. Perbarui status dan kondisi aset di master aset
                if ($item->aset) {
                    $item->aset->update([
                        'status_aset' => 'dihapus',
                        'kondisi' => 'rusak_berat',
                    ]);

                    // 3. Tutup penempatan aktif di penempatan_aset
                    PenempatanAset::where('id_aset', $item->id_aset)
                        ->whereNull('tanggal_selesai')
                        ->update([
                            'tanggal_selesai' => $tanggalPenghapusan,
                            'keterangan' => 'Aset dihapuskan via ' . $jalur . ' berdasarkan usulan ' . $pengajuan->nomor_pengajuan,
                        ]);
                }
            }

            // 4. Unggah berkas SK Rektor / BAST / penilaian jika dilampirkan
            if ($request->hasFile('dokumen_sk')) {
                $file = $request->file('dokumen_sk');
                if ($file->isValid()) {
                    $namaAsli = $file->getClientOriginalName();
                    $namaSimpan = Str::uuid() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs("dokumen/penghapusan/{$pengajuan->id_pengajuan}", $namaSimpan, 'public');

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

            // 5. Ubah status pengajuan menjadi selesai
            $jalurLabel = match ($jalur) {
                'sharing_internal' => 'Sharing Internal UNAND',
                'hibah_luar', 'hibah' => 'Hibah Pihak Luar',
                'penjualan_lelang', 'penjualan' => 'Penjualan / Lelang',
                default => ucfirst($jalur),
            };

            $catatanSelesai = "Penghapusan aset resmi dieksekusi melalui jalur {$jalurLabel}.";
            if ($pihakPenerima) {
                $catatanSelesai .= " Penerima: {$pihakPenerima}.";
            }
            if ($request->nomor_persetujuan_rektor) {
                $catatanSelesai .= " SK Rektorat: {$request->nomor_persetujuan_rektor}.";
            }

            $this->statusService->ubahStatus(
                $pengajuan,
                'selesai',
                $user->id_pengguna,
                $catatanSelesai
            );

            // 6. Audit log
            ActivityLogger::record(
                'eksekusi_penghapusan',
                'pengajuan',
                $pengajuan->id_pengajuan,
                "Eksekusi penghapusan aset {$pengajuan->nomor_pengajuan} via jalur {$jalurLabel} berhasil diselesaikan",
                $user->id_pengguna
            );
        });

        return redirect()
            ->route('penghapusan.index')
            ->with('status', "Penghapusan aset untuk pengajuan {$pengajuan->nomor_pengajuan} berhasil dieksekusi dan status master aset telah diperbarui menjadi Dihapuskan.");
    }

    /**
     * Generate nomor pengajuan unik dengan format HPS-YYYY-XXXX.
     */
    protected function generateNomorPengajuan(): string
    {
        $tahun = date('Y');
        $prefix = "HPS-{$tahun}-";

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
}
