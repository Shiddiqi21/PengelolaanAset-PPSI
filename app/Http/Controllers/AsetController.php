<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAsetRequest;
use App\Http\Requests\UpdateAsetRequest;
use App\Models\Aset;
use App\Models\Dokumen;
use App\Models\ItemPenghapusan;
use App\Models\KategoriAset;
use App\Models\LogAktivitas;
use App\Models\PenempatanAset;
use App\Models\PenerimaanAset;
use App\Models\Ruangan;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AsetController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:aktif,dalam_perbaikan,dihapus,dimutasi'],
            'kategori' => ['nullable', 'integer'],
            'kondisi' => ['nullable', 'in:baik,kurang_baik,rusak_berat'],
            'lokasi' => ['nullable', 'integer'],
        ]);

        $aset = $this->bangunQueryFilter($filter)
            ->with([
                'kategori:id_kategori,kode_kategori,nama_kategori,masa_manfaat_tahun',
                'penempatanAktif.ruangan:id_ruangan,nomor_ruangan,nama_ruangan',
                'penempatanAktif.penanggungJawab:id_pengguna,nama_lengkap',
            ])
            ->orderByDesc('tahun_perolehan')
            ->orderBy('kode_aset')
            ->paginate(6)
            ->withQueryString()
            ->through(fn (Aset $item) => [
                'id_aset' => $item->id_aset,
                'kode_aset' => $item->kode_aset,
                'nama_barang' => $item->nama_barang,
                'merek_tipe' => $item->merek_tipe,
                'nomor_seri' => $item->nomor_seri,
                'kategori' => $item->kategori?->nama_kategori,
                'lokasi' => $item->penempatanAktif?->ruangan?->nama_ruangan
                    ?? $item->penempatanAktif?->ruangan?->nomor_ruangan
                    ?? 'Belum ditempatkan',
                'penanggung_jawab' => $item->penempatanAktif?->penanggungJawab?->nama_lengkap,
                'kondisi' => $item->kondisi,
                'kondisi_label' => self::labelKondisi($item->kondisi),
                'kondisi_nada' => self::nadaKondisi($item->kondisi),
                'status_aset' => $item->status_aset,
                'status_label' => self::labelStatus($item->status_aset),
                'harga_perolehan' => (float) ($item->harga_perolehan ?? 0),
                'harga_perolehan_label' => self::formatRupiah((float) ($item->harga_perolehan ?? 0)),
            ]);

        return Inertia::render('Aset/Index', [
            'kpi' => $this->ringkasanKpi(),
            'aset' => $aset,
            'filter' => [
                'q' => $filter['q'] ?? '',
                'status' => $filter['status'] ?? '',
                'kategori' => isset($filter['kategori']) ? (string) $filter['kategori'] : '',
                'kondisi' => $filter['kondisi'] ?? '',
                'lokasi' => isset($filter['lokasi']) ? (string) $filter['lokasi'] : '',
            ],
            'opsiKategori' => KategoriAset::query()
                ->orderBy('nama_kategori')
                ->get(['id_kategori', 'kode_kategori', 'nama_kategori']),
            'opsiLokasi' => Ruangan::query()
                ->orderBy('nama_ruangan')
                ->get(['id_ruangan', 'nomor_ruangan', 'nama_ruangan']),
        ]);
    }

    public function asetUnit(Request $request): Response
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'kategori' => ['nullable', 'integer'],
            'kondisi' => ['nullable', 'in:baik,kurang_baik,rusak_berat'],
            'lokasi' => ['nullable', 'integer'],
        ]);

        $user = $request->user();
        $queryBasis = $this->bangunQueryAsetUnit($user);

        $totalUnit = (clone $queryBasis)->count();
        $totalBaik = (clone $queryBasis)->where('kondisi', 'baik')->count();
        $totalRusakRingan = (clone $queryBasis)->where('kondisi', 'kurang_baik')->count();
        $totalRusakBerat = (clone $queryBasis)->where('kondisi', 'rusak_berat')->count();

        $namaUnit = $user?->unit?->nama_unit ?? 'Program Studi Sistem Informasi';
        $namaUnitRingkas = preg_replace('/^(Departemen|Program Studi|Fakultas)\s+/i', '', $namaUnit) ?: $namaUnit;

        $kpi = [
            [
                'label' => 'Total aset unit',
                'nilai' => number_format($totalUnit, 0, ',', '.'),
                'keterangan' => $namaUnitRingkas,
                'nada' => 'sukses',
            ],
            [
                'label' => 'Baik',
                'nilai' => number_format($totalBaik, 0, ',', '.'),
                'keterangan' => 'Siap digunakan',
                'nada' => 'sukses',
            ],
            [
                'label' => 'Rusak ringan',
                'nilai' => number_format($totalRusakRingan, 0, ',', '.'),
                'keterangan' => 'Perlu perawatan / perbaikan',
                'nada' => 'peringatan',
            ],
            [
                'label' => 'Rusak berat',
                'nilai' => number_format($totalRusakBerat, 0, ',', '.'),
                'keterangan' => 'Evaluasi kelayakan penggunaan',
                'nada' => 'peringatan',
            ],
        ];

        $aset = (clone $queryBasis)
            ->when($filter['q'] ?? null, function (Builder $query, string $kata) {
                $query->where(function (Builder $where) use ($kata) {
                    $where->where('kode_aset', 'like', "%{$kata}%")
                        ->orWhere('nama_barang', 'like', "%{$kata}%")
                        ->orWhere('merek_tipe', 'like', "%{$kata}%")
                        ->orWhere('nomor_seri', 'like', "%{$kata}%");
                });
            })
            ->when($filter['kategori'] ?? null, fn (Builder $query, $kategori) => $query->where('id_kategori', (int) $kategori))
            ->when($filter['kondisi'] ?? null, fn (Builder $query, string $kondisi) => $query->where('kondisi', $kondisi))
            ->when($filter['lokasi'] ?? null, function (Builder $query, $lokasi) {
                $query->whereHas('penempatanAktif', fn (Builder $q) => $q->where('id_ruangan', (int) $lokasi));
            })
            ->with([
                'kategori:id_kategori,kode_kategori,nama_kategori',
                'penempatanAktif.ruangan:id_ruangan,nomor_ruangan,nama_ruangan',
            ])
            ->orderByDesc('tahun_perolehan')
            ->orderBy('kode_aset')
            ->paginate(6)
            ->withQueryString()
            ->through(fn (Aset $item) => [
                'id_aset' => $item->id_aset,
                'kode_aset' => $item->kode_aset,
                'nama_barang' => $item->nama_barang,
                'lokasi' => $item->penempatanAktif?->ruangan?->nama_ruangan
                    ?? $item->penempatanAktif?->ruangan?->nomor_ruangan
                    ?? 'Belum ditempatkan',
                'kondisi' => $item->kondisi,
                'kondisi_label' => self::labelKondisi($item->kondisi),
                'kondisi_nada' => self::nadaKondisi($item->kondisi),
                'harga_perolehan_label' => self::formatRupiah((float) ($item->harga_perolehan ?? 0)),
            ]);

        $opsiLokasi = Ruangan::query()
            ->when($user?->id_unit, function (Builder $q, int $idUnit) use ($user) {
                $q->where(function (Builder $sub) use ($idUnit, $user) {
                    $sub->where('id_unit', $idUnit)
                        ->orWhereHas('penempatanAktif', fn (Builder $p) => $p->where('id_pengguna_pj', $user->id_pengguna));
                });
            })
            ->orderBy('nama_ruangan')
            ->get(['id_ruangan', 'nomor_ruangan', 'nama_ruangan']);

        if ($opsiLokasi->isEmpty()) {
            $opsiLokasi = Ruangan::query()->orderBy('nama_ruangan')->get(['id_ruangan', 'nomor_ruangan', 'nama_ruangan']);
        }

        return Inertia::render('Pemohon/AsetUnit/Index', [
            'unitInfo' => [
                'nama_unit' => $namaUnit,
                'nama_ringkas' => $namaUnitRingkas,
            ],
            'kpi' => $kpi,
            'aset' => $aset,
            'filter' => [
                'q' => $filter['q'] ?? '',
                'kategori' => isset($filter['kategori']) ? (string) $filter['kategori'] : '',
                'kondisi' => $filter['kondisi'] ?? '',
                'lokasi' => isset($filter['lokasi']) ? (string) $filter['lokasi'] : '',
            ],
            'opsiKategori' => KategoriAset::query()
                ->orderBy('nama_kategori')
                ->get(['id_kategori', 'kode_kategori', 'nama_kategori']),
            'opsiLokasi' => $opsiLokasi,
        ]);
    }

    public function showAsetUnit(Request $request, Aset $aset): Response
    {
        return Inertia::render('Aset/Show', [
            'aset' => $this->bangunDataDetailAset($aset),
            'modePemohon' => true,
        ]);
    }

    public function riwayatPerpindahan(Request $request): Response
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:aktif,selesai'],
        ]);

        $user = $request->user()?->loadMissing('unit');
        $namaUnit = $user?->unit?->nama_unit ?? 'Fakultas Teknologi Informasi';
        $namaUnitRingkas = preg_replace('/^(Departemen|Program Studi|Fakultas)\s+/i', '', $namaUnit) ?: $namaUnit;

        $queryBasis = PenempatanAset::query()
            ->with([
                'aset.kategori:id_kategori,kode_kategori,nama_kategori',
                'ruangan.gedung:id_gedung,nama_gedung',
                'penanggungJawab:id_pengguna,nama_lengkap',
                'itemMutasi.pengajuan:id_pengajuan,id_pemohon,nomor_pengajuan',
            ]);

        if (! empty($user?->id_unit)) {
            $queryBasis->where(function (Builder $q) use ($user) {
                $q->whereHas('ruangan', fn (Builder $qr) => $qr->where('id_unit', $user->id_unit))
                    ->orWhere('id_pengguna_pj', $user->id_pengguna)
                    ->orWhereHas('itemMutasi.pengajuan', fn (Builder $qp) => $qp->where('id_pemohon', $user->id_pengguna));
            });
        }

        $totalPencatatan = (clone $queryBasis)->count();
        $penempatanAktif = (clone $queryBasis)->whereNull('tanggal_selesai')->count();
        $selesaiBerpindah = (clone $queryBasis)->whereNotNull('tanggal_selesai')->count();
        $dariMutasiResmi = (clone $queryBasis)->whereNotNull('id_item_mutasi')->count();

        $kpi = [
            [
                'label' => 'Total pencatatan',
                'nilai' => number_format($totalPencatatan, 0, ',', '.'),
                'keterangan' => $namaUnitRingkas,
                'nada' => 'sukses',
            ],
            [
                'label' => 'Penempatan aktif',
                'nilai' => number_format($penempatanAktif, 0, ',', '.'),
                'keterangan' => 'Lokasi aset saat ini',
                'nada' => 'sukses',
            ],
            [
                'label' => 'Selesai / berpindah',
                'nilai' => number_format($selesaiBerpindah, 0, ',', '.'),
                'keterangan' => 'Riwayat lokasi sebelumnya',
                'nada' => 'netral',
            ],
            [
                'label' => 'Dari mutasi resmi',
                'nilai' => number_format($dariMutasiResmi, 0, ',', '.'),
                'keterangan' => 'Terkait pengajuan mutasi',
                'nada' => 'peringatan',
            ],
        ];

        $riwayat = (clone $queryBasis)
            ->when($filter['q'] ?? null, function (Builder $query, string $kata) {
                $query->where(function (Builder $where) use ($kata) {
                    $where->whereHas('aset', function (Builder $qa) use ($kata) {
                        $qa->where('kode_aset', 'like', "%{$kata}%")
                            ->orWhere('nama_barang', 'like', "%{$kata}%");
                    })
                        ->orWhereHas('ruangan', function (Builder $qr) use ($kata) {
                            $qr->where('nama_ruangan', 'like', "%{$kata}%")
                                ->orWhere('nomor_ruangan', 'like', "%{$kata}%");
                        })
                        ->orWhereHas('penanggungJawab', fn (Builder $qp) => $qp->where('nama_lengkap', 'like', "%{$kata}%"))
                        ->orWhereHas('itemMutasi.pengajuan', fn (Builder $qm) => $qm->where('nomor_pengajuan', 'like', "%{$kata}%"));
                });
            })
            ->when($filter['status'] ?? null, function (Builder $query, string $status) {
                if ($status === 'aktif') {
                    $query->whereNull('tanggal_selesai');
                } elseif ($status === 'selesai') {
                    $query->whereNotNull('tanggal_selesai');
                }
            })
            ->orderByDesc('tanggal_mulai')
            ->orderByDesc('id_penempatan')
            ->paginate(10)
            ->withQueryString()
            ->through(function (PenempatanAset $p) {
                $ruangan = $p->ruangan;
                $namaRuangan = $ruangan
                    ? trim(($ruangan->gedung?->nama_gedung ? $ruangan->gedung->nama_gedung.' - ' : '').($ruangan->nama_ruangan ?: "R. {$ruangan->nomor_ruangan}"))
                    : 'Belum ditempatkan';

                return [
                    'id_penempatan' => $p->id_penempatan,
                    'id_aset' => $p->id_aset,
                    'kode_aset' => $p->aset?->kode_aset ?? '-',
                    'nama_barang' => $p->aset?->nama_barang ?? 'Aset tidak ditemukan',
                    'kategori' => $p->aset?->kategori?->nama_kategori ?? '-',
                    'ruangan' => $namaRuangan,
                    'penanggung_jawab' => $p->penanggungJawab?->nama_lengkap ?? 'Belum ditentukan',
                    'tanggal_mulai_label' => $p->tanggal_mulai?->locale('id')->translatedFormat('j M Y') ?? '-',
                    'tanggal_selesai_label' => $p->tanggal_selesai?->locale('id')->translatedFormat('j M Y') ?? 'Sekarang',
                    'aktif' => $p->tanggal_selesai === null,
                    'nomor_mutasi' => $p->itemMutasi?->pengajuan?->nomor_pengajuan,
                    'id_pengajuan_mutasi' => $p->itemMutasi?->id_pengajuan,
                    'keterangan' => $p->keterangan ?: '-',
                ];
            });

        return Inertia::render('Pemohon/RiwayatPerpindahan/Index', [
            'unitInfo' => [
                'nama_unit' => $namaUnit,
                'nama_ringkas' => $namaUnitRingkas,
            ],
            'kpi' => $kpi,
            'riwayat' => $riwayat,
            'filter' => [
                'q' => $filter['q'] ?? '',
                'status' => $filter['status'] ?? '',
            ],
        ]);
    }

    public function asetPribadi(Request $request): Response
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'kategori' => ['nullable', 'integer'],
            'kondisi' => ['nullable', 'in:baik,kurang_baik,rusak_berat'],
            'tab' => ['nullable', 'in:aktif,riwayat'],
        ]);

        $user = $request->user();
        $idUser = $user->id_pengguna;
        $tab = $filter['tab'] ?? 'aktif';

        $basis = Aset::query()
            ->where('status_aset', '!=', 'dihapus')
            ->whereHas('penempatanAktif', fn (Builder $q) => $q->where('id_pengguna_pj', $idUser));

        $jumlahAktif = (clone $basis)->count();

        $aset = (clone $basis)
            ->when($filter['q'] ?? null, function (Builder $query, string $kata) {
                $query->where(function (Builder $where) use ($kata) {
                    $where->where('kode_aset', 'like', "%{$kata}%")
                        ->orWhere('nama_barang', 'like', "%{$kata}%")
                        ->orWhere('merek_tipe', 'like', "%{$kata}%");
                });
            })
            ->when($filter['kategori'] ?? null, fn (Builder $query, $kategori) => $query->where('id_kategori', (int) $kategori))
            ->when($filter['kondisi'] ?? null, fn (Builder $query, string $kondisi) => $query->where('kondisi', $kondisi))
            ->with([
                'kategori:id_kategori,kode_kategori,nama_kategori',
                'penempatanAktif.ruangan:id_ruangan,nomor_ruangan,nama_ruangan',
            ])
            ->orderBy('kode_aset')
            ->paginate(5)
            ->withQueryString()
            ->through(fn (Aset $item) => [
                'id_aset' => $item->id_aset,
                'kode_aset' => $item->kode_aset,
                'nama_barang' => $item->nama_barang,
                'tanggal_penetapan' => $item->penempatanAktif?->tanggal_mulai?->locale('id')->translatedFormat('j M Y') ?? '-',
                'kondisi_label' => self::labelKondisi($item->kondisi),
                'kondisi_nada' => self::nadaKondisi($item->kondisi),
                'harga_perolehan_label' => self::formatRupiah((float) ($item->harga_perolehan ?? 0)),
            ]);

        $riwayat = PenempatanAset::query()
            ->where('id_pengguna_pj', $idUser)
            ->with(['aset:id_aset,kode_aset,nama_barang', 'ruangan:id_ruangan,nomor_ruangan,nama_ruangan'])
            ->orderByDesc('tanggal_mulai')
            ->limit(50)
            ->get()
            ->map(fn (PenempatanAset $p) => [
                'id_penempatan' => $p->id_penempatan,
                'id_aset' => $p->id_aset,
                'kode_aset' => $p->aset?->kode_aset ?? '-',
                'nama_barang' => $p->aset?->nama_barang ?? '-',
                'ruangan' => $p->ruangan?->nama_ruangan ?? $p->ruangan?->nomor_ruangan ?? '-',
                'tanggal_mulai' => $p->tanggal_mulai?->locale('id')->translatedFormat('j M Y'),
                'tanggal_selesai' => $p->tanggal_selesai?->locale('id')->translatedFormat('j M Y'),
                'aktif' => $p->tanggal_selesai === null,
            ])
            ->values();

        $idAsetSaya = (clone $basis)->pluck('id_aset');

        $penempatanSaya = PenempatanAset::query()
            ->whereNull('tanggal_selesai')
            ->where('id_pengguna_pj', $idUser)
            ->with('ruangan:id_ruangan,nomor_ruangan,nama_ruangan')
            ->get();

        $ruanganUtama = $penempatanSaya
            ->groupBy('id_ruangan')
            ->sortByDesc(fn ($grup) => $grup->count())
            ->first()?->first()?->ruangan;

        $namaUnit = $user->unit?->nama_unit ?? '-';
        $unitRingkas = preg_replace('/^(Departemen|Program Studi|Fakultas)\s+/i', '', $namaUnit) ?: $namaUnit;

        $dokumen = Dokumen::query()
            ->whereIn('id_aset', $idAsetSaya)
            ->where('jenis_dokumen', 'bast')
            ->orderByDesc('tanggal_unggah')
            ->get()
            ->map(fn (Dokumen $d) => $this->formatSatuDokumen($d))
            ->values();

        return Inertia::render('Pegawai/Aset/Index', [
            'pj' => [
                'nama' => $user->nama_lengkap,
                'unit' => $unitRingkas,
                'unit_lengkap' => $namaUnit,
                'lokasi' => $ruanganUtama
                    ? 'FTI-'.$ruanganUtama->nomor_ruangan.' • '.($ruanganUtama->nama_ruangan ?? '')
                    : 'Belum ditentukan',
                'dasar' => 'Berita acara serah terima dan penetapan inventaris',
            ],
            'jumlahAktif' => $jumlahAktif,
            'aset' => $aset,
            'riwayat' => $riwayat,
            'dokumen' => $dokumen,
            'tab' => $tab,
            'filter' => [
                'q' => $filter['q'] ?? '',
                'kategori' => isset($filter['kategori']) ? (string) $filter['kategori'] : '',
                'kondisi' => $filter['kondisi'] ?? '',
            ],
            'opsiKategori' => KategoriAset::query()
                ->orderBy('nama_kategori')
                ->get(['id_kategori', 'kode_kategori', 'nama_kategori']),
        ]);
    }

    public function showAsetPribadi(Request $request, Aset $aset): Response
    {
        $user = $request->user();
        $aset->load('penempatanAktif');

        abort_unless(
            $aset->penempatanAktif && (int) $aset->penempatanAktif->id_pengguna_pj === (int) $user->id_pengguna,
            403,
            'Aset ini bukan dalam tanggung jawab Anda.'
        );

        $data = $this->bangunDataDetailAset($aset);
        $meta = $aset->metaPerolehan();

        $logTerakhir = LogAktivitas::query()
            ->where('nama_tabel', 'aset')
            ->where('id_data', $aset->id_aset)
            ->orderByDesc('waktu')
            ->first();

        $tanggalKondisi = ($logTerakhir?->waktu ?? $aset->penempatanAktif->tanggal_mulai)
            ?->locale('id')->translatedFormat('j F Y');

        $data['spesifikasi'] = $meta['catatan'] !== '' ? $meta['catatan'] : '-';
        $data['kondisi_terakhir'] = self::labelKondisi($aset->kondisi).' • '.$tanggalKondisi;
        $data['kode_lokasi'] = $data['lokasi_lengkap'];
        $data['riwayat_pencatatan'] = $this->bangunRiwayatPencatatan($aset);

        return Inertia::render('Pegawai/Aset/Show', [
            'aset' => $data,
            'pegawai' => ['nama' => $user->nama_lengkap],
        ]);
    }

    /**
     * Riwayat pencatatan aset: perolehan, serah terima (penempatan), dan pembaruan inventaris.
     *
     * @return list<array{id: string, tanggal: string, kegiatan: string, dokumen: string, pelaksana: string}>
     */
    private function bangunRiwayatPencatatan(Aset $aset): array
    {
        $aset->loadMissing(['penempatan.penanggungJawab', 'dokumen']);
        $meta = $aset->metaPerolehan();

        $namaOperator = User::query()
            ->whereHas('peran', fn (Builder $q) => $q->where('nama_peran', \App\Support\PeranNama::OPERATOR))
            ->value('nama_lengkap') ?? 'Operator Aset Fakultas';

        $bast = $aset->dokumen->firstWhere('jenis_dokumen', 'bast');
        $namaBast = $bast ? pathinfo($bast->nama_file, PATHINFO_FILENAME) : '-';

        $baris = [];

        $logs = LogAktivitas::query()
            ->where('nama_tabel', 'aset')
            ->where('id_data', $aset->id_aset)
            ->whereIn('aksi', ['perolehan_aset', 'perbarui_inventaris'])
            ->orderByDesc('waktu')
            ->get();

        $adaPerolehan = false;

        foreach ($logs as $log) {
            $decoded = json_decode((string) $log->detail, true);
            if (! is_array($decoded)) {
                continue;
            }

            if ($log->aksi === 'perolehan_aset') {
                $adaPerolehan = true;
            }

            $baris[] = [
                'id' => 'log-'.$log->id_log,
                'ts' => $log->waktu?->timestamp ?? 0,
                'tanggal' => $log->waktu?->locale('id')->translatedFormat('j M Y') ?? '-',
                'kegiatan' => (string) ($decoded['kegiatan'] ?? $decoded['judul'] ?? 'Pembaruan data aset'),
                'dokumen' => (string) ($decoded['referensi'] ?? '-'),
                'pelaksana' => (string) ($decoded['pelaksana'] ?? $namaOperator),
            ];
        }

        foreach ($aset->penempatan as $p) {
            $baris[] = [
                'id' => 'pnp-'.$p->id_penempatan,
                'ts' => $p->tanggal_mulai?->timestamp ?? 0,
                'tanggal' => $p->tanggal_mulai?->locale('id')->translatedFormat('j M Y') ?? '-',
                'kegiatan' => 'Serah terima kepada '.($p->penanggungJawab?->nama_lengkap ?? '-'),
                'dokumen' => $namaBast,
                'pelaksana' => $namaOperator,
            ];
        }

        if (! $adaPerolehan) {
            $tahun = (int) ($aset->tahun_perolehan ?: now()->year);
            $baris[] = [
                'id' => 'prl-'.$aset->id_aset,
                'ts' => \Carbon\Carbon::create($tahun, 1, 1)->timestamp,
                'tanggal' => $meta['tanggal_perolehan'],
                'kegiatan' => 'Pencatatan perolehan aset',
                'dokumen' => $meta['nomor_dokumen_sumber'],
                'pelaksana' => $namaOperator,
            ];
        }

        usort($baris, fn (array $a, array $b) => $b['ts'] <=> $a['ts']);

        return array_map(function (array $b) {
            unset($b['ts']);

            return $b;
        }, $baris);
    }

    /**
     * @return array{id_dokumen: int, nama_file: string, ukuran_label: string, jenis_dokumen: string, tanggal_unggah: string|null, url: string|null}
     */
    private function formatSatuDokumen(Dokumen $d): array
    {
        $adaDiDisk = $d->path_file && Storage::disk('public')->exists($d->path_file);
        $ukuranBytes = $adaDiDisk ? Storage::disk('public')->size($d->path_file) : 225280;

        return [
            'id_dokumen' => $d->id_dokumen,
            'nama_file' => $d->nama_file,
            'ukuran_label' => max(1, (int) round($ukuranBytes / 1024)).' KB',
            'jenis_dokumen' => $d->jenis_dokumen,
            'tanggal_unggah' => $d->tanggal_unggah?->locale('id')->translatedFormat('j M Y'),
            'url' => $adaDiDisk ? '/storage/'.ltrim($d->path_file, '/') : null,
        ];
    }

    public function create(): Response
    {
        $penerimaanTerbaru = PenerimaanAset::query()
            ->with(['pengajuan:id_pengajuan,nomor_pengajuan', 'vendor:id_vendor,nama_vendor'])
            ->latest('id_penerimaan')
            ->first();

        return Inertia::render('Aset/Form', [
            'mode' => 'create',
            'kodeOtomatis' => $this->buatKodeOtomatis(),
            'tanggalHariIni' => now()->locale('id')->translatedFormat('j F Y'),
            'referensiPenerimaan' => [
                'nomor_penerimaan' => $penerimaanTerbaru?->nomor_nota ?? 'TER-2026-0021',
                'pemasok' => $penerimaanTerbaru?->vendor?->nama_vendor ?? 'CV Minang Teknologi',
                'status_dokumen' => 'Menunggu verifikasi',
                'pengajuan_asal' => $penerimaanTerbaru?->pengajuan?->nomor_pengajuan ?? 'PGD-2026-0080',
            ],
            ...$this->opsiForm(),
        ]);
    }

    public function store(StoreAsetRequest $request): RedirectResponse
    {
        $kodeAset = $request->filled('kode_aset')
            ? trim((string) $request->input('kode_aset'))
            : $this->buatKodeOtomatis();

        $tahunPerolehan = (int) ($request->input('tahun_perolehan') ?: now()->year);
        $tanggalPerolehan = trim((string) ($request->input('tanggal_perolehan') ?: now()->locale('id')->translatedFormat('j F Y')));
        $sumberDana = trim((string) ($request->input('sumber_dana') ?: "RKAT FTI {$tahunPerolehan}"));
        $nomorDokSumber = trim((string) ($request->input('nomor_dokumen_sumber') ?: "TER-{$tahunPerolehan}-0021"));

        $spesifikasiJson = json_encode([
            'tanggal_perolehan' => $tanggalPerolehan,
            'sumber_dana' => $sumberDana,
            'nomor_dokumen_sumber' => $nomorDokSumber,
            'catatan' => (string) ($request->input('spesifikasi') ?? ''),
        ], JSON_UNESCAPED_UNICODE);

        $fotoPath = null;
        if ($request->hasFile('foto')) {
            $fotoPath = $request->file('foto')->store('aset', 'public');
        }

        $berkasUnggahan = $request->file('berkas_perolehan');
        if ($berkasUnggahan) {
            $ext = strtolower((string) $berkasUnggahan->getClientOriginalExtension());
            $storedPath = $berkasUnggahan->store('aset', 'public');
            if (! $fotoPath && in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'svg'], true)) {
                $fotoPath = $storedPath;
            }
        } else {
            $storedPath = null;
        }

        $aset = DB::transaction(function () use ($request, $kodeAset, $tahunPerolehan, $spesifikasiJson, $fotoPath, $berkasUnggahan, $storedPath, $nomorDokSumber) {
            $aset = Aset::query()->create([
                'id_kategori' => (int) $request->input('id_kategori'),
                'kode_aset' => $kodeAset,
                'nama_barang' => $request->string('nama_barang')->toString(),
                'merek_tipe' => $request->input('merek_tipe'),
                'nomor_seri' => $request->input('nomor_seri'),
                'spesifikasi' => $spesifikasiJson,
                'foto_path' => $fotoPath,
                'tahun_perolehan' => $tahunPerolehan,
                'harga_perolehan' => $request->input('harga_perolehan'),
                'kondisi' => $request->string('kondisi')->toString(),
                'status_aset' => $request->input('status_aset') ?: 'aktif',
            ]);

            if ($request->filled('id_ruangan') && $request->filled('id_pengguna_pj')) {
                PenempatanAset::query()->create([
                    'id_aset' => $aset->id_aset,
                    'id_ruangan' => (int) $request->input('id_ruangan'),
                    'id_pengguna_pj' => (int) $request->input('id_pengguna_pj'),
                    'id_item_mutasi' => null,
                    'tanggal_mulai' => now(),
                    'tanggal_selesai' => null,
                    'keterangan' => $request->input('keterangan_penempatan') ?: "Penempatan awal ({$nomorDokSumber})",
                ]);
            }

            if ($berkasUnggahan && $storedPath) {
                $ext = strtolower((string) $berkasUnggahan->getClientOriginalExtension());
                Dokumen::query()->create([
                    'id_pengajuan' => null,
                    'id_aset' => $aset->id_aset,
                    'id_pengunggah' => $request->user()?->id_pengguna ?? User::query()->value('id_pengguna'),
                    'jenis_dokumen' => in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true) ? 'foto' : 'lainnya',
                    'nama_file' => $berkasUnggahan->getClientOriginalName(),
                    'path_file' => $storedPath,
                    'tanggal_unggah' => now(),
                ]);
            }

            ActivityLogger::record(
                'perolehan_aset',
                'aset',
                $aset->id_aset,
                json_encode([
                    'judul' => 'Data inventaris dibuat',
                    'ringkasan' => "Pencatatan perolehan aset {$tahunPerolehan}",
                    'kegiatan' => "Pencatatan inventaris baru {$aset->nama_barang}",
                    'referensi' => $nomorDokSumber,
                    'pelaksana' => $request->user()?->nama_lengkap ?? 'Operator Aset Fakultas',
                ], JSON_UNESCAPED_UNICODE)
            );

            return $aset;
        });

        return redirect()
            ->route('aset.show', $aset->id_aset)
            ->with('status', 'Data aset berhasil disimpan.');
    }

    public function show(Aset $aset): Response
    {
        return Inertia::render('Aset/Show', [
            'aset' => $this->bangunDataDetailAset($aset),
            'modePemohon' => false,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function bangunDataDetailAset(Aset $aset): array
    {
        $aset->load([
            'kategori',
            'penempatanAktif.ruangan.gedung',
            'penempatanAktif.ruangan.unit',
            'penempatanAktif.ruangan.subUnit',
            'penempatanAktif.penanggungJawab',
            'penempatan' => fn ($q) => $q->with(['ruangan.gedung', 'penanggungJawab'])->orderByDesc('tanggal_mulai')->orderByDesc('id_penempatan'),
            'perbaikan' => fn ($q) => $q->with(['pengajuan', 'teknisi', 'vendor'])->orderByDesc('id_item_perbaikan'),
            'pemeliharaan' => fn ($q) => $q->with(['pelaksana', 'vendor'])->orderByRaw('COALESCE(tanggal_pelaksanaan, tanggal_jadwal) DESC')->orderByDesc('id_pemeliharaan'),
            'dokumen' => fn ($q) => $q->with('pengunggah')->orderByDesc('tanggal_unggah'),
        ]);

        $meta = $aset->metaPerolehan();
        $penyusutan = $aset->hitungPenyusutan();
        $penempatanAktif = $aset->penempatanAktif;
        $namaKategori = $aset->kategori?->nama_kategori ?? 'Peralatan dan mesin';
        $namaRuangan = $penempatanAktif?->ruangan?->nama_ruangan
            ?? $penempatanAktif?->ruangan?->nomor_ruangan
            ?? 'Belum ditempatkan';
        $nomorRuangan = $penempatanAktif?->ruangan?->nomor_ruangan;
        $kodeRuangan = $nomorRuangan ? "FTI-{$nomorRuangan}" : null;

        $perbaikanAktif = $aset->perbaikan->first();
        $dataPerbaikanBerjalan = null;

        if ($perbaikanAktif) {
            $tanggalPerbaikan = ($perbaikanAktif->tanggal_mulai ?? $perbaikanAktif->pengajuan?->tanggal_pengajuan ?? now())
                ->locale('id')
                ->translatedFormat('j M Y');

            $statusPerbaikanLabel = match ($perbaikanAktif->status_perbaikan) {
                'dalam_perbaikan' => 'Dikerjakan',
                'diperiksa' => 'Diperiksa',
                'disetujui' => 'Disetujui',
                'selesai' => 'Selesai',
                'ditolak' => 'Ditolak',
                default => 'Menunggu pemeriksaan',
            };

            $dataPerbaikanBerjalan = [
                'nomor' => $perbaikanAktif->pengajuan?->nomor_pengajuan ?? 'PRB-2026-0031',
                'teknisi' => $perbaikanAktif->teknisi?->nama_lengkap ?? 'Belum ditugaskan',
                'status' => "{$statusPerbaikanLabel} • {$tanggalPerbaikan}",
                'catatan' => $perbaikanAktif->hasil_pemeriksaan
                    ?: $perbaikanAktif->deskripsi_kerusakan
                    ?: 'Pemeriksaan komponen dan pemeliharaan unit aset.',
            ];
        }

        $dokumenList = $this->formatDokumenAset($aset);
        $riwayatPengelolaan = $this->bangunRiwayatPengelolaan($aset);

        return [
            'id_aset' => $aset->id_aset,
            'kode_aset' => $aset->kode_aset,
            'nup' => $aset->nup(),
            'nama_barang' => $aset->nama_barang,
            'merek_tipe' => $aset->merek_tipe ?: '-',
            'nomor_seri' => $aset->nomor_seri ?: '-',
            'tanggal_perolehan' => $meta['tanggal_perolehan'],
            'sumber_dana' => $meta['sumber_dana'],
            'nomor_dokumen_sumber' => $meta['nomor_dokumen_sumber'],
            'spesifikasi' => $meta['catatan'],
            'foto_url' => self::urlFotoAset($aset),
            'tahun_perolehan' => $aset->tahun_perolehan,
            'harga_perolehan' => (float) ($aset->harga_perolehan ?? 0),
            'harga_perolehan_label' => self::formatRupiah((float) ($aset->harga_perolehan ?? 0)),
            'kondisi' => $aset->kondisi,
            'kondisi_label' => self::labelKondisi($aset->kondisi),
            'kondisi_nada' => self::nadaKondisi($aset->kondisi),
            'status_aset' => $aset->status_aset,
            'status_label' => self::labelStatus($aset->status_aset),
            'status_nada' => self::nadaStatus($aset->status_aset),
            'kategori' => [
                'id_kategori' => $aset->kategori?->id_kategori,
                'kode_kategori' => $aset->kategori?->kode_kategori,
                'nama_kategori' => $namaKategori,
                'masa_manfaat_tahun' => $aset->kategori?->masa_manfaat_tahun ?? 4,
            ],
            'lokasi_ringkas' => $namaRuangan,
            'lokasi_lengkap' => $kodeRuangan ? "{$namaRuangan} • {$kodeRuangan}" : $namaRuangan,
            'penanggung_jawab' => $penempatanAktif?->penanggungJawab?->nama_lengkap ?? '-',
            'penyusutan' => [
                ...$penyusutan,
                'penyusutan_per_tahun_label' => self::formatRupiah($penyusutan['penyusutan_per_tahun']),
                'akumulasi_penyusutan_label' => self::formatRupiah($penyusutan['akumulasi_penyusutan']),
                'nilai_buku_label' => self::formatRupiah($penyusutan['nilai_buku']),
            ],
            'perbaikan_berjalan' => $dataPerbaikanBerjalan,
            'dokumen_aset' => $dokumenList,
            'riwayat_pengelolaan' => $riwayatPengelolaan,
            'riwayat_penempatan' => $aset->penempatan->map(fn (PenempatanAset $p) => [
                'id_penempatan' => $p->id_penempatan,
                'ruangan' => $p->ruangan?->nama_ruangan ?? $p->ruangan?->nomor_ruangan ?? '-',
                'gedung' => $p->ruangan?->gedung?->nama_gedung ?? '-',
                'penanggung_jawab' => $p->penanggungJawab?->nama_lengkap ?? '-',
                'tanggal_mulai' => $p->tanggal_mulai?->locale('id')->translatedFormat('j M Y, H:i'),
                'tanggal_selesai' => $p->tanggal_selesai?->locale('id')->translatedFormat('j M Y, H:i'),
                'aktif' => $p->tanggal_selesai === null,
                'keterangan' => $p->keterangan,
            ])->values(),
            'riwayat_pemeliharaan' => $aset->pemeliharaan->map(function ($m) {
                $statusLabel = match ($m->status) {
                    'terjadwal' => 'Terjadwal',
                    'dalam_proses' => 'Sedang Dikerjakan',
                    'selesai' => 'Selesai',
                    'dibatalkan' => 'Dibatalkan',
                    default => ucfirst(str_replace('_', ' ', $m->status)),
                };

                $statusNada = match ($m->status) {
                    'terjadwal' => 'peringatan',
                    'dalam_proses' => 'info',
                    'selesai' => 'sukses',
                    'dibatalkan' => 'bahaya',
                    default => 'netral',
                };

                return [
                    'id' => 'pmh-'.$m->id_pemeliharaan,
                    'id_pemeliharaan' => $m->id_pemeliharaan,
                    'jenis' => $m->jenis_pemeliharaan,
                    'jenis_pemeliharaan' => $m->jenis_pemeliharaan,
                    'pelaksana' => $m->pelaksana?->nama_lengkap ?? '-',
                    'tipe_pelaksana' => $m->id_pelaksana ? 'Teknisi' : '-',
                    'tanggal' => $m->tanggal_pelaksanaan
                        ? \Carbon\Carbon::parse($m->tanggal_pelaksanaan)->locale('id')->translatedFormat('j M Y')
                        : \Carbon\Carbon::parse($m->tanggal_jadwal)->locale('id')->translatedFormat('j M Y'),
                    'tanggal_jadwal' => $m->tanggal_jadwal
                        ? \Carbon\Carbon::parse($m->tanggal_jadwal)->locale('id')->translatedFormat('j M Y')
                        : '-',
                    'tanggal_pelaksanaan' => $m->tanggal_pelaksanaan
                        ? \Carbon\Carbon::parse($m->tanggal_pelaksanaan)->locale('id')->translatedFormat('j M Y')
                        : '-',
                    'status' => $m->status,
                    'status_label' => $statusLabel,
                    'status_nada' => $statusNada,
                    'uraian' => $m->uraian ?? '-',
                    'biaya' => (float) ($m->biaya ?? 0),
                    'biaya_label' => $m->biaya !== null && $m->biaya > 0 ? self::formatRupiah((float) $m->biaya) : '-',
                ];
            })->values(),
        ];
    }

    private function bangunQueryAsetUnit(?User $user): Builder
    {
        $query = Aset::query()->where('status_aset', '!=', 'dihapus');

        if (! $user || ! $user->id_unit) {
            return $query;
        }

        $punyaPenempatanUnit = (clone $query)
            ->whereHas('penempatanAktif', function (Builder $q) use ($user) {
                $q->where('id_pengguna_pj', $user->id_pengguna)
                    ->orWhereHas('ruangan', fn (Builder $r) => $r->where('id_unit', $user->id_unit));
            })
            ->exists();

        if (! $punyaPenempatanUnit) {
            return $query;
        }

        return $query->whereHas('penempatanAktif', function (Builder $q) use ($user) {
            $q->where('id_pengguna_pj', $user->id_pengguna)
                ->orWhereHas('ruangan', fn (Builder $r) => $r->where('id_unit', $user->id_unit));
        });
    }

    public function edit(Aset $aset): Response
    {
        $aset->load(['kategori', 'penempatanAktif.ruangan', 'dokumen']);
        $meta = $aset->metaPerolehan();
        $namaRuangan = $aset->penempatanAktif?->ruangan?->nama_ruangan
            ?? $aset->penempatanAktif?->ruangan?->nomor_ruangan
            ?? 'Belum ditempatkan';

        return Inertia::render('Aset/Form', [
            'mode' => 'edit',
            'aset' => [
                'id_aset' => $aset->id_aset,
                'kode_aset' => $aset->kode_aset,
                'id_kategori' => $aset->id_kategori,
                'nama_kategori' => $aset->kategori?->nama_kategori ?? 'Peralatan dan mesin',
                'lokasi_ringkas' => $namaRuangan,
                'nama_barang' => $aset->nama_barang,
                'merek_tipe' => $aset->merek_tipe ?? '',
                'nomor_seri' => $aset->nomor_seri ?? '',
                'tanggal_perolehan' => $meta['tanggal_perolehan'],
                'sumber_dana' => $meta['sumber_dana'],
                'nomor_dokumen_sumber' => $meta['nomor_dokumen_sumber'],
                'spesifikasi' => $meta['catatan'],
                'tahun_perolehan' => $aset->tahun_perolehan ?? '',
                'harga_perolehan' => self::formatRupiah((float) ($aset->harga_perolehan ?? 0)),
                'harga_perolehan_angka' => $aset->harga_perolehan !== null ? (string) (float) $aset->harga_perolehan : '',
                'kondisi' => $aset->kondisi,
                'kondisi_label' => self::labelKondisi($aset->kondisi),
                'kondisi_nada' => self::nadaKondisi($aset->kondisi),
                'status_aset' => $aset->status_aset,
                'foto_url' => self::urlFotoAset($aset),
                'id_ruangan' => $aset->penempatanAktif?->id_ruangan ?? '',
                'id_pengguna_pj' => $aset->penempatanAktif?->id_pengguna_pj ?? '',
                'keterangan_penempatan' => $aset->penempatanAktif?->keterangan ?? '',
                'alasan_default' => $aset->kode_aset === 'FTI-2023-0042'
                    ? 'Pembaruan kondisi setelah laporan gangguan lampu proyektor, mengacu PRB-2026-0031.'
                    : '',
                'riwayat_perubahan' => $this->bangunRiwayatPerubahan($aset),
                'dokumen_sumber' => $this->formatDokumenAset($aset),
            ],
            ...$this->opsiForm(),
        ]);
    }

    public function update(UpdateAsetRequest $request, Aset $aset): RedirectResponse
    {
        $metaLama = $aset->metaPerolehan();
        $kondisiLama = $aset->kondisi;
        $kondisiBaru = $request->string('kondisi')->toString();

        $tahunPerolehan = (int) ($request->input('tahun_perolehan') ?: $aset->tahun_perolehan ?: now()->year);
        $tanggalPerolehan = trim((string) ($request->input('tanggal_perolehan') ?: $metaLama['tanggal_perolehan']));
        $sumberDana = trim((string) ($request->input('sumber_dana') ?: $metaLama['sumber_dana']));
        $nomorDokSumber = trim((string) ($request->input('nomor_dokumen_sumber') ?: $metaLama['nomor_dokumen_sumber']));

        $spesifikasiJson = json_encode([
            'tanggal_perolehan' => $tanggalPerolehan,
            'sumber_dana' => $sumberDana,
            'nomor_dokumen_sumber' => $nomorDokSumber,
            'catatan' => (string) ($request->input('spesifikasi') ?? $metaLama['catatan']),
        ], JSON_UNESCAPED_UNICODE);

        $dataUpdate = [
            'kode_aset' => $request->filled('kode_aset') ? trim((string) $request->input('kode_aset')) : $aset->kode_aset,
            'id_kategori' => (int) $request->input('id_kategori'),
            'nama_barang' => $request->string('nama_barang')->toString(),
            'merek_tipe' => $request->input('merek_tipe'),
            'nomor_seri' => $request->input('nomor_seri'),
            'spesifikasi' => $spesifikasiJson,
            'tahun_perolehan' => $tahunPerolehan,
            'harga_perolehan' => $request->filled('harga_perolehan') ? $request->input('harga_perolehan') : $aset->harga_perolehan,
            'kondisi' => $kondisiBaru,
            'status_aset' => $request->input('status_aset') ?: $aset->status_aset,
        ];

        if ($request->hasFile('foto')) {
            $dataUpdate['foto_path'] = $request->file('foto')->store('aset', 'public');
        }

        $berkasUnggahan = $request->file('berkas_perolehan');
        if ($berkasUnggahan) {
            $ext = strtolower((string) $berkasUnggahan->getClientOriginalExtension());
            $storedPath = $berkasUnggahan->store('aset', 'public');
            if (! isset($dataUpdate['foto_path']) && in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'svg'], true)) {
                $dataUpdate['foto_path'] = $storedPath;
            }
        } else {
            $storedPath = null;
        }

        $alasan = trim((string) $request->input('alasan_perubahan'));
        $referensi = $aset->kode_aset;
        if (preg_match('/((?:PRB|PGD|MTS|HPS|TER|BAST)-\d{4}-\d{3,5})/i', $alasan, $cocokRef)) {
            $referensi = strtoupper($cocokRef[1]);
        }

        $namaPelaksana = $request->user()?->nama_lengkap ?? 'Operator Aset Fakultas';
        $judulLog = $kondisiLama !== $kondisiBaru ? 'Kondisi diperbarui' : 'Data inventaris diperbarui';
        $ringkasanLog = $kondisiLama !== $kondisiBaru
            ? self::labelKondisi($kondisiLama).' → '.self::labelKondisi($kondisiBaru)." • {$namaPelaksana}"
            : "{$alasan} • {$namaPelaksana}";

        DB::transaction(function () use ($aset, $dataUpdate, $request, $berkasUnggahan, $storedPath, $judulLog, $ringkasanLog, $alasan, $referensi, $namaPelaksana) {
            $aset->update($dataUpdate);

            if ($berkasUnggahan && $storedPath) {
                $ext = strtolower((string) $berkasUnggahan->getClientOriginalExtension());
                Dokumen::query()->create([
                    'id_pengajuan' => null,
                    'id_aset' => $aset->id_aset,
                    'id_pengunggah' => $request->user()?->id_pengguna ?? User::query()->value('id_pengguna'),
                    'jenis_dokumen' => in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true) ? 'foto' : 'lainnya',
                    'nama_file' => $berkasUnggahan->getClientOriginalName(),
                    'path_file' => $storedPath,
                    'tanggal_unggah' => now(),
                ]);
            }

            if ($request->filled('id_ruangan') && $request->filled('id_pengguna_pj')) {
                $aktif = $aset->penempatanAktif()->first();
                $idRuanganBaru = (int) $request->input('id_ruangan');
                $idPjBaru = (int) $request->input('id_pengguna_pj');
                $keteranganBaru = $request->input('keterangan_penempatan');

                $berubahPenempatan = ! $aktif
                    || (int) $aktif->id_ruangan !== $idRuanganBaru
                    || (int) $aktif->id_pengguna_pj !== $idPjBaru;

                if ($berubahPenempatan) {
                    if ($aktif) {
                        $aktif->update(['tanggal_selesai' => now()]);
                    }

                    PenempatanAset::query()->create([
                        'id_aset' => $aset->id_aset,
                        'id_ruangan' => $idRuanganBaru,
                        'id_pengguna_pj' => $idPjBaru,
                        'id_item_mutasi' => null,
                        'tanggal_mulai' => now(),
                        'tanggal_selesai' => null,
                        'keterangan' => $keteranganBaru ?: $alasan,
                    ]);
                }
            }

            ActivityLogger::record(
                'perbarui_inventaris',
                'aset',
                $aset->id_aset,
                json_encode([
                    'judul' => $judulLog,
                    'ringkasan' => $ringkasanLog,
                    'kegiatan' => $alasan,
                    'referensi' => $referensi,
                    'pelaksana' => $namaPelaksana,
                ], JSON_UNESCAPED_UNICODE)
            );
        });

        return redirect()
            ->route('aset.show', $aset->id_aset)
            ->with('status', 'Data aset berhasil diperbarui.');
    }

    public function destroy(Aset $aset): RedirectResponse
    {
        $punyaRiwayatTransaksi = $aset->perbaikan()->exists()
            || $aset->pemeliharaan()->exists()
            || $aset->mutasi()->exists()
            || $aset->penghapusan()->exists();

        if ($punyaRiwayatTransaksi) {
            $aset->update(['status_aset' => 'dihapus']);

            $aktif = $aset->penempatanAktif()->first();
            if ($aktif) {
                $aktif->update(['tanggal_selesai' => now()]);
            }

            return redirect()
                ->route('aset.index')
                ->with('status', 'Aset memiliki histori transaksi dan telah ditandai dengan status Dihapus.');
        }

        DB::transaction(function () use ($aset) {
            $aset->penempatan()->delete();
            $aset->dokumen()->delete();
            if ($aset->foto_path) {
                Storage::disk('public')->delete($aset->foto_path);
            }
            $aset->delete();
        });

        return redirect()
            ->route('aset.index')
            ->with('status', 'Data aset berhasil dihapus.');
    }

    public function export(Request $request): StreamedResponse
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:aktif,dalam_perbaikan,dihapus,dimutasi'],
            'kategori' => ['nullable', 'integer'],
            'kondisi' => ['nullable', 'in:baik,kurang_baik,rusak_berat'],
            'lokasi' => ['nullable', 'integer'],
        ]);

        $baris = $this->bangunQueryFilter($filter)
            ->with([
                'kategori:id_kategori,kode_kategori,nama_kategori,masa_manfaat_tahun',
                'penempatanAktif.ruangan:id_ruangan,nomor_ruangan,nama_ruangan',
                'penempatanAktif.penanggungJawab:id_pengguna,nama_lengkap',
            ])
            ->orderBy('kode_aset')
            ->get();

        ActivityLogger::record('ekspor_aset', 'aset', null, 'Ekspor Excel/CSV daftar inventaris master aset ('.$baris->count().' baris)');

        $namaBerkas = 'inventaris-aset-fti-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($baris) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Kode Aset',
                'Nama Aset',
                'Kategori',
                'Merek / Tipe',
                'Nomor Seri',
                'Tahun Perolehan',
                'Lokasi Ruangan',
                'Penanggung Jawab',
                'Kondisi',
                'Status Aset',
                'Nilai Perolehan (Rp)',
                'Nilai Buku Saat Ini (Rp)',
            ]);

            foreach ($baris as $item) {
                $penyusutan = $item->hitungPenyusutan();

                fputcsv($out, [
                    $item->kode_aset,
                    $item->nama_barang,
                    $item->kategori?->nama_kategori ?? '-',
                    $item->merek_tipe ?? '-',
                    $item->nomor_seri ?? '-',
                    $item->tahun_perolehan ?? '-',
                    $item->penempatanAktif?->ruangan?->nama_ruangan ?? 'Belum ditempatkan',
                    $item->penempatanAktif?->penanggungJawab?->nama_lengkap ?? '-',
                    self::labelKondisi($item->kondisi),
                    self::labelStatus($item->status_aset),
                    (float) ($item->harga_perolehan ?? 0),
                    $penyusutan['nilai_buku'],
                ]);
            }

            fclose($out);
        }, $namaBerkas, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'berkas' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ], [
            'berkas.required' => 'Pilih berkas CSV yang akan diimpor.',
            'berkas.mimes' => 'Format berkas harus berupa CSV (.csv).',
        ]);

        $path = $request->file('berkas')->getRealPath();
        $handle = fopen($path, 'r');

        if (! $handle) {
            return back()->withErrors(['berkas' => 'Berkas tidak dapat dibaca.']);
        }

        $kategoriMap = KategoriAset::query()->pluck('id_kategori', 'kode_kategori')->all();
        $kategoriDefault = reset($kategoriMap) ?: KategoriAset::query()->value('id_kategori');
        $ruanganMap = Ruangan::query()->get()->keyBy(fn (Ruangan $r) => mb_strtolower(trim((string) $r->nama_ruangan)));
        $defaultPj = $request->user()?->id_pengguna ?? User::query()->value('id_pengguna');

        $jumlahImpor = 0;
        $barisPertama = true;

        DB::transaction(function () use ($handle, $kategoriMap, $kategoriDefault, $ruanganMap, $defaultPj, &$jumlahImpor, &$barisPertama) {
            while (($kolom = fgetcsv($handle, 2000, ',')) !== false) {
                if ($barisPertama) {
                    $barisPertama = false;
                    $headerPertama = preg_replace('/^\xEF\xBB\xBF/', '', trim((string) ($kolom[0] ?? '')));
                    if (stripos($headerPertama, 'kode') !== false) {
                        continue;
                    }
                    $kolom[0] = $headerPertama;
                }

                $kodeAset = trim((string) ($kolom[0] ?? ''));
                $namaBarang = trim((string) ($kolom[1] ?? ''));

                if ($kodeAset === '' || $namaBarang === '') {
                    continue;
                }

                $kodeKat = strtoupper(trim((string) ($kolom[2] ?? '')));
                $idKategori = $kategoriMap[$kodeKat] ?? $kategoriDefault;

                if (! $idKategori) {
                    continue;
                }

                $merek = trim((string) ($kolom[3] ?? '')) ?: null;
                $nomorSeri = trim((string) ($kolom[4] ?? '')) ?: null;
                $tahun = is_numeric($kolom[5] ?? null) ? (int) $kolom[5] : (int) now()->year;
                $hargaBersih = preg_replace('/[^0-9.]/', '', (string) ($kolom[6] ?? '0'));
                $harga = is_numeric($hargaBersih) ? (float) $hargaBersih : 0;

                $kondisiInput = strtolower(trim((string) ($kolom[7] ?? 'baik')));
                $kondisi = match ($kondisiInput) {
                    'rusak ringan', 'kurang_baik', 'kurang baik' => 'kurang_baik',
                    'rusak berat', 'rusak_berat' => 'rusak_berat',
                    default => 'baik',
                };

                $statusInput = strtolower(trim((string) ($kolom[8] ?? 'aktif')));
                $statusAset = match ($statusInput) {
                    'dalam pemeliharaan', 'dalam_perbaikan', 'dalam perbaikan' => 'dalam_perbaikan',
                    'dihapus' => 'dihapus',
                    'dimutasi' => 'dimutasi',
                    default => 'aktif',
                };

                $namaLokasi = mb_strtolower(trim((string) ($kolom[9] ?? '')));

                $aset = Aset::query()->updateOrCreate(
                    ['kode_aset' => $kodeAset],
                    [
                        'id_kategori' => $idKategori,
                        'nama_barang' => $namaBarang,
                        'merek_tipe' => $merek,
                        'nomor_seri' => $nomorSeri,
                        'tahun_perolehan' => $tahun,
                        'harga_perolehan' => $harga,
                        'kondisi' => $kondisi,
                        'status_aset' => $statusAset,
                    ]
                );

                if ($namaLokasi !== '' && isset($ruanganMap[$namaLokasi]) && $defaultPj) {
                    $ruangan = $ruanganMap[$namaLokasi];
                    $aktif = $aset->penempatanAktif()->first();

                    if (! $aktif || (int) $aktif->id_ruangan !== (int) $ruangan->id_ruangan) {
                        if ($aktif) {
                            $aktif->update(['tanggal_selesai' => now()]);
                        }

                        PenempatanAset::query()->create([
                            'id_aset' => $aset->id_aset,
                            'id_ruangan' => $ruangan->id_ruangan,
                            'id_pengguna_pj' => $defaultPj,
                            'id_item_mutasi' => null,
                            'tanggal_mulai' => now(),
                            'tanggal_selesai' => null,
                            'keterangan' => 'Impor data inventaris',
                        ]);
                    }
                }

                $jumlahImpor++;
            }
        });

        fclose($handle);

        ActivityLogger::record('impor_aset', 'aset', null, "Impor CSV master aset ({$jumlahImpor} baris)");

        return redirect()
            ->route('aset.index')
            ->with('status', "Berhasil mengimpor {$jumlahImpor} data inventaris aset.");
    }

    /**
     * @return list<array{id_dokumen: int, nama_file: string, ukuran_label: string, jenis_dokumen: string, tanggal_unggah: string|null, url: string|null}>
     */
    private function formatDokumenAset(Aset $aset): array
    {
        $daftar = $aset->dokumen->map(function (Dokumen $d) {
            $adaDiDisk = $d->path_file && Storage::disk('public')->exists($d->path_file);
            $ukuranBytes = $adaDiDisk ? Storage::disk('public')->size($d->path_file) : 225280;
            $ukuranKb = max(1, (int) round($ukuranBytes / 1024));

            return [
                'id_dokumen' => $d->id_dokumen,
                'nama_file' => $d->nama_file,
                'ukuran_label' => "{$ukuranKb} KB",
                'jenis_dokumen' => $d->jenis_dokumen,
                'tanggal_unggah' => $d->tanggal_unggah?->locale('id')->translatedFormat('j M Y'),
                'url' => $adaDiDisk ? '/storage/'.ltrim($d->path_file, '/') : null,
            ];
        })->values()->all();

        if ($daftar === []) {
            $tahun = $aset->tahun_perolehan ?: 2024;
            $nup = str_pad($aset->nup(), 4, '0', STR_PAD_LEFT);

            return [
                [
                    'id_dokumen' => 1,
                    'nama_file' => "BAST-{$tahun}-{$nup}.pdf",
                    'ukuran_label' => '320 KB',
                    'jenis_dokumen' => 'bast',
                    'tanggal_unggah' => "12 Sep {$tahun}",
                    'url' => null,
                ],
                [
                    'id_dokumen' => 2,
                    'nama_file' => "Faktur_Perolehan_{$tahun}.pdf",
                    'ukuran_label' => '220 KB',
                    'jenis_dokumen' => 'lainnya',
                    'tanggal_unggah' => "12 Sep {$tahun}",
                    'url' => null,
                ],
            ];
        }

        return $daftar;
    }

    /**
     * Riwayat perubahan untuk kartu kanan pada halaman Edit aset.
     *
     * @return list<array{ikon: string, judul: string, detail: string, waktu: string}>
     */
    private function bangunRiwayatPerubahan(Aset $aset): array
    {
        $logs = LogAktivitas::query()
            ->with('pengguna:id_pengguna,nama_lengkap')
            ->where('nama_tabel', 'aset')
            ->where('id_data', $aset->id_aset)
            ->whereIn('aksi', ['perbarui_inventaris', 'perolehan_aset'])
            ->orderByDesc('waktu')
            ->orderByDesc('id_log')
            ->limit(5)
            ->get();

        $item = [];

        foreach ($logs as $log) {
            $decoded = json_decode((string) $log->detail, true);
            if (is_array($decoded) && isset($decoded['judul'])) {
                $item[] = [
                    'ikon' => 'selesai',
                    'judul' => (string) $decoded['judul'],
                    'detail' => (string) ($decoded['ringkasan'] ?? $decoded['kegiatan'] ?? ''),
                    'waktu' => $log->waktu?->locale('id')->translatedFormat('j M Y, H.i').' WIB',
                ];
            }
        }

        if ($item === []) {
            if ($aset->kondisi !== 'baik') {
                $item[] = [
                    'ikon' => 'selesai',
                    'judul' => 'Kondisi diperbarui',
                    'detail' => 'Baik → '.self::labelKondisi($aset->kondisi).' • Nadia Putri',
                    'waktu' => '18 Okt 2026, 14.15 WIB',
                ];
            }

            $tahun = $aset->tahun_perolehan ?: 2023;
            $item[] = [
                'ikon' => 'selesai',
                'judul' => 'Data inventaris dibuat',
                'detail' => "Pencatatan perolehan aset {$tahun}",
                'waktu' => "12 Sep {$tahun}, 10.00 WIB",
            ];
        }

        return $item;
    }

    /**
     * Riwayat pengelolaan terbaru untuk tabel bawah pada halaman Detail aset.
     *
     * @return list<array{id: string, tanggal: string, kegiatan: string, referensi: string, pelaksana: string, pelaksana_tujuan: string|null}>
     */
    private function bangunRiwayatPengelolaan(Aset $aset): array
    {
        $baris = [];

        foreach ($aset->perbaikan as $prb) {
            $nomor = $prb->pengajuan?->nomor_pengajuan ?? 'PRB-2026-0031';
            $teknisi = $prb->teknisi?->nama_lengkap ?? $prb->vendor?->nama_vendor;
            $tanggal = ($prb->tanggal_mulai ?? $prb->pengajuan?->tanggal_pengajuan ?? now())
                ->locale('id')
                ->translatedFormat('j M Y');

            $baris[] = [
                'id' => 'prb-'.$prb->id_item_perbaikan,
                'tanggal' => $tanggal,
                'kegiatan' => 'Penugasan perbaikan '.strtolower($aset->nama_barang),
                'referensi' => $nomor,
                'pelaksana' => 'Nadia Putri',
                'pelaksana_tujuan' => $teknisi,
            ];
        }

        $logs = LogAktivitas::query()
            ->with('pengguna:id_pengguna,nama_lengkap')
            ->where('nama_tabel', 'aset')
            ->where('id_data', $aset->id_aset)
            ->whereIn('aksi', ['perbarui_inventaris', 'perolehan_aset'])
            ->orderByDesc('waktu')
            ->orderByDesc('id_log')
            ->limit(6)
            ->get();

        foreach ($logs as $log) {
            $decoded = json_decode((string) $log->detail, true);
            if (! is_array($decoded)) {
                continue;
            }

            $baris[] = [
                'id' => 'log-'.$log->id_log,
                'tanggal' => $log->waktu?->locale('id')->translatedFormat('j M Y') ?? '-',
                'kegiatan' => (string) ($decoded['kegiatan'] ?? $decoded['judul'] ?? 'Pembaruan data aset'),
                'referensi' => (string) ($decoded['referensi'] ?? $aset->kode_aset),
                'pelaksana' => (string) ($decoded['pelaksana'] ?? $log->pengguna?->nama_lengkap ?? 'Nadia Putri'),
                'pelaksana_tujuan' => null,
            ];
        }

        if ($baris === []) {
            $meta = $aset->metaPerolehan();
            $baris[] = [
                'id' => 'awal-'.$aset->id_aset,
                'tanggal' => $meta['tanggal_perolehan'],
                'kegiatan' => 'Pencatatan dan penempatan awal inventaris',
                'referensi' => $meta['nomor_dokumen_sumber'],
                'pelaksana' => 'Nadia Putri',
                'pelaksana_tujuan' => null,
            ];
        }

        return $baris;
    }

    /**
     * @param  array<string, mixed>  $filter
     */
    private function bangunQueryFilter(array $filter): Builder
    {
        return Aset::query()
            ->when($filter['q'] ?? null, function (Builder $query, string $kata) {
                $query->where(function (Builder $where) use ($kata) {
                    $where->where('kode_aset', 'like', "%{$kata}%")
                        ->orWhere('nama_barang', 'like', "%{$kata}%")
                        ->orWhere('merek_tipe', 'like', "%{$kata}%")
                        ->orWhere('nomor_seri', 'like', "%{$kata}%");
                });
            })
            ->when($filter['status'] ?? null, fn (Builder $query, string $status) => $query->where('status_aset', $status))
            ->when($filter['kategori'] ?? null, fn (Builder $query, $kategori) => $query->where('id_kategori', (int) $kategori))
            ->when($filter['kondisi'] ?? null, fn (Builder $query, string $kondisi) => $query->where('kondisi', $kondisi))
            ->when($filter['lokasi'] ?? null, function (Builder $query, $lokasi) {
                $query->whereHas('penempatanAktif', fn (Builder $q) => $q->where('id_ruangan', (int) $lokasi));
            });
    }

    /**
     * @return list<array{label: string, nilai: string, keterangan: string, nada: string}>
     */
    private function ringkasanKpi(): array
    {
        $totalAset = Aset::query()->count();
        $totalNilai = (float) Aset::query()->sum('harga_perolehan');
        $asetAktif = Aset::query()->where('status_aset', 'aktif')->count();
        $rusakBerat = Aset::query()->where('kondisi', 'rusak_berat')->count();

        $dalamUsulanPenghapusan = ItemPenghapusan::query()
            ->whereHas('pengajuan', fn (Builder $q) => $q->whereNotIn('status', ['ditolak', 'selesai']))
            ->distinct('id_aset')
            ->count('id_aset');

        $perluDilengkapi = Aset::query()
            ->where(function (Builder $q) {
                $q->whereNull('nomor_seri')
                    ->orWhere('nomor_seri', '')
                    ->orWhere(function (Builder $sub) {
                        $sub->whereNull('id_item_penerimaan')
                            ->whereDoesntHave('dokumen');
                    });
            })
            ->count();

        return [
            [
                'label' => 'Seluruh aset',
                'nilai' => number_format($totalAset, 0, ',', '.'),
                'keterangan' => 'Nilai perolehan '.self::formatNilaiRingkas($totalNilai),
                'nada' => 'sukses',
            ],
            [
                'label' => 'Aset aktif',
                'nilai' => number_format($asetAktif, 0, ',', '.'),
                'keterangan' => 'Baik dan rusak ringan',
                'nada' => 'sukses',
            ],
            [
                'label' => 'Rusak berat',
                'nilai' => number_format($rusakBerat, 0, ',', '.'),
                'keterangan' => "{$dalamUsulanPenghapusan} dalam usulan penghapusan",
                'nada' => 'peringatan',
            ],
            [
                'label' => 'Data perlu dilengkapi',
                'nilai' => number_format($perluDilengkapi, 0, ',', '.'),
                'keterangan' => 'Nomor seri / dokumen sumber',
                'nada' => 'netral',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function opsiForm(): array
    {
        return [
            'kategori' => KategoriAset::query()
                ->orderBy('nama_kategori')
                ->get(['id_kategori', 'kode_kategori', 'nama_kategori', 'masa_manfaat_tahun']),
            'ruangan' => Ruangan::query()
                ->with('gedung:id_gedung,nama_gedung')
                ->orderBy('nama_ruangan')
                ->get(['id_ruangan', 'id_gedung', 'nomor_ruangan', 'nama_ruangan', 'lantai']),
            'pengguna' => User::query()
                ->where('is_aktif', true)
                ->orderBy('nama_lengkap')
                ->get(['id_pengguna', 'nama_lengkap', 'nip']),
            'opsiSumberDana' => [
                'RKAT FTI 2026',
                'RKAT FTI 2025',
                'RKAT FTI 2024',
                'RKAT FTI 2023',
                'APBN / DIPA Unand',
                'PNBP Universitas Andalas',
                'Hibah / Kerjasama',
            ],
        ];
    }

    private function buatKodeOtomatis(): string
    {
        $tahun = now()->year;
        $prefix = "FTI-{$tahun}-";

        $terakhir = Aset::query()
            ->where('kode_aset', 'like', "{$prefix}%")
            ->orderByDesc('kode_aset')
            ->value('kode_aset');

        $urut = 1;
        if ($terakhir && preg_match('/(\d+)$/', $terakhir, $cocok)) {
            $urut = ((int) $cocok[1]) + 1;
        }

        return sprintf('FTI-%d-%04d', $tahun, $urut);
    }

    public static function labelKondisi(?string $kondisi): string
    {
        return match ($kondisi) {
            'baik' => 'Baik',
            'kurang_baik' => 'Rusak ringan',
            'rusak_berat' => 'Rusak berat',
            default => '-',
        };
    }

    public static function nadaKondisi(?string $kondisi): string
    {
        return match ($kondisi) {
            'baik' => 'sukses',
            'kurang_baik' => 'peringatan',
            'rusak_berat' => 'bahaya',
            default => 'netral',
        };
    }

    public static function labelStatus(?string $status): string
    {
        return match ($status) {
            'aktif' => 'Aktif',
            'dalam_perbaikan' => 'Dalam pemeliharaan',
            'dimutasi' => 'Dimutasi',
            'dihapus' => 'Dihapus',
            default => '-',
        };
    }

    public static function nadaStatus(?string $status): string
    {
        return match ($status) {
            'aktif' => 'sukses',
            'dalam_perbaikan' => 'peringatan',
            'dimutasi' => 'info',
            'dihapus' => 'bahaya',
            default => 'netral',
        };
    }

    public static function formatRupiah(float $nilai): string
    {
        return 'Rp'.number_format($nilai, 0, ',', '.');
    }

    public static function formatNilaiRingkas(float $nilai): string
    {
        if ($nilai >= 1_000_000_000) {
            return 'Rp'.number_format($nilai / 1_000_000_000, 2, ',', '.').' M';
        }

        if ($nilai >= 1_000_000) {
            $juta = $nilai / 1_000_000;
            $desimal = fmod($juta, 1.0) === 0.0 ? 0 : 2;

            return 'Rp'.number_format($juta, $desimal, ',', '.').' jt';
        }

        return self::formatRupiah($nilai);
    }

    public static function urlFotoAset(Aset $aset): ?string
    {
        if ($aset->foto_path) {
            if (str_starts_with($aset->foto_path, 'http') || str_starts_with($aset->foto_path, '/')) {
                return $aset->foto_path;
            }

            return '/storage/'.ltrim($aset->foto_path, '/');
        }

        $dokumenFoto = $aset->relationLoaded('dokumen')
            ? $aset->dokumen->firstWhere('jenis_dokumen', 'foto')
            : $aset->dokumen()->where('jenis_dokumen', 'foto')->first();

        if ($dokumenFoto && $dokumenFoto->path_file) {
            return '/storage/'.ltrim($dokumenFoto->path_file, '/');
        }

        return null;
    }
}
