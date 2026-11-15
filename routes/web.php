<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HakAksesController;
use App\Http\Controllers\LogAktivitasController;
use App\Http\Controllers\ModulBelumTersediaController;
use App\Http\Controllers\PenggunaController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::middleware(['auth', 'aktif'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::middleware('role:operator')->group(function () {
        Route::get('/pengguna', [PenggunaController::class, 'index'])->name('pengguna.index');
        Route::get('/pengguna/create', [PenggunaController::class, 'create'])->name('pengguna.create');
        Route::post('/pengguna', [PenggunaController::class, 'store'])->name('pengguna.store');
        Route::get('/pengguna/{user}/edit', [PenggunaController::class, 'edit'])->name('pengguna.edit');
        Route::put('/pengguna/{user}', [PenggunaController::class, 'update'])->name('pengguna.update');
        Route::patch('/pengguna/{user}/status', [PenggunaController::class, 'status'])->name('pengguna.status');
        Route::post('/pengguna/{user}/reset-password', [PenggunaController::class, 'resetPassword'])->name('pengguna.reset-password');
        Route::get('/unit', [UnitController::class, 'index'])->name('unit.index');
        Route::post('/unit', [UnitController::class, 'storeUnit'])->name('unit.store');
        Route::put('/unit/{unit}', [UnitController::class, 'updateUnit'])->name('unit.update');
        Route::delete('/unit/{unit}', [UnitController::class, 'destroyUnit'])->name('unit.destroy');
        Route::post('/sub-unit', [UnitController::class, 'storeSubUnit'])->name('sub-unit.store');
        Route::put('/sub-unit/{subUnit}', [UnitController::class, 'updateSubUnit'])->name('sub-unit.update');
        Route::delete('/sub-unit/{subUnit}', [UnitController::class, 'destroySubUnit'])->name('sub-unit.destroy');
        Route::get('/hak-akses', [HakAksesController::class, 'index'])->name('hak-akses.index');
        Route::get('/log-aktivitas', [LogAktivitasController::class, 'index'])->name('log-aktivitas.index');
    });

    Route::get('/panduan', ModulBelumTersediaController::class)
        ->defaults('judul', 'Panduan penggunaan')
        ->name('panduan');

    // Galeri komponen UI untuk tim pengembang. Hanya tersedia di environment local.
    if (app()->environment('local')) {
        Route::inertia('/komponen', 'Komponen/Galeri')->name('komponen');
    }

    // Route modul per peran (dashboard dan menu sidebar): lihat routes/modul.php
    require __DIR__.'/modul.php';
});

require __DIR__.'/auth.php';
