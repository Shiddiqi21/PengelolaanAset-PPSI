<?php

namespace App\Http\Controllers;

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
 * Isi dashboard masih DATA CONTOH (app/Support/DataContohDashboard.php) sampai modul datanya jadi.
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
        return Inertia::render('Dashboard/Operator', [
            'judul' => 'Dashboard operator aset',
            'deskripsi' => $this->sapaan($request->user()).' Berikut pekerjaan inventaris yang perlu ditindaklanjuti.',
            ...DataContohDashboard::operator(),
        ]);
    }

    public function pimpinan(): Response
    {
        return Inertia::render('Dashboard/Pimpinan', [
            'judul' => 'Dashboard pimpinan',
            'deskripsi' => 'Ringkasan aset fakultas dan keputusan yang memerlukan perhatian Anda.',
            ...DataContohDashboard::pimpinan(),
        ]);
    }

    public function kepalaKantor(): Response
    {
        return Inertia::render('Dashboard/KepalaKantor', [
            'judul' => 'Dashboard kepala kantor',
            'deskripsi' => 'Kendalikan pemeriksaan kebutuhan dan kelengkapan pengajuan fakultas.',
            ...DataContohDashboard::kepalaKantor(),
        ]);
    }

    public function pemohon(Request $request): Response
    {
        $user = $request->user();
        $data = DataContohDashboard::pemohon();

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
        return Inertia::render('Dashboard/Teknisi', [
            'judul' => 'Dashboard teknisi',
            'deskripsi' => $this->sapaan($request->user()).' Pantau pekerjaan perbaikan yang ditugaskan kepada Anda.',
            ...DataContohDashboard::teknisi(),
        ]);
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
