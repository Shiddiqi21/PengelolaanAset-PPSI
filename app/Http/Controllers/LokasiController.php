<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\Gedung;
use App\Models\LogAktivitas;
use App\Models\PenempatanAset;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LokasiController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'gedung' => ['nullable', 'integer'],
            'unit' => ['nullable', 'integer'],
            'terpilih' => ['nullable', 'integer'],
        ]);

        $semuaRuangan = $this->daftarRuanganLengkap();

        $terfilter = $semuaRuangan
            ->when($filter['gedung'] ?? null, fn ($col, $gedung) => $col->where('id_gedung', (int) $gedung))
            ->when($filter['unit'] ?? null, fn ($col, $unit) => $col->where('id_unit', (int) $unit))
            ->when($filter['q'] ?? null, function ($col, string $kata) {
                $jarum = mb_strtolower(trim($kata));

                return $col->filter(function (array $item) use ($jarum) {
                    return str_contains(mb_strtolower($item['kode_ruangan']), $jarum)
                        || str_contains(mb_strtolower($item['nama_ruangan']), $jarum)
                        || str_contains(mb_strtolower($item['penanggung_jawab'] ?? ''), $jarum)
                        || str_contains(mb_strtolower($item['gedung'] ?? ''), $jarum)
                        || str_contains(mb_strtolower($item['unit'] ?? ''), $jarum);
                });
            })
            ->values();

        $perHalaman = 5;
        $halamanSaatIni = LengthAwarePaginator::resolveCurrentPage();
        $potongan = $terfilter->slice(($halamanSaatIni - 1) * $perHalaman, $perHalaman)->values();

        $paginator = new LengthAwarePaginator(
            $potongan,
            $terfilter->count(),
            $perHalaman,
            $halamanSaatIni,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        $dataPaginasi = $paginator->toArray();

        $idTerpilih = isset($filter['terpilih'])
            ? (int) $filter['terpilih']
            : ($potongan->first()['id_ruangan'] ?? $semuaRuangan->first()['id_ruangan'] ?? null);

        return Inertia::render('Lokasi/Index', [
            'kpi' => $this->ringkasanKpi($semuaRuangan),
            'ruangan' => [
                'data' => $dataPaginasi['data'],
                'links' => $dataPaginasi['links'],
                'from' => $dataPaginasi['from'],
                'to' => $dataPaginasi['to'],
                'total' => $dataPaginasi['total'],
            ],
            'semuaRuangan' => $semuaRuangan,
            'idTerpilih' => $idTerpilih,
            'filter' => [
                'q' => $filter['q'] ?? '',
                'gedung' => isset($filter['gedung']) ? (string) $filter['gedung'] : '',
                'unit' => isset($filter['unit']) ? (string) $filter['unit'] : '',
            ],
            'opsiGedung' => Gedung::query()->orderBy('nama_gedung')->get(['id_gedung', 'kode_gedung', 'nama_gedung']),
            'opsiUnit' => Unit::query()->orderBy('nama_unit')->get(['id_unit', 'nama_unit']),
            'opsiSubUnit' => SubUnit::query()->orderBy('nama_sub_unit')->get(['id_sub_unit', 'id_unit', 'nama_sub_unit']),
            'opsiPengguna' => User::query()
                ->where('is_aktif', true)
                ->orderBy('nama_lengkap')
                ->get(['id_pengguna', 'nama_lengkap', 'nip']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'id_gedung' => ['required', 'integer', Rule::exists('gedung', 'id_gedung')],
            'id_unit' => ['required', 'integer', Rule::exists('unit', 'id_unit')],
            'id_sub_unit' => [
                'required',
                'integer',
                Rule::exists('sub_unit', 'id_sub_unit')->where(
                    fn ($q) => $q->where('id_unit', $request->input('id_unit'))
                ),
            ],
            'lantai' => ['required', 'integer', 'min:1', 'max:20'],
            'nomor_ruangan' => ['required', 'string', 'max:20'],
            'nama_ruangan' => ['required', 'string', 'max:100'],
            'id_pengguna_pj' => ['nullable', 'integer', Rule::exists('pengguna', 'id_pengguna')],
        ], [
            'id_gedung.required' => 'Gedung wajib dipilih.',
            'id_unit.required' => 'Unit kerja wajib dipilih.',
            'id_sub_unit.required' => 'Sub unit wajib dipilih.',
            'nomor_ruangan.required' => 'Kode / nomor ruangan wajib diisi.',
            'nama_ruangan.required' => 'Nama ruangan wajib diisi.',
        ]);

        $nomorBersih = preg_replace('/^FTI-/i', '', trim($data['nomor_ruangan']));

        $sudahAda = Ruangan::query()
            ->where('id_gedung', $data['id_gedung'])
            ->where(function ($q) use ($nomorBersih, $data) {
                $q->where('nomor_ruangan', $nomorBersih)
                    ->orWhere('nomor_ruangan', $data['nomor_ruangan']);
            })
            ->exists();

        if ($sudahAda) {
            return back()->withErrors([
                'nomor_ruangan' => 'Kode/nomor ruangan sudah terdaftar pada gedung tersebut.',
            ]);
        }

        $ruangan = Ruangan::query()->create([
            'id_gedung' => (int) $data['id_gedung'],
            'id_unit' => (int) $data['id_unit'],
            'id_sub_unit' => (int) $data['id_sub_unit'],
            'lantai' => (int) $data['lantai'],
            'nomor_ruangan' => $nomorBersih,
            'nama_ruangan' => trim($data['nama_ruangan']),
        ]);

        if (! empty($data['id_pengguna_pj'])) {
            $pj = User::query()->find((int) $data['id_pengguna_pj']);
            if ($pj) {
                ActivityLogger::record(
                    'penetapan_pj_ruangan',
                    'ruangan',
                    $ruangan->id_ruangan,
                    json_encode([
                        'id_pengguna_pj' => $pj->id_pengguna,
                        'nama_pj' => $pj->nama_lengkap,
                        'kode_ruangan' => $ruangan->kodeRuangan(),
                        'nama_ruangan' => $ruangan->nama_ruangan,
                    ], JSON_UNESCAPED_UNICODE)
                );
            }
        }

        return redirect()
            ->route('lokasi.index', ['terpilih' => $ruangan->id_ruangan])
            ->with('status', "Lokasi {$ruangan->kodeRuangan()} ({$ruangan->nama_ruangan}) berhasil ditambahkan.");
    }

    public function update(Request $request, Ruangan $ruangan): RedirectResponse
    {
        $data = $request->validate([
            'id_gedung' => ['required', 'integer', Rule::exists('gedung', 'id_gedung')],
            'id_unit' => ['required', 'integer', Rule::exists('unit', 'id_unit')],
            'id_sub_unit' => [
                'required',
                'integer',
                Rule::exists('sub_unit', 'id_sub_unit')->where(
                    fn ($q) => $q->where('id_unit', $request->input('id_unit'))
                ),
            ],
            'lantai' => ['required', 'integer', 'min:1', 'max:20'],
            'nomor_ruangan' => ['required', 'string', 'max:20'],
            'nama_ruangan' => ['required', 'string', 'max:100'],
            'id_pengguna_pj' => ['nullable', 'integer', Rule::exists('pengguna', 'id_pengguna')],
        ]);

        $nomorBersih = preg_replace('/^FTI-/i', '', trim($data['nomor_ruangan']));

        $sudahAda = Ruangan::query()
            ->where('id_gedung', $data['id_gedung'])
            ->where('id_ruangan', '!=', $ruangan->id_ruangan)
            ->where(function ($q) use ($nomorBersih, $data) {
                $q->where('nomor_ruangan', $nomorBersih)
                    ->orWhere('nomor_ruangan', $data['nomor_ruangan']);
            })
            ->exists();

        if ($sudahAda) {
            return back()->withErrors([
                'nomor_ruangan' => 'Kode/nomor ruangan sudah dipakai ruangan lain pada gedung tersebut.',
            ]);
        }

        $ruangan->update([
            'id_gedung' => (int) $data['id_gedung'],
            'id_unit' => (int) $data['id_unit'],
            'id_sub_unit' => (int) $data['id_sub_unit'],
            'lantai' => (int) $data['lantai'],
            'nomor_ruangan' => $nomorBersih,
            'nama_ruangan' => trim($data['nama_ruangan']),
        ]);

        if (! empty($data['id_pengguna_pj'])) {
            $pj = User::query()->find((int) $data['id_pengguna_pj']);
            if ($pj) {
                ActivityLogger::record(
                    'penetapan_pj_ruangan',
                    'ruangan',
                    $ruangan->id_ruangan,
                    json_encode([
                        'id_pengguna_pj' => $pj->id_pengguna,
                        'nama_pj' => $pj->nama_lengkap,
                        'kode_ruangan' => $ruangan->kodeRuangan(),
                        'nama_ruangan' => $ruangan->nama_ruangan,
                    ], JSON_UNESCAPED_UNICODE)
                );
            }
        }

        return redirect()
            ->route('lokasi.index', ['terpilih' => $ruangan->id_ruangan])
            ->with('status', "Data ruangan {$ruangan->kodeRuangan()} berhasil diperbarui.");
    }

    public function destroy(Ruangan $ruangan): RedirectResponse
    {
        if ($ruangan->penempatan()->exists() || $ruangan->itemMutasi()->exists()) {
            return back()->withErrors([
                'status' => 'Ruangan tidak dapat dihapus karena sudah memiliki riwayat penempatan atau mutasi aset.',
            ]);
        }

        $kode = $ruangan->kodeRuangan();
        $ruangan->delete();

        return redirect()
            ->route('lokasi.index')
            ->with('status', "Ruangan {$kode} berhasil dihapus.");
    }

    public function tetapkanPj(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'id_ruangan' => ['required', 'integer', Rule::exists('ruangan', 'id_ruangan')],
            'id_pengguna_pj' => ['required', 'integer', Rule::exists('pengguna', 'id_pengguna')],
        ], [
            'id_ruangan.required' => 'Pilih ruangan referensi terlebih dahulu.',
            'id_pengguna_pj.required' => 'Pilih pegawai/dosen penanggung jawab ruangan.',
        ]);

        $ruangan = Ruangan::query()->findOrFail((int) $data['id_ruangan']);
        $pj = User::query()->findOrFail((int) $data['id_pengguna_pj']);

        ActivityLogger::record(
            'penetapan_pj_ruangan',
            'ruangan',
            $ruangan->id_ruangan,
            json_encode([
                'id_pengguna_pj' => $pj->id_pengguna,
                'nama_pj' => $pj->nama_lengkap,
                'kode_ruangan' => $ruangan->kodeRuangan(),
                'nama_ruangan' => $ruangan->nama_ruangan,
            ], JSON_UNESCAPED_UNICODE)
        );

        return redirect()
            ->route('lokasi.index', [
                ...$request->only(['q', 'gedung', 'unit', 'page']),
                'terpilih' => $ruangan->id_ruangan,
            ])
            ->with('status', "Penanggung jawab ruangan {$ruangan->kodeRuangan()} ({$ruangan->nama_ruangan}) ditetapkan kepada {$pj->nama_lengkap}.");
    }

    public function export(Request $request): StreamedResponse
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'gedung' => ['nullable', 'integer'],
            'unit' => ['nullable', 'integer'],
        ]);

        $baris = $this->daftarRuanganLengkap()
            ->when($filter['gedung'] ?? null, fn ($col, $gedung) => $col->where('id_gedung', (int) $gedung))
            ->when($filter['unit'] ?? null, fn ($col, $unit) => $col->where('id_unit', (int) $unit))
            ->when($filter['q'] ?? null, function ($col, string $kata) {
                $jarum = mb_strtolower(trim($kata));

                return $col->filter(fn (array $item) => str_contains(mb_strtolower($item['kode_ruangan']), $jarum)
                    || str_contains(mb_strtolower($item['nama_ruangan']), $jarum)
                    || str_contains(mb_strtolower($item['penanggung_jawab'] ?? ''), $jarum));
            })
            ->values();

        ActivityLogger::record('ekspor_lokasi', 'ruangan', null, 'Ekspor daftar referensi lokasi dan penanggung jawab ('.$baris->count().' ruangan)');

        $namaBerkas = 'referensi-lokasi-fti-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($baris) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Kode Ruangan',
                'Nama Ruangan',
                'Gedung',
                'Lantai',
                'Unit Kerja',
                'Sub Unit',
                'Penanggung Jawab',
                'Jumlah Aset Aktif',
                'Status',
            ]);

            foreach ($baris as $item) {
                fputcsv($out, [
                    $item['kode_ruangan'],
                    $item['nama_ruangan'],
                    $item['gedung'] ?? '-',
                    $item['lantai'],
                    $item['unit'] ?? '-',
                    $item['sub_unit'] ?? '-',
                    $item['penanggung_jawab'] ?? 'Belum ditetapkan',
                    $item['jumlah_aset'],
                    $item['status_label'],
                ]);
            }

            fclose($out);
        }, $namaBerkas, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function daftarRuanganLengkap()
    {
        $penggunaMap = User::query()->pluck('nama_lengkap', 'id_pengguna');

        $logPenetapan = LogAktivitas::query()
            ->where('nama_tabel', 'ruangan')
            ->where('aksi', 'penetapan_pj_ruangan')
            ->orderByDesc('id_log')
            ->get()
            ->unique('id_data')
            ->keyBy('id_data');

        $ruanganList = Ruangan::query()
            ->with([
                'gedung:id_gedung,kode_gedung,nama_gedung',
                'unit:id_unit,nama_unit',
                'subUnit:id_sub_unit,nama_sub_unit',
                'penempatanAktif.penanggungJawab:id_pengguna,nama_lengkap',
            ])
            ->withCount('penempatanAktif as jumlah_aset_aktif')
            ->orderByDesc('lantai')
            ->orderBy('nomor_ruangan')
            ->get();

        return $ruanganList->map(function (Ruangan $r) use ($logPenetapan, $penggunaMap) {
            $idPj = null;
            $namaPj = null;

            if (isset($logPenetapan[$r->id_ruangan])) {
                $decoded = json_decode((string) $logPenetapan[$r->id_ruangan]->detail, true);
                if (is_array($decoded) && ! empty($decoded['id_pengguna_pj'])) {
                    $idPj = (int) $decoded['id_pengguna_pj'];
                    $namaPj = $penggunaMap[$idPj] ?? ($decoded['nama_pj'] ?? null);
                }
            }

            if (! $idPj) {
                $penempatanTerbaru = $r->penempatanAktif->sortByDesc('id_penempatan')->first();
                if ($penempatanTerbaru) {
                    $idPj = (int) $penempatanTerbaru->id_pengguna_pj;
                    $namaPj = $penempatanTerbaru->penanggungJawab?->nama_lengkap ?? ($penggunaMap[$idPj] ?? null);
                }
            }

            return [
                'id_ruangan' => $r->id_ruangan,
                'kode_ruangan' => $r->kodeRuangan(),
                'nomor_ruangan' => $r->nomor_ruangan,
                'nama_ruangan' => $r->nama_ruangan ?? $r->kodeRuangan(),
                'lantai' => $r->lantai,
                'id_gedung' => $r->id_gedung,
                'gedung' => $r->gedung?->nama_gedung,
                'id_unit' => $r->id_unit,
                'unit' => $r->unit?->nama_unit,
                'id_sub_unit' => $r->id_sub_unit,
                'sub_unit' => $r->subUnit?->nama_sub_unit,
                'id_pengguna_pj' => $idPj,
                'penanggung_jawab' => $namaPj,
                'jumlah_aset' => (int) $r->jumlah_aset_aktif,
                'status_label' => 'Aktif',
                'status_nada' => 'sukses',
            ];
        })->values();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $semuaRuangan
     * @return list<array{label: string, nilai: string, keterangan: string, nada: string}>
     */
    private function ringkasanKpi($semuaRuangan): array
    {
        $jumlahRuangan = $semuaRuangan->count();
        $jumlahGedung = Gedung::query()->count();
        $jumlahPenggunaAktif = User::query()->where('is_aktif', true)->count();

        $totalAset = Aset::query()->where('status_aset', '!=', 'dihapus')->count();
        $asetDitempatkan = PenempatanAset::query()
            ->whereNull('tanggal_selesai')
            ->whereHas('aset', fn ($q) => $q->where('status_aset', '!=', 'dihapus'))
            ->distinct('id_aset')
            ->count('id_aset');

        $persen = $totalAset > 0
            ? number_format(($asetDitempatkan / $totalAset) * 100, 1, ',', '.')
            : '100,0';
        $persen = str_ends_with($persen, ',0') ? substr($persen, 0, -2) : $persen;

        $asetBelumDitempatkan = max(0, $totalAset - $asetDitempatkan);
        $ruanganTanpaPj = $semuaRuangan->filter(fn (array $r) => empty($r['id_pengguna_pj']))->count();
        $perluPenetapan = $asetBelumDitempatkan + $ruanganTanpaPj;

        return [
            [
                'label' => 'Ruangan terdaftar',
                'nilai' => number_format($jumlahRuangan, 0, ',', '.'),
                'keterangan' => "{$jumlahGedung} gedung di lingkungan FTI",
                'nada' => 'sukses',
            ],
            [
                'label' => 'Penanggung jawab',
                'nilai' => number_format($jumlahPenggunaAktif, 0, ',', '.'),
                'keterangan' => 'Pegawai dan dosen aktif',
                'nada' => 'sukses',
            ],
            [
                'label' => 'Aset telah ditempatkan',
                'nilai' => number_format($asetDitempatkan, 0, ',', '.'),
                'keterangan' => "{$persen}% inventaris",
                'nada' => 'sukses',
            ],
            [
                'label' => 'Perlu penetapan PJ',
                'nilai' => number_format($perluPenetapan, 0, ',', '.'),
                'keterangan' => 'Lengkapi sebelum aktivasi',
                'nada' => 'peringatan',
            ],
        ];
    }
}
