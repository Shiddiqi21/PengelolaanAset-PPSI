<?php

namespace App\Http\Controllers;

use App\Models\Peran;
use App\Support\MenuPeran;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman baca-saja: daftar peran, jumlah akun, dan menu yang tersedia untuk tiap peran.
 * Aturan akses diubah lewat kode (MenuPeran dan middleware role:), bukan lewat halaman ini.
 */
class HakAksesController extends Controller
{
    public function index(): Response
    {
        $peran = Peran::query()
            ->withCount([
                'semuaPengguna as akun_total',
                'semuaPengguna as akun_aktif' => fn ($query) => $query->where('pengguna.is_aktif', true),
            ])
            ->orderBy('id_peran')
            ->get()
            ->map(fn (Peran $item) => [
                'id_peran' => $item->id_peran,
                'nama_peran' => $item->nama_peran,
                'deskripsi' => $item->deskripsi,
                'akun_total' => $item->akun_total,
                'akun_aktif' => $item->akun_aktif,
                'menu' => MenuPeran::labelUntuk($item->nama_peran),
            ]);

        return Inertia::render('HakAkses/Index', [
            'peran' => $peran,
        ]);
    }
}
