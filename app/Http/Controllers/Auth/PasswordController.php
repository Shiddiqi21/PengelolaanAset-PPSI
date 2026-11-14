<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->update([
            'password_hash' => $validated['password'],
        ]);

        // Perubahan kolom sandi tidak ikut tercatat oleh observer, jadi dicatat di sini.
        ActivityLogger::record('ubah_password', 'pengguna', $request->user()->id_pengguna, 'Kata sandi diubah oleh pemilik akun');

        return back()->with('status', 'Kata sandi berhasil diubah.');
    }
}
