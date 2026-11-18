<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\Pengajuan;
use App\Services\PengajuanStatusService;
use App\Support\PeranNama;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PengajuanController extends Controller
{
    public function __construct(
        protected PengajuanStatusService $statusService
    ) {}

    // ─────────────────────────────────────────────────────────────
    // 1. PEMOHON (role:pemohon)
    // ─────────────────────────────────────────────────────────────

    /**
     * Tampilkan daftar seluruh pengajuan milik pemohon login.
     */
    public function indexPemohon(Request $request): Response
    {
        $user = $request->user();

        $query = Pengajuan::query()
            ->where('id_pemohon', $user->id_pengguna)
            ->with(['itemPengadaan', 'itemPerbaikan', 'itemMutasi', 'itemPenghapusan', 'riwayatStatus'])
            ->orderByDesc('tanggal_pengajuan')
            ->orderByDesc('id_pengajuan');

        if ($request->filled('jenis')) {
            $query->where('jenis_pengajuan', $request->jenis);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->where('nomor_pengajuan', 'like', $keyword)
                    ->orWhere('keterangan', 'like', $keyword);
            });
        }

        $daftarPengajuan = $query->paginate(10)->withQueryString()->through(function (Pengajuan $p) {
            $isRevisi = $p->is_revisi;
            $meta = self::getStatusMeta($p->status, $isRevisi);
            $totalEstimasi = $this->hitungTotalEstimasi($p);

            return [
                'id_pengajuan' => $p->id_pengajuan,
                'nomor_pengajuan' => $p->nomor_pengajuan,
                'jenis_pengajuan' => $p->jenis_pengajuan,
                'jenis_label' => ucfirst($p->jenis_pengajuan),
                'tanggal_pengajuan' => $p->tanggal_pengajuan?->format('d M Y') ?? '-',
                'keterangan_singkat' => $this->ambilPerihal($p->keterangan),
                'total_estimasi' => $totalEstimasi,
                'status' => $p->status,
                'is_revisi' => $isRevisi,
                'status_label' => $meta['label'],
                'status_nada' => $meta['nada'],
            ];
        });

        return Inertia::render('Pengajuan/Index', [
            'daftarPengajuan' => $daftarPengajuan,
            'filters' => [
                'q' => $request->q ?? '',
                'jenis' => $request->jenis ?? '',
                'status' => $request->status ?? '',
            ],
        ]);
    }

    /**
     * Tampilkan detail pengajuan dan pelacakan status milik pemohon.
     */
    public function showPemohon(Request $request, Pengajuan $pengajuan): Response
    {
        if ($pengajuan->id_pemohon !== $request->user()->id_pengguna) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat pengajuan ini.');
        }

        $detail = $this->formatPengajuanDetail($pengajuan);

        return Inertia::render('Pengajuan/Show', [
            'pengajuan' => $detail,
        ]);
    }

    /**
     * Kirim draf pengajuan oleh pemohon (draft -> diajukan).
     */
    public function kirimDraft(Request $request, Pengajuan $pengajuan): RedirectResponse
    {
        if ($pengajuan->id_pemohon !== $request->user()->id_pengguna) {
            abort(403, 'Anda tidak memiliki akses ke pengajuan ini.');
        }

        if ($pengajuan->status !== 'draft') {
            abort(422, 'Hanya pengajuan draf yang dapat dikirim.');
        }

        if ($pengajuan->jenis_pengajuan === 'pengadaan' && $pengajuan->dokumen()->count() < 1) {
            return redirect()->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
                ->withErrors([
                    'status' => 'Pengajuan tidak dapat dikirim karena belum ada dokumen lampiran (RAB/spesifikasi). Silakan klik Edit pengajuan untuk mengunggah berkas terlebih dahulu.',
                ]);
        }

        if ($pengajuan->jenis_pengajuan === 'mutasi' && $pengajuan->dokumen()->count() < 1) {
            return redirect()->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
                ->withErrors([
                    'status' => 'Pengajuan mutasi tidak dapat dikirim karena belum ada dokumen persetujuan/pendukung yang dilampirkan. Silakan klik Edit pengajuan untuk mengunggah berkas terlebih dahulu.',
                ]);
        }

        if ($pengajuan->jenis_pengajuan === 'penghapusan' && $pengajuan->dokumen()->count() < 1) {
            return redirect()->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
                ->withErrors([
                    'status' => 'Pengajuan penghapusan tidak dapat dikirim karena belum ada dokumen foto fisik atau surat usulan yang dilampirkan. Silakan klik Edit pengajuan untuk mengunggah berkas terlebih dahulu.',
                ]);
        }

        $this->statusService->kirimDraft($pengajuan, $request->user()->id_pengguna);

        return redirect()->route('pemohon.pengajuan.show', $pengajuan->id_pengajuan)
            ->with('status', 'Pengajuan berhasil dikirim.');
    }

    // ─────────────────────────────────────────────────────────────
    // 2. OPERATOR ASET FAKULTAS (role:operator)
    // ─────────────────────────────────────────────────────────────

    /**
     * Tampilkan antrean pemeriksaan pengajuan masuk bagi Operator.
     */
    public function indexOperator(Request $request): Response
    {
        $tab = $request->query('tab', 'antrean');
        if (! in_array($tab, ['antrean', 'menunggu', 'semua', 'riwayat'], true)) {
            $tab = 'antrean';
        }

        $query = Pengajuan::query()
            ->with(['pemohon.unit', 'itemPengadaan', 'itemPerbaikan', 'itemMutasi', 'itemPenghapusan', 'dokumen', 'riwayatStatus.pengguna.peran'])
            ->where('status', '!=', 'draft')
            ->orderByDesc('tanggal_pengajuan');

        if ($tab === 'antrean' || $tab === 'menunggu') {
            // Pengajuan masuk yang belum diverifikasi oleh Operator
            $query->where('status', 'diajukan')
                ->whereNotExists(function ($sub) {
                    $sub->selectRaw(1)
                        ->from('riwayat_status_pengajuan as r')
                        ->whereColumn('r.id_pengajuan', 'pengajuan.id_pengajuan')
                        ->where('r.catatan', 'like', 'Pemeriksaan Operator:%')
                        ->whereRaw('r.id_riwayat_status = (select max(r2.id_riwayat_status) from riwayat_status_pengajuan r2 where r2.id_pengajuan = pengajuan.id_pengajuan)');
                });
        } elseif ($tab === 'riwayat') {
            $query->where('status', '!=', 'diajukan');
        }

        if ($request->filled('jenis')) {
            $query->where('jenis_pengajuan', $request->jenis);
        }

        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->where('nomor_pengajuan', 'like', $keyword)
                    ->orWhere('keterangan', 'like', $keyword)
                    ->orWhereHas('pemohon', fn ($qp) => $qp->where('nama_lengkap', 'like', $keyword));
            });
        }

        $daftarPemeriksaan = $query->paginate(10)->withQueryString()->through(function (Pengajuan $p) {
            $meta = self::getStatusMeta($p->status);
            $totalEstimasi = $this->hitungTotalEstimasi($p);

            $terakhir = $p->riwayatStatus->sortByDesc('id_riwayat_status')->first();
            $sudahDiperiksaOperator = $p->status !== 'diajukan'
                ? (! in_array($p->status, ['draft'], true))
                : (bool) ($terakhir && str_contains($terakhir->catatan ?? '', 'Pemeriksaan Operator:'));
            $bisaDiperiksa = $p->status === 'diajukan' && ! $sudahDiperiksaOperator;
            $catatanOperator = $p->riwayatStatus->filter(fn ($r) => str_contains($r->catatan ?? '', 'Pemeriksaan Operator:'))->sortByDesc('id_riwayat_status')->first()?->catatan;

            $riwayat = $p->riwayatStatus
                ->sortByDesc('waktu')
                ->values()
                ->map(fn ($r) => [
                    'id_riwayat_status' => $r->id_riwayat_status,
                    'status_baru' => $r->status_baru,
                    'catatan' => $r->catatan,
                    'waktu' => $r->waktu?->format('d M Y, H:i') ?? '-',
                    'pengguna_nama' => $r->pengguna?->nama_lengkap ?? 'Sistem',
                    'pengguna_peran' => $r->pengguna?->peran?->nama_peran ?? '-',
                ]);

            return [
                'id_pengajuan' => $p->id_pengajuan,
                'nomor_pengajuan' => $p->nomor_pengajuan,
                'jenis_pengajuan' => $p->jenis_pengajuan,
                'jenis_label' => ucfirst($p->jenis_pengajuan),
                'pemohon_nama' => $p->pemohon?->nama_lengkap ?? '-',
                'unit_nama' => $p->pemohon?->unit?->nama_unit ?? '-',
                'tanggal_pengajuan' => $p->tanggal_pengajuan?->format('d M Y') ?? '-',
                'keterangan_singkat' => $this->ambilPerihal($p->keterangan),
                'total_estimasi' => $totalEstimasi,
                'sudah_diperiksa_operator' => $sudahDiperiksaOperator,
                'bisa_diperiksa' => $bisaDiperiksa,
                'catatan_operator' => $catatanOperator,
                'dokumen' => $p->dokumen->map(fn ($d) => [
                    'id_dokumen' => $d->id_dokumen,
                    'nama_file' => $d->nama_file,
                    'url' => route('dokumen.unduh', $d->id_dokumen),
                ])->values(),
                'riwayat' => $riwayat,
                'status' => $p->status,
                'status_label' => $meta['label'],
                'status_nada' => $meta['nada'],
            ];
        });

        $detailAktif = null;
        if ($request->filled('detail')) {
            $pengajuanDetail = Pengajuan::query()->find($request->detail);
            if ($pengajuanDetail) {
                $detailAktif = $this->formatPengajuanDetail($pengajuanDetail);
            }
        }

        return Inertia::render('Pengajuan/PemeriksaanIndex', [
            'daftarPemeriksaan' => $daftarPemeriksaan,
            'detailAktif' => $detailAktif,
            'tabAktif' => $tab,
            'filters' => [
                'q' => $request->q ?? '',
                'jenis' => $request->jenis ?? '',
                'tab' => $tab,
            ],
        ]);
    }

    /**
     * Proses hasil pemeriksaan oleh Operator (teruskan / kembalikan).
     */
    public function prosesPemeriksaanOperator(Request $request, Pengajuan $pengajuan): RedirectResponse
    {
        if ($pengajuan->status === 'draft') {
            abort(404, 'Pengajuan berstatus draf tidak dapat diproses.');
        }

        $pengajuan->load('riwayatStatus');
        $terakhir = $pengajuan->riwayatStatus->sortByDesc('id_riwayat_status')->first();
        $sudahDiperiksaOperator = $pengajuan->status !== 'diajukan'
            || ($terakhir && str_contains($terakhir->catatan ?? '', 'Pemeriksaan Operator:'));

        if ($sudahDiperiksaOperator) {
            abort(403, 'Pengajuan ini sudah diverifikasi oleh Operator dan tidak dapat diubah kembali.');
        }

        $validated = $request->validate([
            'keputusan' => ['required', 'string', 'in:teruskan,kembalikan'],
            'catatan' => [
                $request->input('keputusan') === 'kembalikan' ? 'required' : 'nullable',
                'string',
                'max:1000',
            ],
        ], [
            'keputusan.required' => 'Pilih keputusan pemeriksaan.',
            'keputusan.in' => 'Keputusan pemeriksaan tidak valid.',
            'catatan.required' => 'Catatan kekurangan wajib diisi jika mengembalikan pengajuan.',
            'catatan.max' => 'Catatan maksimal 1000 karakter.',
        ]);

        $this->statusService->catatPemeriksaanOperator(
            $pengajuan,
            $request->user()->id_pengguna,
            $validated['keputusan'],
            $validated['catatan'] ?? ''
        );

        $pesan = $validated['keputusan'] === 'teruskan'
            ? 'Pemeriksaan pengajuan berhasil diverifikasi dan diteruskan ke Kepala Kantor.'
            : 'Pengajuan berhasil dikembalikan ke pemohon untuk revisi.';

        return redirect()->route('pemeriksaan.index')->with('status', $pesan);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. KEPALA KANTOR (role:kepala-kantor)
    // ─────────────────────────────────────────────────────────────

    /**
     * Tampilkan daftar pengajuan dan statistik ringkas bagi Kepala Kantor.
     */
    public function indexKepalaKantor(Request $request): Response
    {
        // Helper callback: pengajuan 'diajukan' yang SUDAH diverifikasi oleh Operator
        $sudahDiverifikasiOperator = function ($q) {
            $q->where('status', 'diajukan')
                ->whereExists(function ($sub) {
                    $sub->selectRaw(1)
                        ->from('riwayat_status_pengajuan as r')
                        ->whereColumn('r.id_pengajuan', 'pengajuan.id_pengajuan')
                        ->where('r.catatan', 'like', 'Pemeriksaan Operator:%')
                        ->whereRaw('r.id_riwayat_status = (select max(r2.id_riwayat_status) from riwayat_status_pengajuan r2 where r2.id_pengajuan = pengajuan.id_pengajuan)');
                });
        };

        // Statistik ringkas (SELALU mengecualikan draft)
        $statMenunggu = Pengajuan::query()->where($sudahDiverifikasiOperator)->count();
        $statRekomendasi = Pengajuan::query()->where('status', 'disetujui_kadep')->count();
        $statDiputuskan = Pengajuan::query()->whereIn('status', ['disetujui_pimpinan', 'selesai', 'ditolak'])->count();
        $statTotal = Pengajuan::query()->where('status', '!=', 'draft')->count();

        $query = Pengajuan::query()
            ->with(['pemohon.unit', 'itemPengadaan', 'riwayatStatus'])
            ->where('status', '!=', 'draft')
            ->orderByDesc('tanggal_pengajuan');

        $tab = $request->query('tab');

        if ($tab === 'menunggu') {
            $query->where($sudahDiverifikasiOperator);
        } elseif ($tab === 'rekomendasi' || $tab === 'direkomendasikan') {
            $query->where('status', 'disetujui_kadep');
        } elseif ($tab === 'riwayat') {
            $query->whereIn('status', ['disetujui_kadep', 'disetujui_pimpinan', 'ditolak', 'selesai']);
        } elseif ($request->filled('status') && $request->status !== 'draft') {
            if ($request->status === 'diajukan') {
                $query->where($sudahDiverifikasiOperator);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('jenis')) {
            $query->where('jenis_pengajuan', $request->jenis);
        }

        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->where('nomor_pengajuan', 'like', $keyword)
                    ->orWhere('keterangan', 'like', $keyword)
                    ->orWhereHas('pemohon', fn ($qp) => $qp->where('nama_lengkap', 'like', $keyword));
            });
        }

        $daftarPengajuan = $query->paginate(10)->withQueryString()->through(function (Pengajuan $p) {
            $meta = self::getStatusMeta($p->status);
            $totalEstimasi = $this->hitungTotalEstimasi($p);

            // Periksa apakah pada siklus berjalan sudah diverifikasi operator
            $terakhir = $p->riwayatStatus->sortByDesc('id_riwayat_status')->first();
            $sudahDiperiksaOperator = $p->status !== 'diajukan'
                ? (! in_array($p->status, ['draft'], true))
                : (bool) ($terakhir && str_contains($terakhir->catatan ?? '', 'Pemeriksaan Operator:'));

            return [
                'id_pengajuan' => $p->id_pengajuan,
                'nomor_pengajuan' => $p->nomor_pengajuan,
                'jenis_pengajuan' => $p->jenis_pengajuan,
                'jenis_label' => ucfirst($p->jenis_pengajuan),
                'pemohon_nama' => $p->pemohon?->nama_lengkap ?? '-',
                'unit_nama' => $p->pemohon?->unit?->nama_unit ?? '-',
                'tanggal_pengajuan' => $p->tanggal_pengajuan?->format('d M Y') ?? '-',
                'total_estimasi' => $totalEstimasi,
                'sudah_diperiksa_operator' => $sudahDiperiksaOperator,
                'status' => $p->status,
                'status_label' => $meta['label'],
                'status_nada' => $meta['nada'],
            ];
        });

        return Inertia::render('Pengajuan/KepalaKantorIndex', [
            'daftarPengajuan' => $daftarPengajuan,
            'statistik' => [
                'menunggu' => $statMenunggu,
                'direkomendasikan' => $statRekomendasi,
                'perlu_revisi' => 0,
                'diputuskan' => $statDiputuskan,
                'total' => $statTotal,
            ],
            'filters' => [
                'q' => $request->q ?? '',
                'jenis' => $request->jenis ?? '',
                'status' => $request->status ?? '',
                'tab' => $tab ?? '',
            ],
        ]);
    }

    /**
     * Tampilkan detail pengajuan untuk tinjauan dan rekomendasi Kepala Kantor.
     */
    public function showKepalaKantor(Pengajuan $pengajuan): Response
    {
        if ($pengajuan->status === 'draft') {
            abort(404, 'Pengajuan berstatus draf tidak dapat diakses.');
        }

        $detail = $this->formatPengajuanDetail($pengajuan);

        return Inertia::render('Pengajuan/KepalaKantorShow', [
            'pengajuan' => $detail,
        ]);
    }

    /**
     * Proses hasil verifikasi Kepala Kantor (rekomendasikan / kembalikan).
     */
    public function prosesKepalaKantor(Request $request, Pengajuan $pengajuan): RedirectResponse
    {
        if ($pengajuan->status === 'draft') {
            abort(404, 'Pengajuan berstatus draf tidak dapat diproses.');
        }

        $pengajuan->load('riwayatStatus');
        $terakhir = $pengajuan->riwayatStatus->sortByDesc('id_riwayat_status')->first();
        $sudahDiverifikasiOperator = $pengajuan->status !== 'diajukan'
            ? (! in_array($pengajuan->status, ['draft'], true))
            : (bool) ($terakhir && str_contains($terakhir->catatan ?? '', 'Pemeriksaan Operator:'));

        if (! $sudahDiverifikasiOperator) {
            abort(403, 'Pengajuan ini belum diverifikasi kelengkapan berkasnya oleh Operator Aset Fakultas.');
        }

        $validated = $request->validate([
            'keputusan' => ['required', 'string', 'in:rekomendasikan,kembalikan'],
            'catatan' => ['required', 'string', 'max:1000'],
        ], [
            'keputusan.required' => 'Pilih keputusan rekomendasi.',
            'keputusan.in' => 'Keputusan rekomendasi tidak valid.',
            'catatan.required' => 'Catatan rekomendasi / perbaikan wajib diisi.',
            'catatan.max' => 'Catatan maksimal 1000 karakter.',
        ]);

        $this->statusService->catatPemeriksaanKepalaKantor(
            $pengajuan,
            $request->user()->id_pengguna,
            $validated['keputusan'],
            $validated['catatan']
        );

        $pesan = $validated['keputusan'] === 'rekomendasikan'
            ? 'Pengajuan berhasil direkomendasikan ke Pimpinan.'
            : 'Pengajuan berhasil dikembalikan untuk revisi.';

        return redirect()->route('kepala-kantor.pengajuan')->with('status', $pesan);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PIMPINAN (role:pimpinan)
    // ─────────────────────────────────────────────────────────────

    /**
     * Tampilkan daftar pengajuan yang memerlukan keputusan Pimpinan.
     */
    public function indexPimpinan(Request $request): Response
    {
        $tab = $request->query('tab', 'menunggu');

        if (! in_array($tab, ['menunggu', 'riwayat', 'semua', 'antrean'], true)) {
            $tab = 'menunggu';
        }
        if ($tab === 'antrean') {
            $tab = 'menunggu';
        }

        $query = Pengajuan::query()
            ->with(['pemohon.unit', 'itemPengadaan', 'riwayatStatus'])
            ->orderByDesc('tanggal_pengajuan');

        if ($tab === 'menunggu') {
            // 1. Tab "Menunggu persetujuan" (menunggu): menampilkan pengajuan berstatus 'disetujui_kadep'
            $query->where('status', 'disetujui_kadep');
        } elseif ($tab === 'riwayat') {
            // 2. Tab "Riwayat keputusan" (riwayat): menampilkan pengajuan yang sudah diputuskan
            $query->whereIn('status', ['disetujui_pimpinan', 'ditolak', 'diproses', 'selesai']);
        } elseif ($tab === 'semua') {
            // 3. Tab "Semua usulan" (semua): menampilkan seluruh pengajuan non-draft (status !== 'draft')
            $query->where('status', '!=', 'draft');
        }

        if ($request->filled('jenis')) {
            $query->where('jenis_pengajuan', $request->jenis);
        }

        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->where('nomor_pengajuan', 'like', $keyword)
                    ->orWhere('keterangan', 'like', $keyword)
                    ->orWhereHas('pemohon', fn ($qp) => $qp->where('nama_lengkap', 'like', $keyword));
            });
        }

        $daftarPersetujuan = $query->paginate(10)->withQueryString()->through(function (Pengajuan $p) {
            $meta = $this->getStatusMeta($p->status, $p->is_revisi);
            $totalEstimasi = $this->hitungTotalEstimasi($p);

            // Waktu rekomendasi kadep
            $riwayatKadep = $p->riwayatStatus->firstWhere('status_baru', 'disetujui_kadep');

            return [
                'id_pengajuan' => $p->id_pengajuan,
                'nomor_pengajuan' => $p->nomor_pengajuan,
                'jenis_pengajuan' => $p->jenis_pengajuan,
                'jenis_label' => ucfirst($p->jenis_pengajuan),
                'pemohon_nama' => $p->pemohon?->nama_lengkap ?? '-',
                'unit_nama' => $p->pemohon?->unit?->nama_unit ?? '-',
                'tanggal_pengajuan' => $p->tanggal_pengajuan?->format('d M Y') ?? '-',
                'tanggal_rekomendasi' => $riwayatKadep?->waktu?->format('d M Y') ?? '-',
                'total_estimasi' => $totalEstimasi,
                'status' => $p->status,
                'status_label' => $meta['label'],
                'status_nada' => $meta['nada'],
            ];
        });

        return Inertia::render('Pengajuan/PimpinanIndex', [
            'daftarPersetujuan' => $daftarPersetujuan,
            'tabAktif' => $tab,
            'filters' => [
                'q' => $request->q ?? '',
                'jenis' => $request->jenis ?? '',
                'tab' => $tab,
            ],
        ]);
    }

    /**
     * Tampilkan detail pengajuan dan formulir keputusan Pimpinan (Frame Figma 5-58373).
     */
    public function showPimpinan(Pengajuan $pengajuan): Response
    {
        if ($pengajuan->status === 'draft') {
            abort(404, 'Pengajuan berstatus draf tidak dapat diakses.');
        }

        $detail = $this->formatPengajuanDetail($pengajuan);
        $dapatDiputuskan = $pengajuan->status === 'disetujui_kadep';

        return Inertia::render('Pengajuan/PimpinanShow', [
            'pengajuan' => $detail,
            'dapatDiputuskan' => $dapatDiputuskan,
        ]);
    }

    /**
     * Simpan keputusan Pimpinan (setujui / tolak / kembalikan).
     */
    public function prosesPimpinan(Request $request, Pengajuan $pengajuan): RedirectResponse
    {
        if ($pengajuan->status === 'draft') {
            abort(404, 'Pengajuan berstatus draf tidak dapat diproses.');
        }

        if ($pengajuan->status !== 'disetujui_kadep') {
            abort(403, 'Pengajuan belum direkomendasikan oleh Kepala Kantor atau sudah diputuskan sebelumnya.');
        }

        $validated = $request->validate([
            'keputusan' => ['required', 'string', 'in:setujui,tolak,kembalikan'],
            'catatan' => [
                in_array($request->input('keputusan'), ['tolak', 'kembalikan'], true) ? 'required' : 'nullable',
                'string',
                'max:1000',
            ],
        ], [
            'keputusan.required' => 'Pilih keputusan persetujuan.',
            'keputusan.in' => 'Keputusan persetujuan tidak valid.',
            'catatan.required' => 'Alasan wajib diisi jika menolak atau mengembalikan pengajuan.',
            'catatan.max' => 'Catatan maksimal 1000 karakter.',
        ]);

        $this->statusService->catatKeputusanPimpinan(
            $pengajuan,
            $request->user()->id_pengguna,
            $validated['keputusan'],
            $validated['catatan'] ?? ''
        );

        $pesan = match ($validated['keputusan']) {
            'setujui' => 'Pengajuan berhasil disetujui.',
            'tolak' => 'Pengajuan telah ditolak.',
            default => 'Pengajuan berhasil dikembalikan untuk perbaikan.',
        };

        return redirect()->route('pimpinan.persetujuan')->with('status', $pesan);
    }

    /**
     * Unduh atau pratinjau berkas dokumen lampiran pengajuan.
     */
    public function unduhDokumen(Request $request, Dokumen $dokumen): BinaryFileResponse|StreamedResponse
    {
        $user = $request->user();

        // Verifikasi hak akses pengguna terhadap dokumen
        $pengajuan = $dokumen->pengajuan;
        $isPengunggah = $dokumen->id_pengunggah === $user->id_pengguna;
        $isPemohon = $pengajuan && $pengajuan->id_pemohon === $user->id_pengguna;
        $hasRole = $user->hasAnyRole(
            'operator',
            'kepala-kantor',
            'pimpinan',
            'teknisi'
        );

        if (! $isPengunggah && ! $isPemohon && ! $hasRole) {
            abort(403, 'Anda tidak memiliki hak akses untuk membuka dokumen ini.');
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($dokumen->path_file)) {
            abort(404, 'Berkas dokumen tidak ditemukan di penyimpanan server.');
        }

        $fullPath = $disk->path($dokumen->path_file);
        $mimeType = $disk->mimeType($dokumen->path_file) ?: 'application/octet-stream';
        $namaFile = $dokumen->nama_file ?: basename($dokumen->path_file);

        // Buka inline di browser jika PDF atau gambar, selain itu download
        if (str_starts_with($mimeType, 'application/pdf') || str_starts_with($mimeType, 'image/')) {
            return response()->file($fullPath, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . addslashes($namaFile) . '"',
            ]);
        }

        return response()->download($fullPath, $namaFile);
    }

    // ─────────────────────────────────────────────────────────────
    // HELPER & FORMATTER
    // ─────────────────────────────────────────────────────────────

    /**
     * Format detail pengajuan lengkap beserta relasi lintas jenis.
     */
    protected function formatPengajuanDetail(Pengajuan $pengajuan): array
    {
        $pengajuan->load([
            'pemohon.unit',
            'pemohon.subUnit',
            'dokumen.pengunggah',
            'riwayatStatus.pengguna.peran',
            'itemPengadaan.kategori',
            'itemPerbaikan.aset',
            'itemMutasi.aset.kategori',
            'itemMutasi.aset.penempatanAktif.ruangan.gedung',
            'itemMutasi.aset.penempatanAktif.penanggungJawab',
            'itemMutasi.ruanganTujuan.gedung',
            'itemMutasi.penanggungJawabTujuan',
            'itemPenghapusan.aset.kategori',
            'itemPenghapusan.aset.penempatanAktif.ruangan.gedung',
        ]);

        $isRevisi = $pengajuan->is_revisi;
        $meta = self::getStatusMeta($pengajuan->status, $isRevisi);

        // Format item berdasarkan jenis pengajuan
        $items = match ($pengajuan->jenis_pengajuan) {
            'pengadaan' => $pengajuan->itemPengadaan->map(fn ($item) => [
                'id' => $item->id_item_pengadaan,
                'kategori' => $item->kategori?->nama_kategori ?? '-',
                'nama_barang' => $item->nama_barang,
                'spesifikasi' => $item->spesifikasi,
                'jumlah' => $item->jumlah,
                'harga_satuan' => $item->jumlah > 0 ? (float) $item->estimasi_anggaran / $item->jumlah : (float) $item->estimasi_anggaran,
                'subtotal' => (float) $item->estimasi_anggaran,
            ])->values(),
            'perbaikan' => $pengajuan->itemPerbaikan->map(fn ($item) => [
                'id' => $item->id_item_perbaikan,
                'kategori' => 'Perbaikan Aset',
                'nama_barang' => $item->aset?->nama_barang ?? "Aset #{$item->id_aset}",
                'spesifikasi' => $item->deskripsi_kerusakan,
                'jumlah' => 1,
                'harga_satuan' => (float) $item->estimasi_biaya,
                'subtotal' => (float) $item->estimasi_biaya,
            ])->values(),
            'mutasi' => $pengajuan->itemMutasi->map(function ($item) {
                $penempatanAktif = $item->aset?->penempatanAktif;
                $ruanganAsal = $penempatanAktif?->ruangan?->nama_ruangan ?? '-';
                $ruanganTujuan = $item->ruanganTujuan?->nama_ruangan ?? '-';
                $pjAsal = $penempatanAktif?->penanggungJawab?->nama_lengkap ?? '-';
                $pjTujuan = $item->penanggungJawabTujuan?->nama_lengkap ?? '-';

                return [
                    'id' => $item->id_item_mutasi,
                    'kategori' => $item->aset?->kategori?->nama_kategori ?? 'Mutasi Aset',
                    'nama_barang' => $item->aset ? "{$item->aset->nama_barang} ({$item->aset->kode_aset})" : "Aset #{$item->id_aset}",
                    'spesifikasi' => "Dari: {$ruanganAsal} (PJ: {$pjAsal}) → Tujuan: {$ruanganTujuan} (PJ: {$pjTujuan})",
                    'jumlah' => 1,
                    'harga_satuan' => 0,
                    'subtotal' => 0,
                    'ruangan_asal' => $ruanganAsal,
                    'ruangan_tujuan' => $ruanganTujuan,
                    'pj_asal' => $pjAsal,
                    'pj_tujuan' => $pjTujuan,
                ];
            })->values(),
            'penghapusan' => $pengajuan->itemPenghapusan->map(function ($item) {
                $aset = $item->aset;
                $spesifikasi = $item->jalur_penghapusan
                    ? "Jalur: {$item->jalur_penghapusan}" . ($item->pihak_penerima ? " (Penerima: {$item->pihak_penerima})" : '') . ($item->catatan_tim_penilai ? " — {$item->catatan_tim_penilai}" : '')
                    : ("Kondisi: " . ucfirst($aset?->kondisi ?? 'rusak_berat') . ($aset?->tahun_perolehan ? " • Tahun: {$aset->tahun_perolehan}" : ''));

                return [
                    'id' => $item->id_item_penghapusan,
                    'kategori' => $aset?->kategori?->nama_kategori ?? 'Penghapusan Aset',
                    'nama_barang' => $aset ? "{$aset->nama_barang} ({$aset->kode_aset})" : "Aset #{$item->id_aset}",
                    'spesifikasi' => $spesifikasi,
                    'jumlah' => 1,
                    'harga_satuan' => (float) ($item->nilai_penjualan ?? $aset?->harga_perolehan ?? 0),
                    'subtotal' => (float) ($item->nilai_penjualan ?? 0),
                    'kode_aset' => $aset?->kode_aset,
                    'kondisi' => $aset?->kondisi,
                    'tahun_perolehan' => $aset?->tahun_perolehan,
                    'harga_perolehan' => (float) ($aset?->harga_perolehan ?? 0),
                    'jalur_penghapusan' => $item->jalur_penghapusan,
                    'pihak_penerima' => $item->pihak_penerima,
                ];
            })->values(),
            default => collect(),
        };

        $totalEstimasi = $items->sum('subtotal');

        $dokumen = $pengajuan->dokumen->map(fn ($d) => [
            'id_dokumen' => $d->id_dokumen,
            'nama_file' => $d->nama_file,
            'path_file' => $d->path_file,
            'url' => route('dokumen.unduh', $d->id_dokumen),
            'jenis_dokumen' => $d->jenis_dokumen,
            'tanggal_unggah' => $d->tanggal_unggah?->format('d M Y H:i') ?? '-',
            'pengunggah' => $d->pengunggah?->nama_lengkap ?? '-',
        ])->values();

        $riwayat = $pengajuan->riwayatStatus
            ->sortByDesc('waktu')
            ->values()
            ->map(fn ($r) => [
                'id_riwayat_status' => $r->id_riwayat_status,
                'status_baru' => $r->status_baru,
                'catatan' => $r->catatan,
                'waktu' => $r->waktu?->format('d M Y, H:i') ?? '-',
                'pengguna_nama' => $r->pengguna?->nama_lengkap ?? 'Sistem',
                'pengguna_peran' => $r->pengguna?->peran?->nama_peran ?? '-',
            ]);

        // Catatan khusus per tahap
        $pemeriksaanOperator = $pengajuan->riwayatStatus
            ->filter(fn ($r) => str_starts_with($r->catatan ?? '', 'Pemeriksaan Operator') || str_starts_with($r->catatan ?? '', 'Dikembalikan oleh Operator'))
            ->sortByDesc('waktu')
            ->first();

        $rekomendasiKepalaKantor = $pengajuan->riwayatStatus
            ->filter(fn ($r) => str_starts_with($r->catatan ?? '', 'Rekomendasi Kepala Kantor') || str_starts_with($r->catatan ?? '', 'Dikembalikan untuk revisi oleh Kepala Kantor'))
            ->sortByDesc('waktu')
            ->first();

        $keputusanPimpinan = $pengajuan->riwayatStatus
            ->filter(fn ($r) => $r->status_baru === 'disetujui_pimpinan' || $r->status_baru === 'ditolak' || str_starts_with($r->catatan ?? '', 'Disetujui oleh Pimpinan') || str_starts_with($r->catatan ?? '', 'Ditolak oleh Pimpinan'))
            ->sortByDesc('waktu')
            ->first();

        // Ambil catatan pengembalian revisi terakhir jika status draft dengan is_revisi true
        $catatanRevisiTerakhir = null;
        if ($isRevisi) {
            $catatanRevisiTerakhir = $pengajuan->riwayatStatus
                ->filter(function ($r) {
                    $c = strtolower($r->catatan ?? '');
                    return str_contains($c, 'dikembalikan') || str_contains($c, 'revisi') || str_contains($c, 'perbaikan');
                })
                ->sortByDesc('waktu')
                ->first()?->catatan;
        }

        // Cek apakah pengajuan sudah diverifikasi oleh Operator Aset Fakultas
        $terakhir = $pengajuan->riwayatStatus->sortByDesc('id_riwayat_status')->first();
        $sudahDiverifikasiOperator = $pengajuan->status !== 'diajukan'
            ? (! in_array($pengajuan->status, ['draft'], true))
            : (bool) ($terakhir && str_contains($terakhir->catatan ?? '', 'Pemeriksaan Operator:'));

        return [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'nomor_pengajuan' => $pengajuan->nomor_pengajuan,
            'jenis_pengajuan' => $pengajuan->jenis_pengajuan,
            'jenis_label' => ucfirst($pengajuan->jenis_pengajuan),
            'tanggal_pengajuan' => $pengajuan->tanggal_pengajuan?->format('d M Y, H:i') ?? '-',
            'tanggal_singkat' => $pengajuan->tanggal_pengajuan?->format('d M Y') ?? '-',
            'status' => $pengajuan->status,
            'is_revisi' => $isRevisi,
            'catatan_revisi_terakhir' => $catatanRevisiTerakhir,
            'sudah_diverifikasi_operator' => $sudahDiverifikasiOperator,
            'status_label' => $meta['label'],
            'status_nada' => $meta['nada'],
            'keterangan' => $pengajuan->keterangan ?? '-',
            'pemohon' => [
                'id_pengguna' => $pengajuan->pemohon?->id_pengguna,
                'nama_lengkap' => $pengajuan->pemohon?->nama_lengkap ?? '-',
                'nip' => $pengajuan->pemohon?->nip,
                'unit_nama' => $pengajuan->pemohon?->unit?->nama_unit ?? '-',
                'sub_unit_nama' => $pengajuan->pemohon?->subUnit?->nama_sub_unit,
            ],
            'items' => $items,
            'total_estimasi' => $totalEstimasi,
            'dokumen' => $dokumen,
            'riwayat' => $riwayat,
            'catatan_operator' => $pemeriksaanOperator?->catatan,
            'catatan_kepala_kantor' => $rekomendasiKepalaKantor?->catatan,
            'catatan_pimpinan' => $keputusanPimpinan?->catatan,
        ];
    }

    /**
     * Hitung total estimasi anggaran pengajuan secara dinamis.
     */
    protected function hitungTotalEstimasi(Pengajuan $p): float
    {
        return match ($p->jenis_pengajuan) {
            'pengadaan' => (float) $p->itemPengadaan->sum('estimasi_anggaran'),
            'perbaikan' => (float) $p->itemPerbaikan->sum('estimasi_biaya'),
            'penghapusan' => (float) $p->itemPenghapusan->sum('nilai_penjualan'),
            default => 0.0,
        };
    }

    /**
     * Ambil baris perihal dari teks keterangan terstruktur.
     */
    protected function ambilPerihal(?string $keterangan): string
    {
        if (! $keterangan) {
            return '-';
        }

        $lines = explode("\n", $keterangan);
        foreach ($lines as $line) {
            if (str_starts_with($line, 'Perihal:')) {
                return trim(substr($line, strlen('Perihal:')));
            }
        }

        return $lines[0] ?: '-';
    }

    /**
     * Ambil label dan nada badge untuk status pengajuan.
     *
     * @return array{label: string, nada: string}
     */
    public static function getStatusMeta(string $status, bool $isRevisi = false): array
    {
        if ($status === 'draft' && $isRevisi) {
            return ['label' => 'Perlu Revisi', 'nada' => 'peringatan'];
        }

        return match ($status) {
            'draft' => ['label' => 'Draf', 'nada' => 'netral'],
            'diajukan' => ['label' => 'Diajukan', 'nada' => 'peringatan'],
            'disetujui_kadep' => ['label' => 'Direkomendasikan Kepala Kantor', 'nada' => 'info'],
            'disetujui_pimpinan' => ['label' => 'Disetujui Pimpinan', 'nada' => 'sukses'],
            'diproses' => ['label' => 'Sedang Diproses', 'nada' => 'info'],
            'selesai' => ['label' => 'Selesai', 'nada' => 'sukses'],
            'ditolak' => ['label' => 'Ditolak', 'nada' => 'bahaya'],
            default => ['label' => ucfirst($status), 'nada' => 'netral'],
        };
    }
}
