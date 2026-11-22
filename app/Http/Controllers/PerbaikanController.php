<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePerbaikanRequest;
use App\Models\Aset;
use App\Models\ItemPerbaikan;
use App\Models\Pengajuan;
use App\Models\RiwayatStatusPengajuan;
use App\Models\User;
use App\Models\Vendor;
use App\Services\ActivityLogger;
use App\Support\PeranNama;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PerbaikanController extends Controller
{
    /**
     * Tampilan form pengajuan perbaikan untuk peran Pemohon (/pemohon/pengajuan/perbaikan)
     */
    public function pengajuanPemohon(Request $request): Response
    {
        $user = $request->user();

        // Ambil daftar aset aktif di unit pemohon yang belum memiliki tiket perbaikan aktif
        $queryAset = Aset::query()
            ->with(['kategori:id_kategori,nama_kategori', 'penempatan' => function ($q) {
                $q->whereNull('tanggal_selesai')->with('ruangan:id_ruangan,nama_ruangan,nomor_ruangan');
            }])
            ->where('status_aset', 'aktif')
            ->whereDoesntHave('perbaikan', function ($q) {
                $q->whereIn('status_perbaikan', ['menunggu', 'diperiksa', 'disetujui', 'dalam_perbaikan']);
            });

        if (! empty($user->id_unit)) {
            $queryAset->whereHas('penempatan', function ($q) use ($user) {
                $q->whereNull('tanggal_selesai')
                    ->whereHas('ruangan', fn ($qr) => $qr->where('id_unit', $user->id_unit));
            });
        }

        $daftarAset = $queryAset
            ->orderBy('nama_barang')
            ->get()
            ->map(function (Aset $aset) {
                $penempatanAktif = $aset->penempatan->first();
                $ruangan = $penempatanAktif?->ruangan;
                $lokasiTeks = $ruangan
                    ? "{$ruangan->nama_ruangan} (R. {$ruangan->nomor_ruangan})"
                    : 'Belum ditempatkan';

                return [
                    'id_aset' => $aset->id_aset,
                    'kode_aset' => $aset->kode_aset,
                    'nama_barang' => $aset->nama_barang,
                    'merek_tipe' => $aset->merek_tipe ?? '-',
                    'kategori' => $aset->kategori?->nama_kategori ?? '-',
                    'kondisi' => $aset->kondisi,
                    'status_aset' => $aset->status_aset,
                    'lokasi' => $lokasiTeks,
                ];
            });

        // Riwayat pengajuan perbaikan milik pemohon / unit
        $riwayatPengajuan = Pengajuan::query()
            ->with(['itemPerbaikan.aset'])
            ->where('jenis_pengajuan', 'perbaikan')
            ->where('id_pemohon', $user->id_pengguna)
            ->orderByDesc('id_pengajuan')
            ->limit(10)
            ->get()
            ->map(function (Pengajuan $p) {
                $item = $p->itemPerbaikan->first();
                $nadaStatus = match ($p->status) {
                    'selesai' => 'sukses',
                    'diproses' => 'info',
                    'ditolak' => 'bahaya',
                    default => 'peringatan',
                };

                return [
                    'id_pengajuan' => $p->id_pengajuan,
                    'nomor_pengajuan' => $p->nomor_pengajuan,
                    'tanggal' => $p->tanggal_pengajuan ? $p->tanggal_pengajuan->translatedFormat('d M Y') : '-',
                    'nama_barang' => $item?->aset?->nama_barang ?? 'Aset tidak ditemukan',
                    'kode_aset' => $item?->aset?->kode_aset ?? '-',
                    'deskripsi_kerusakan' => $item?->deskripsi_kerusakan ?? '-',
                    'status' => ucfirst(str_replace('_', ' ', $p->status)),
                    'nada' => $nadaStatus,
                    'href' => route('pemohon.pengajuan.show', $p->id_pengajuan, false),
                ];
            });

        return Inertia::render('Perbaikan/Pengajuan', [
            'daftarAset' => $daftarAset,
            'riwayatPengajuan' => $riwayatPengajuan,
            'pemohon' => [
                'nama_lengkap' => $user->nama_lengkap,
                'nip' => $user->nip ?? '-',
                'unit' => $user->unit?->nama_unit ?? 'Fakultas Teknologi Informasi',
                'sub_unit' => $user->subUnit?->nama_sub_unit ?? 'Unit Kerja',
            ],
        ]);
    }

    /**
     * Simpan pengajuan perbaikan baru dari peran Pemohon.
     */
    public function store(StorePerbaikanRequest $request): RedirectResponse
    {
        $user = $request->user()->load(['unit', 'subUnit']);
        $validated = $request->validated();

        $asetCek = Aset::query()->findOrFail($validated['id_aset']);

        if ($asetCek->status_aset !== 'aktif') {
            return back()->withErrors([
                'id_aset' => 'Hanya aset berstatus aktif yang dapat diajukan perbaikannya.',
            ])->withInput();
        }

        $masihAktif = ItemPerbaikan::query()
            ->where('id_aset', $asetCek->id_aset)
            ->whereIn('status_perbaikan', ['menunggu', 'diperiksa', 'disetujui', 'dalam_perbaikan'])
            ->exists();

        if ($masihAktif) {
            return back()->withErrors([
                'id_aset' => 'Aset ini masih memiliki pengajuan atau proses perbaikan yang sedang berjalan.',
            ])->withInput();
        }

        if (! empty($user->id_unit)) {
            $diUnitPemohon = $asetCek->penempatan()
                ->whereNull('tanggal_selesai')
                ->whereHas('ruangan', fn ($qr) => $qr->where('id_unit', $user->id_unit))
                ->exists();

            if (! $diUnitPemohon) {
                return back()->withErrors([
                    'id_aset' => 'Aset yang dipilih bukan milik unit kerja Anda.',
                ])->withInput();
            }
        }

        $pengajuan = DB::transaction(function () use ($request, $user, $validated) {
            $nomorPengajuan = $this->generateNomorPengajuan();

            // Susun keterangan pengajuan
            $unitPengusul = $user->unit?->nama_unit ?? '-';
            if ($user->subUnit) {
                $unitPengusul .= " ({$user->subUnit->nama_sub_unit})";
            }

            // Ambil data aset untuk keterangan dan pencatatan
            $aset = Aset::find($validated['id_aset']);
            $namaAset = $aset ? "{$aset->nama_barang} ({$aset->kode_aset})" : "Aset #{$validated['id_aset']}";

            $keteranganParts = [
                "Perihal: Perbaikan {$namaAset}",
                "Unit Pengusul: {$unitPengusul}",
                "Pengusul: {$user->nama_lengkap} (NIP: " . ($user->nip ?? '-') . ")",
            ];

            if (! empty($validated['lokasi_fisik'])) {
                $keteranganParts[] = "Lokasi Fisik Terkini: {$validated['lokasi_fisik']}";
            }

            if (! empty($validated['keterangan'])) {
                $keteranganParts[] = "Catatan Tambahan: {$validated['keterangan']}";
            }

            $keterangan = implode("\n", $keteranganParts);

            // 1. Simpan tabel pengajuan induk
            $pengajuan = Pengajuan::query()->create([
                'id_pemohon' => $user->id_pengguna,
                'nomor_pengajuan' => $nomorPengajuan,
                'jenis_pengajuan' => 'perbaikan',
                'tanggal_pengajuan' => now(),
                'keterangan' => $keterangan,
                'status' => 'diajukan',
            ]);

            // 2. Unggah foto bukti kerusakan jika ada
            $fotoPath = null;
            if ($request->hasFile('foto_kerusakan')) {
                $fotoPath = $request->file('foto_kerusakan')->store('kerusakan', 'public');
            }

            // 3. Simpan tabel item_perbaikan
            ItemPerbaikan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_aset' => $validated['id_aset'],
                'deskripsi_kerusakan' => $validated['deskripsi_kerusakan'],
                'foto_kerusakan_path' => $fotoPath,
                'status_perbaikan' => 'menunggu',
            ]);

            // 4. Catat riwayat status pengajuan pertama
            RiwayatStatusPengajuan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $user->id_pengguna,
                'status_baru' => 'diajukan',
                'catatan' => 'Pengajuan perbaikan diajukan oleh pemohon',
                'waktu' => now(),
            ]);

            // 5. Perbarui kondisi aset jika pengusul memilih rusak_berat
            if (! empty($validated['tingkat_kerusakan'])) {
                Aset::query()
                    ->where('id_aset', $validated['id_aset'])
                    ->update(['kondisi' => $validated['tingkat_kerusakan']]);
            }

            // Catat log aktivitas
            ActivityLogger::record(
                'buat_pengajuan_perbaikan',
                'pengajuan',
                $pengajuan->id_pengajuan,
                "Pengajuan perbaikan aset {$nomorPengajuan} berhasil diajukan oleh {$user->nama_lengkap}",
                $user->id_pengguna
            );

            return $pengajuan;
        });

        return redirect()
            ->route('pemohon.perbaikan')
            ->with('status', "Pengajuan perbaikan berhasil dikirim dengan nomor {$pengajuan->nomor_pengajuan}.");
    }

    /**
     * Tampilan daftar pemrosesan perbaikan bagi Operator Aset (/perbaikan)
     */
    public function indexOperator(Request $request): Response
    {
        $tab = $request->query('tab', 'antrean');
        if (! in_array($tab, ['antrean', 'proses', 'selesai', 'semua'], true)) {
            $tab = 'antrean';
        }

        $query = ItemPerbaikan::query()
            ->with([
                'aset.kategori',
                'pengajuan.pemohon.unit',
                'teknisi',
                'vendor',
            ])
            ->whereHas('pengajuan', fn ($q) => $q->where('status', '!=', 'draft'));

        // Filter tab
        if ($tab === 'antrean') {
            // Sudah disetujui pimpinan / siap ditugaskan
            $query->where('status_perbaikan', 'disetujui');
        } elseif ($tab === 'proses') {
            // Sedang dalam perbaikan teknisi atau vendor
            $query->where('status_perbaikan', 'dalam_perbaikan');
        } elseif ($tab === 'selesai') {
            // Perbaikan telah rampung
            $query->where('status_perbaikan', 'selesai');
        }

        // Filter pencarian
        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->whereHas('pengajuan', fn ($qp) => $qp->where('nomor_pengajuan', 'like', $keyword))
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword))
                    ->orWhereHas('teknisi', fn ($qt) => $qt->where('nama_lengkap', 'like', $keyword))
                    ->orWhereHas('vendor', fn ($qv) => $qv->where('nama_vendor', 'like', $keyword));
            });
        }

        $daftarPerbaikan = $query
            ->orderByDesc('id_item_perbaikan')
            ->paginate(10)
            ->withQueryString()
            ->through(function (ItemPerbaikan $item) {
                $nadaStatus = match ($item->status_perbaikan) {
                    'selesai' => 'sukses',
                    'dalam_perbaikan' => 'info',
                    'disetujui' => 'peringatan',
                    'ditolak' => 'bahaya',
                    default => 'netral',
                };

                $labelStatus = match ($item->status_perbaikan) {
                    'disetujui' => 'Siap Ditugaskan',
                    'dalam_perbaikan' => 'Dikerjakan',
                    'selesai' => 'Selesai',
                    'ditolak' => 'Ditolak',
                    default => ucfirst($item->status_perbaikan),
                };

                $pelaksanaTeks = match (true) {
                    (bool) $item->perlu_vendor && $item->vendor !== null => "Vendor: {$item->vendor->nama_vendor}",
                    $item->teknisi !== null => "Teknisi: {$item->teknisi->nama_lengkap}",
                    default => '-',
                };

                return [
                    'id_item_perbaikan' => $item->id_item_perbaikan,
                    'id_pengajuan' => $item->id_pengajuan,
                    'nomor_pengajuan' => $item->pengajuan?->nomor_pengajuan ?? '-',
                    'tanggal_pengajuan' => $item->pengajuan?->tanggal_pengajuan?->format('d M Y') ?? '-',
                    'pemohon_nama' => $item->pengajuan?->pemohon?->nama_lengkap ?? '-',
                    'unit_nama' => $item->pengajuan?->pemohon?->unit?->nama_unit ?? '-',
                    'kode_aset' => $item->aset?->kode_aset ?? '-',
                    'nama_barang' => $item->aset?->nama_barang ?? '-',
                    'merek_tipe' => $item->aset?->merek_tipe ?? '-',
                    'kondisi_aset' => $item->aset?->kondisi ?? '-',
                    'deskripsi_kerusakan' => $item->deskripsi_kerusakan,
                    'foto_url' => $item->foto_kerusakan_path ? asset('storage/' . $item->foto_kerusakan_path) : null,
                    'estimasi_biaya' => (float) ($item->estimasi_biaya ?? 0),
                    'harga_penawaran' => (float) ($item->harga_penawaran ?? 0),
                    'biaya_aktual' => (float) ($item->biaya_aktual ?? 0),
                    'perlu_vendor' => (bool) $item->perlu_vendor,
                    'pelaksana' => $pelaksanaTeks,
                    'status_perbaikan' => $item->status_perbaikan,
                    'status_label' => $labelStatus,
                    'status_nada' => $nadaStatus,
                    'bisa_ditugaskan' => $item->status_perbaikan === 'disetujui',
                    'bisa_diselesaikan_operator' => (bool) $item->perlu_vendor && $item->status_perbaikan === 'dalam_perbaikan',
                    'hasil_pemeriksaan' => $item->hasil_pemeriksaan,
                    'hasil_perbaikan' => $item->hasil_perbaikan,
                ];
            });

        // Daftar teknisi fakultas aktif
        $daftarTeknisi = User::query()
            ->whereHas('semuaPeran', fn ($q) => $q->where('nama_peran', PeranNama::TEKNISI))
            ->where('is_aktif', true)
            ->orderBy('nama_lengkap')
            ->get(['id_pengguna', 'nama_lengkap', 'nip']);

        // Daftar vendor eksternal
        $daftarVendor = Vendor::query()
            ->orderBy('nama_vendor')
            ->get(['id_vendor', 'nama_vendor', 'kontak']);

        return Inertia::render('Perbaikan/Index', [
            'daftarPerbaikan' => $daftarPerbaikan,
            'daftarTeknisi' => $daftarTeknisi,
            'daftarVendor' => $daftarVendor,
            'tabAktif' => $tab,
            'filters' => [
                'q' => $request->q ?? '',
                'tab' => $tab,
            ],
        ]);
    }

    /**
     * Operator menugaskan teknisi internal atau vendor eksternal untuk item perbaikan.
     */
    public function tugaskanTeknisi(Request $request, ItemPerbaikan $itemPerbaikan): RedirectResponse
    {
        if ($itemPerbaikan->status_perbaikan !== 'disetujui') {
            abort(422, 'Item perbaikan belum berstatus disetujui untuk ditugaskan.');
        }

        $jenisPelaksana = $request->input('jenis_pelaksana', 'teknisi');

        $validated = $request->validate([
            'jenis_pelaksana' => ['nullable', 'in:teknisi,vendor'],
            'id_teknisi' => [
                Rule::requiredIf(fn () => $request->input('jenis_pelaksana', 'teknisi') === 'teknisi'),
                'nullable',
                'integer',
                'exists:pengguna,id_pengguna',
                function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                    if ($request->input('jenis_pelaksana', 'teknisi') !== 'teknisi' || empty($value)) {
                        return;
                    }

                    $isTeknisiAktif = User::query()
                        ->where('id_pengguna', $value)
                        ->where('is_aktif', true)
                        ->whereHas('semuaPeran', fn ($q) => $q->where('nama_peran', PeranNama::TEKNISI))
                        ->exists();

                    if (! $isTeknisiAktif) {
                        $fail('Teknisi yang dipilih tidak valid atau tidak berstatus aktif.');
                    }
                },
            ],
            'id_vendor' => [
                Rule::requiredIf(fn () => $request->input('jenis_pelaksana', 'teknisi') === 'vendor'),
                'nullable',
                'integer',
                'exists:vendor,id_vendor',
            ],
            'harga_penawaran' => ['nullable', 'numeric', 'min:0'],
            'estimasi_biaya' => ['nullable', 'numeric', 'min:0'],
            'catatan' => ['nullable', 'string', 'max:500'],
        ], [
            'jenis_pelaksana.in' => 'Jenis pelaksana harus teknisi atau vendor.',
            'id_teknisi.required' => 'Pilih teknisi internal fakultas yang ditugaskan.',
            'id_teknisi.exists' => 'Teknisi yang dipilih tidak ditemukan dalam sistem.',
            'id_vendor.required' => 'Pilih vendor eksternal yang ditugaskan.',
            'id_vendor.exists' => 'Vendor yang dipilih tidak ditemukan dalam sistem.',
        ]);

        DB::transaction(function () use ($itemPerbaikan, $validated, $request, $jenisPelaksana) {
            if ($jenisPelaksana === 'vendor') {
                $itemPerbaikan->update([
                    'id_teknisi' => null,
                    'id_vendor' => $validated['id_vendor'],
                    'perlu_vendor' => true,
                    'harga_penawaran' => $validated['harga_penawaran'] ?? null,
                    'estimasi_biaya' => $validated['estimasi_biaya'] ?? $validated['harga_penawaran'] ?? $itemPerbaikan->estimasi_biaya,
                    'status_perbaikan' => 'dalam_perbaikan',
                    'tanggal_mulai' => now(),
                ]);

                $itemPerbaikan->load('vendor');
                $namaPelaksana = 'Vendor ' . ($itemPerbaikan->vendor?->nama_vendor ?? '');
            } else {
                $itemPerbaikan->update([
                    'id_teknisi' => $validated['id_teknisi'],
                    'id_vendor' => null,
                    'perlu_vendor' => false,
                    'harga_penawaran' => null,
                    'estimasi_biaya' => $validated['estimasi_biaya'] ?? $itemPerbaikan->estimasi_biaya,
                    'status_perbaikan' => 'dalam_perbaikan',
                    'tanggal_mulai' => now(),
                ]);

                $itemPerbaikan->load('teknisi');
                $namaPelaksana = 'Teknisi ' . ($itemPerbaikan->teknisi?->nama_lengkap ?? '');
            }

            $pengajuan = $itemPerbaikan->pengajuan;
            $pengajuan->update(['status' => 'diproses']);

            RiwayatStatusPengajuan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $request->user()->id_pengguna,
                'status_baru' => 'diproses',
                'catatan' => "Perbaikan aset ditugaskan kepada {$namaPelaksana}. " . ($validated['catatan'] ?? ''),
                'waktu' => now(),
            ]);

            // Perbarui status aset menjadi dalam_perbaikan
            $itemPerbaikan->aset()->update(['status_aset' => 'dalam_perbaikan']);

            ActivityLogger::record(
                'tugaskan_perbaikan',
                'item_perbaikan',
                $itemPerbaikan->id_item_perbaikan,
                "Perbaikan aset {$itemPerbaikan->aset?->kode_aset} ditugaskan kepada {$namaPelaksana}",
                $request->user()->id_pengguna
            );
        });

        return redirect()->route('perbaikan.index')->with('status', 'Penugasan perbaikan berhasil disimpan.');
    }

    /**
     * Operator mencatat penyelesaian perbaikan yang ditangani oleh Vendor Eksternal.
     */
    public function selesaikanVendor(Request $request, ItemPerbaikan $itemPerbaikan): RedirectResponse
    {
        if (! $itemPerbaikan->perlu_vendor || $itemPerbaikan->status_perbaikan !== 'dalam_perbaikan') {
            abort(422, 'Item perbaikan vendor ini tidak dalam status dapat diselesaikan oleh operator.');
        }

        $validated = $request->validate([
            'hasil_perbaikan' => ['required', 'string', 'max:1500'],
            'biaya_aktual' => ['nullable', 'numeric', 'min:0'],
            'kondisi_akhir' => ['nullable', 'in:baik,kurang_baik,rusak_berat'],
        ], [
            'hasil_perbaikan.required' => 'Tindakan / hasil perbaikan dari vendor wajib diisi.',
            'kondisi_akhir.in' => 'Kondisi akhir aset tidak valid.',
        ]);

        DB::transaction(function () use ($itemPerbaikan, $validated, $request) {
            $kondisiAkhir = $validated['kondisi_akhir'] ?? 'baik';

            $itemPerbaikan->update([
                'status_perbaikan' => 'selesai',
                'tanggal_selesai' => now(),
                'hasil_perbaikan' => $validated['hasil_perbaikan'],
                'biaya_aktual' => $validated['biaya_aktual'] ?? $itemPerbaikan->biaya_aktual,
            ]);

            $pengajuan = $itemPerbaikan->pengajuan;
            $pengajuan->update(['status' => 'selesai']);

            $itemPerbaikan->aset()->update([
                'kondisi' => $kondisiAkhir,
                'status_aset' => 'aktif',
            ]);

            $itemPerbaikan->load('vendor');
            $namaVendor = $itemPerbaikan->vendor?->nama_vendor ?? 'Vendor Eksternal';

            $labelKondisi = match ($kondisiAkhir) {
                'baik' => 'Baik',
                'kurang_baik' => 'Rusak Ringan',
                'rusak_berat' => 'Rusak Berat (Direkomendasikan untuk diusulkan penghapusan)',
                default => $kondisiAkhir,
            };

            RiwayatStatusPengajuan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_pengguna' => $request->user()->id_pengguna,
                'status_baru' => 'selesai',
                'catatan' => "Perbaikan oleh vendor ({$namaVendor}) selesai dicatat Operator. Kondisi akhir aset: {$labelKondisi}. Tindakan: {$validated['hasil_perbaikan']}",
                'waktu' => now(),
            ]);

            ActivityLogger::record(
                'selesaikan_perbaikan_vendor',
                'item_perbaikan',
                $itemPerbaikan->id_item_perbaikan,
                "Penyelesaian perbaikan vendor {$namaVendor} untuk aset {$itemPerbaikan->aset?->kode_aset} (kondisi akhir: {$labelKondisi})",
                $request->user()->id_pengguna
            );
        });

        return redirect()->route('perbaikan.index', ['tab' => 'selesai'])->with('status', 'Penyelesaian perbaikan oleh vendor berhasil dicatat.');
    }

    /**
     * Hasilkan nomor pengajuan unik dengan format PRB-YYYY-XXXX.
     */
    private function generateNomorPengajuan(): string
    {
        $tahun = now()->format('Y');
        $prefix = "PRB-{$tahun}-";

        $terakhir = Pengajuan::query()
            ->where('nomor_pengajuan', 'like', "{$prefix}%")
            ->lockForUpdate()
            ->orderByDesc('nomor_pengajuan')
            ->value('nomor_pengajuan');

        $nomorUrut = 1;
        if ($terakhir && preg_match('/^PRB-\d{4}-(\d{4})$/', $terakhir, $matches)) {
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
