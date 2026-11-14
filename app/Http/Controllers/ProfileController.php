<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user()->loadMissing(['peran:id_peran,nama_peran', 'unit:id_unit,nama_unit', 'subUnit:id_sub_unit,nama_sub_unit']);

        return Inertia::render('Profile/Edit', [
            'akun' => [
                'username' => $user->username,
                'nip' => $user->nip,
                'peran' => implode(', ', $user->namaSemuaPeran()),
                'unit' => $user->unit?->nama_unit,
                'sub_unit' => $user->subUnit?->nama_sub_unit,
            ],
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());
        $request->user()->save();

        return Redirect::route('profile.edit')->with('status', 'Profil berhasil diperbarui.');
    }

    // Penghapusan akun oleh pemilik sengaja tidak disediakan. Akun yang sudah punya
    // riwayat pengajuan hanya boleh dinonaktifkan oleh operator.
}
