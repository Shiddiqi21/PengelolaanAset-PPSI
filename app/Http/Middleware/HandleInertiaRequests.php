<?php

namespace App\Http\Middleware;

use App\Support\MenuPeran;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Props yang tersedia di semua halaman (usePage().props).
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'app' => [
                'nama' => config('app.name'),
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
            ],
            'auth' => [
                'user' => $user ? [
                    'id_pengguna' => $user->id_pengguna,
                    'name' => $user->nama_lengkap,
                    'nama_lengkap' => $user->nama_lengkap,
                    'email' => $user->email,
                    'username' => $user->username,
                    'peran' => $user->peran?->nama_peran,
                    'semua_peran' => $user->namaSemuaPeran(),
                    'peran_label' => collect($user->namaSemuaPeran())->sort()->implode(' + '),
                ] : null,
            ],
            'tanggal' => now()->locale('id')->translatedFormat('j F Y'),
            'peranAktif' => fn () => $user ? MenuPeran::peranAktif($user, $request) : null,
            'menu' => fn () => $user ? MenuPeran::untuk($user, $request) : [],
        ];
    }
}
