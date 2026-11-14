<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman sementara untuk menu yang modulnya belum dibuat. Route-nya didaftarkan di routes/modul.php
 * dengan ->defaults('judul', '...'). Anggota tim cukup mengganti controller pada route tersebut.
 */
class ModulBelumTersediaController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('Modul/Menunggu', [
            'judul' => (string) $request->route('judul', 'Halaman'),
        ]);
    }
}
