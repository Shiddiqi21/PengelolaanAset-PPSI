<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\ItemPerbaikan;
use App\Models\PemeliharaanAset;
use App\Models\PenempatanAset;
use App\Models\Pengajuan;
use App\Models\Ruangan;
use App\Models\User;
use App\Support\DataContohDashboard;
use App\Support\MenuPeran;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * /dashboard mengarahkan ke dashboard peran utama. Tiap peran punya dashboard sendiri.
 *
 * Mengambil data aktual dari database bila tersedia, dengan fallback ke DataContohDashboard
 * agar tampilan tetap utuh saat database pengembangan kosong.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $beranda = MenuPeran::beranda($request->user());

        return $beranda ? redirect($beranda) : redirect()->route('profile.edit');
    }

    public function operator(Request $request): Response
    {
        $contoh = DataContohDashboard::operator();
        $totalAset = Aset::query()->count();

        if ($totalAset > 0) {
            $perluVerifikasi = Pengajuan::query()->whereIn('status', ['diajukan', 'disetujui_pimpinan'])->count();
            $perbaikanAktif = ItemPerbaikan::query()->whereIn('status_perbaikan', ['menunggu', 'dalam_perbaikan'])->count();
            $jadwalPemeliharaan = PemeliharaanAset::query()->where('status', 'terjadwal')->count();

            $contoh['kpi'] = [
                [
                    'label' => 'Master aset',
                    'nilai' => number_format($totalAset, 0, ',', '.'),
                    'keterangan' => 'Aset tercatat pada master inventaris',
                    'nada' => 'sukses',
                ],
                [
                    'label' => 'Perlu verifikasi',
                    'nilai' => (string) $perluVerifikasi,
                    'keterangan' => 'Pengajuan aktif menunggu tindak lanjut',
                    'nada' => 'peringatan',
                ],
                [
                    'label' => 'Perbaikan aktif',
                    'nilai' => (string) $perbaikanAktif,
                    'keterangan' => 'Sedang ditangani teknisi / vendor',
                    'nada' => 'sukses',
                ],
                [
                    'label' => 'Jadwal pemeliharaan',
                    'nilai' => (string) $jadwalPemeliharaan,
                    'keterangan' => 'Terjadwal untuk pelaksanaan',
                    'nada' => 'sukses',
                ],
            ];
            $contoh['kondisi'] = $this->hitungKondisiAktual($totalAset);
        }

        return Inertia::render('Dashboard/Operator', [
            'judul' => 'Dashboard operator aset',
            'deskripsi' => $this->sapaan($request->user()).' Berikut pekerjaan inventaris yang perlu ditindaklanjuti.',
            ...$contoh,
        ]);
    }

    public function pimpinan(): Response
    {
        $contoh = DataContohDashboard::pimpinan();
        $totalAset = Aset::query()->count();

        if ($totalAset > 0) {
            $jumlahRuangan = max(1, Ruangan::query()->count());
            $totalPerolehan = (float) Aset::query()->sum('harga_perolehan');
            $nilaiFormatted = $totalPerolehan >= 1_000_000_000
                ? 'Rp'.number_format($totalPerolehan / 1_000_000_000, 2, ',', '.').' M'
                : 'Rp'.number_format($totalPerolehan / 1_000_000, 2, ',', '.').' Jt';

            $menungguPimpinan = Pengajuan::query()->where('status', 'disetujui_kadep')->count();
            $baikCount = Aset::query()->where('kondisi', 'baik')->count();
            $persenBaik = round(($baikCount / $totalAset) * 100);

            $contoh['kpi'] = [
                [
                    'label' => 'Total aset tercatat',
                    'nilai' => number_format($totalAset, 0, ',', '.'),
                    'keterangan' => "Tersebar di {$jumlahRuangan} ruangan",
                    'nada' => 'sukses',
                ],
                [
                    'label' => 'Nilai perolehan',
                    'nilai' => $nilaiFormatted,
                    'keterangan' => 'Per '.now()->locale('id')->translatedFormat('j F Y'),
                    'nada' => 'sukses',
                ],
                [
                    'label' => 'Perlu persetujuan',
                    'nilai' => (string) $menungguPimpinan,
                    'keterangan' => 'Menunggu keputusan pimpinan',
                    'nada' => 'peringatan',
                ],
                [
                    'label' => 'Kondisi baik',
                    'nilai' => "{$persenBaik}%",
                    'keterangan' => "{$baikCount} aset siap digunakan",
                    'nada' => 'sukses',
                ],
            ];
            $contoh['kondisi'] = $this->hitungKondisiAktual($totalAset);
        }

        $pengajuanMenunggu = Pengajuan::query()
            ->with('pemohon:id_pengguna,nama_lengkap')
            ->where('status', 'disetujui_kadep')
            ->latest('tanggal_pengajuan')
            ->take(5)
            ->get();

        if ($pengajuanMenunggu->isNotEmpty()) {
            $contoh['persetujuan'] = $pengajuanMenunggu->map(fn (Pengajuan $p) => [
                'nomor' => $p->nomor_pengajuan,
                'jenis' => ucfirst($p->jenis_pengajuan).' • '.($p->keterangan ?: 'Pengajuan unit'),
                'pemohon' => $p->pemohon?->nama_lengkap ?? '-',
                'tanggal' => $p->tanggal_pengajuan?->locale('id')->translatedFormat('j M Y') ?? '-',
                'status' => 'Menunggu persetujuan',
                'nada' => 'peringatan',
                'aksi' => 'Lihat',
                'href' => route('pimpinan.persetujuan.show', $p->id_pengajuan, false),
            ])->all();
        }

        return Inertia::render('Dashboard/Pimpinan', [
            'judul' => 'Dashboard pimpinan',
            'deskripsi' => 'Ringkasan aset fakultas dan keputusan yang memerlukan perhatian Anda.',
            ...$contoh,
        ]);
    }

    public function kepalaKantor(): Response
    {
        $contoh = DataContohDashboard::kepalaKantor();

        $pengajuanMasuk = Pengajuan::query()
            ->with('pemohon:id_pengguna,nama_lengkap')
            ->whereIn('status', ['diajukan', 'disetujui_kadep'])
            ->latest('tanggal_pengajuan')
            ->take(5)
            ->get();

        if ($pengajuanMasuk->isNotEmpty()) {
            $contoh['pemeriksaan'] = [
                'total' => $pengajuanMasuk->count(),
                'baris' => $pengajuanMasuk->map(fn (Pengajuan $p) => [
                    'nomor' => $p->nomor_pengajuan,
                    'jenis' => ucfirst($p->jenis_pengajuan).' • '.($p->keterangan ?: 'Pengajuan unit'),
                    'pemohon' => $p->pemohon?->nama_lengkap ?? '-',
                    'tanggal' => $p->tanggal_pengajuan?->locale('id')->translatedFormat('j M Y') ?? '-',
                    'status' => $p->status === 'diajukan' ? 'Menunggu pemeriksaan' : 'Direkomendasikan',
                    'nada' => $p->status === 'diajukan' ? 'peringatan' : 'sukses',
                    'aksi' => 'Periksa',
                    'href' => route('kepala-kantor.pengajuan.show', $p->id_pengajuan, false),
                ])->all(),
            ];
        }

        return Inertia::render('Dashboard/KepalaKantor', [
            'judul' => 'Dashboard kepala kantor',
            'deskripsi' => 'Kendalikan pemeriksaan kebutuhan dan kelengkapan pengajuan fakultas.',
            ...$contoh,
        ]);
    }

    public function pemohon(Request $request): Response
    {
        $user = $request->user();
        $data = DataContohDashboard::pemohon();

        $pengajuanSaya = Pengajuan::query()
            ->where('id_pemohon', $user->id_pengguna)
            ->latest('tanggal_pengajuan')
            ->take(5)
            ->get();

        if ($pengajuanSaya->isNotEmpty()) {
            $totalSaya = Pengajuan::query()->where('id_pemohon', $user->id_pengguna)->count();
            $diprosesSaya = Pengajuan::query()
                ->where('id_pemohon', $user->id_pengguna)
                ->whereIn('status', ['diajukan', 'disetujui_kadep', 'disetujui_pimpinan', 'diproses'])
                ->count();
            $selesaiSaya = Pengajuan::query()
                ->where('id_pemohon', $user->id_pengguna)
                ->where('status', 'selesai')
                ->count();

            $asetUnitCount = PenempatanAset::query()
                ->whereNull('tanggal_selesai')
                ->whereHas('ruangan', fn ($q) => $q->where('id_unit', $user->id_unit))
                ->count();

            $data['kpi'] = [
                ['label' => 'Aset unit', 'nilai' => (string) $asetUnitCount, 'keterangan' => $user->unit?->nama_unit ?? 'Unit Kerja FTI', 'nada' => 'sukses'],
                ['label' => 'Pengajuan saya', 'nilai' => (string) $totalSaya, 'keterangan' => 'Total pengajuan tercatat', 'nada' => 'sukses'],
                ['label' => 'Sedang diproses', 'nilai' => (string) $diprosesSaya, 'keterangan' => 'Menunggu pemeriksaan / persetujuan', 'nada' => 'peringatan'],
                ['label' => 'Pengajuan selesai', 'nilai' => (string) $selesaiSaya, 'keterangan' => 'Telah ditindaklanjuti', 'nada' => 'sukses'],
            ];

            $data['pengajuan'] = [
                'total' => $totalSaya,
                'baris' => $pengajuanSaya->map(fn (Pengajuan $p) => [
                    'nomor' => $p->nomor_pengajuan,
                    'jenis' => ucfirst($p->jenis_pengajuan).' • '.($p->keterangan ?: 'Pengajuan unit'),
                    'tanggal' => $p->tanggal_pengajuan?->locale('id')->translatedFormat('j M Y') ?? '-',
                    'status' => ucfirst(str_replace('_', ' ', $p->status)),
                    'nada' => match ($p->status) {
                        'selesai', 'disetujui_pimpinan' => 'sukses',
                        'ditolak' => 'bahaya',
                        default => 'peringatan',
                    },
                    'aksi' => 'Lihat',
                    'href' => route('pemohon.pengajuan.show', $p->id_pengajuan, false),
                ])->all(),
            ];
        }

        // Akun dengan beberapa peran diberi penjelasan kenapa menunya terbagi per kelompok.
        $data['banner'] = $user->hasRole('pegawai')
            ? ['nada' => 'info', 'teks' => 'Anda memiliki hak akses Pegawai/Dosen dan Pemohon. Menu aset pribadi tersedia di kelompok Pegawai/Dosen; pengajuan tersedia melalui peran Pemohon.']
            : null;

        return Inertia::render('Dashboard/Pemohon', [
            'judul' => 'Dashboard pemohon',
            'deskripsi' => $this->sapaan($user).' Pantau kebutuhan aset dan pengajuan unit Anda.',
            ...$data,
        ]);
    }

    public function pegawai(Request $request): Response
    {
        $user = $request->user();
        $data = DataContohDashboard::pegawai();

        $penempatanPribadi = PenempatanAset::query()
            ->with(['aset', 'ruangan'])
            ->where('id_pengguna_pj', $user->id_pengguna)
            ->whereNull('tanggal_selesai')
            ->get();

        if ($penempatanPribadi->isNotEmpty()) {
            $totalPribadi = $penempatanPribadi->count();
            $baikPribadi = $penempatanPribadi->filter(fn ($p) => ($p->aset?->kondisi ?? 'baik') === 'baik')->count();
            $nilaiTotal = (float) $penempatanPribadi->sum(fn ($p) => (float) ($p->aset?->harga_perolehan ?? 0));
            $nilaiFormatted = 'Rp'.number_format($nilaiTotal / 1_000_000, 2, ',', '.').' jt';

            $data['kpi'] = [
                ['label' => 'Aset tanggung jawab', 'nilai' => (string) $totalPribadi, 'keterangan' => 'Sesuai penetapan inventaris', 'nada' => 'sukses'],
                ['label' => 'Kondisi baik', 'nilai' => (string) $baikPribadi, 'keterangan' => 'Siap digunakan', 'nada' => 'sukses'],
                ['label' => 'Nilai perolehan', 'nilai' => $nilaiFormatted, 'keterangan' => 'Total aset tanggung jawab', 'nada' => 'sukses'],
                ['label' => 'Konfirmasi terakhir', 'nilai' => now()->locale('id')->translatedFormat('j M'), 'keterangan' => 'Pemeriksaan fisik tahun '.now()->year, 'nada' => 'sukses'],
            ];

            $data['aset'] = [
                'total' => $totalPribadi,
                'baris' => $penempatanPribadi->map(fn (PenempatanAset $p) => [
                    'kode' => $p->aset?->kode_aset ?? '-',
                    'nama' => $p->aset?->nama_barang ?? '-',
                    'lokasi' => $p->ruangan?->nama_ruangan ?? 'Ruang Dosen SI',
                    'kondisi' => match ($p->aset?->kondisi) {
                        'baik' => 'Baik',
                        'kurang_baik' => 'Rusak ringan',
                        'rusak_berat' => 'Rusak berat',
                        default => 'Baik',
                    },
                    'nada' => ($p->aset?->kondisi ?? 'baik') === 'baik' ? 'sukses' : 'peringatan',
                    'aksi' => 'Lihat',
                    'href' => $p->aset ? route('pegawai.aset.show', $p->aset->id_aset, false) : route('pegawai.aset', absolute: false),
                ])->all(),
            ];
        }

        $data['banner'] = [
            'nada' => 'info',
            'teks' => 'Hak akses akun: Pegawai/Dosen. Informasi di halaman ini terbatas pada aset yang ditetapkan atas nama '.$user->nama_lengkap.'.',
        ];

        return Inertia::render('Dashboard/Pegawai', [
            'judul' => 'Dashboard pegawai / dosen',
            'deskripsi' => $this->sapaan($user, 'Selamat datang').' Berikut aset yang menjadi tanggung jawab pribadi Anda.',
            ...$data,
        ]);
    }

    public function teknisi(Request $request): Response
    {
        $user = $request->user();
        $data = DataContohDashboard::teknisi();

        $tugasTeknisi = ItemPerbaikan::query()
            ->with(['aset.penempatanAktif.ruangan', 'pengajuan'])
            ->where('id_teknisi', $user->id_pengguna)
            ->get();

        if ($tugasTeknisi->isNotEmpty()) {
            $aktifCount = $tugasTeknisi->whereIn('status_perbaikan', ['menunggu', 'dalam_perbaikan'])->count();
            $selesaiCount = $tugasTeknisi->where('status_perbaikan', 'selesai')->count();

            $data['kpi'][0]['nilai'] = (string) $aktifCount;
            $data['kpi'][2]['nilai'] = (string) $selesaiCount;
        }

        return Inertia::render('Dashboard/Teknisi', [
            'judul' => 'Dashboard teknisi',
            'deskripsi' => $this->sapaan($user).' Pantau pekerjaan perbaikan yang ditugaskan kepada Anda.',
            ...$data,
        ]);
    }

    /**
     * Hitung komposisi kondisi aset aktual dari tabel aset.
     *
     * @return list<array{label: string, nilai: string, persen: float, nada: string}>
     */
    private function hitungKondisiAktual(int $totalAset): array
    {
        $baik = Aset::query()->where('kondisi', 'baik')->count();
        $ringan = Aset::query()->where('kondisi', 'kurang_baik')->count();
        $berat = Aset::query()->where('kondisi', 'rusak_berat')->count();

        $pBaik = round(($baik / max(1, $totalAset)) * 100, 1);
        $pRingan = round(($ringan / max(1, $totalAset)) * 100, 1);
        $pBerat = round(($berat / max(1, $totalAset)) * 100, 1);

        return [
            ['label' => 'Baik', 'nilai' => "{$baik} aset • ".str_replace('.', ',', (string) $pBaik).'%', 'persen' => $pBaik, 'nada' => 'sukses'],
            ['label' => 'Rusak ringan', 'nilai' => "{$ringan} aset • ".str_replace('.', ',', (string) $pRingan).'%', 'persen' => $pRingan, 'nada' => 'peringatan'],
            ['label' => 'Rusak berat', 'nilai' => "{$berat} aset • ".str_replace('.', ',', (string) $pBerat).'%', 'persen' => $pBerat, 'nada' => 'bahaya'],
        ];
    }

    /**
     * Contoh: "Selamat pagi, Nadia."
     */
    private function sapaan(User $user, ?string $salam = null): string
    {
        $jam = (int) now()->format('G');
        $salam ??= 'Selamat '.match (true) {
            $jam < 11 => 'pagi',
            $jam < 15 => 'siang',
            $jam < 18 => 'sore',
            default => 'malam',
        };

        $nama = collect(preg_split('/\s+/', trim($user->nama_lengkap)) ?: [])
            ->map(fn (string $kata) => rtrim($kata, ','))
            ->first(fn (string $kata) => $kata !== '' && ! str_ends_with($kata, '.'))
            ?? $user->nama_lengkap;

        return "{$salam}, {$nama}.";
    }
}
