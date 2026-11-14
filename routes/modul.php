<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ModulBelumTersediaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Route modul per peran
|--------------------------------------------------------------------------
| Setiap menu sidebar (lihat app/Support/MenuPeran.php) punya satu route di sini.
| Route yang modulnya belum dibuat memakai ModulBelumTersediaController sebagai
| halaman sementara. Untuk membuat modul sungguhan, GANTI controller pada baris
| route tersebut (nama route dan URL jangan diubah agar menu tetap menyala), contoh:
|
|   Route::get('/master-aset', [AsetController::class, 'index'])->name('aset.index');
|
| Pembatasan peran memakai middleware role:. Akun dengan beberapa peran lolos
| bila memiliki salah satu peran yang diminta.
*/

$sementara = ModulBelumTersediaController::class;

Route::middleware('role:operator')->group(function () use ($sementara) {
    Route::get('/operator', [DashboardController::class, 'operator'])->name('operator.dashboard');
    Route::get('/master-aset', $sementara)->defaults('judul', 'Master aset')->name('aset.index');
    Route::get('/lokasi', $sementara)->defaults('judul', 'Lokasi & penanggung jawab')->name('lokasi.index');
    Route::get('/pemeriksaan', $sementara)->defaults('judul', 'Pemeriksaan pengajuan')->name('pemeriksaan.index');
    Route::get('/penerimaan', $sementara)->defaults('judul', 'Penerimaan aset')->name('penerimaan.index');
    Route::get('/mutasi', $sementara)->defaults('judul', 'Mutasi aset')->name('mutasi.index');
    Route::get('/penghapusan', $sementara)->defaults('judul', 'Penghapusan aset')->name('penghapusan.index');
    Route::get('/perbaikan', $sementara)->defaults('judul', 'Perbaikan aset')->name('perbaikan.index');
    Route::get('/pemeliharaan', $sementara)->defaults('judul', 'Pemeliharaan')->name('pemeliharaan.index');
    Route::get('/cetak-label', $sementara)->defaults('judul', 'Cetak label aset')->name('label.index');
    Route::get('/kartu-kendali', $sementara)->defaults('judul', 'Kartu kendali ruangan')->name('kartu-kendali.index');
    Route::get('/arsip-bast', $sementara)->defaults('judul', 'Arsip BAST')->name('bast.index');
    Route::get('/laporan', $sementara)->defaults('judul', 'Laporan & rekonsiliasi')->name('laporan.index');
});

Route::middleware('role:pimpinan')->prefix('pimpinan')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pimpinan'])->name('pimpinan.dashboard');
    Route::get('/persetujuan', $sementara)->defaults('judul', 'Persetujuan pengajuan')->name('pimpinan.persetujuan');
    Route::get('/laporan', $sementara)->defaults('judul', 'Laporan aset')->name('pimpinan.laporan');
});

Route::middleware('role:kepala-kantor')->prefix('kepala-kantor')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'kepalaKantor'])->name('kepala-kantor.dashboard');
    Route::get('/pengajuan', $sementara)->defaults('judul', 'Daftar pengajuan')->name('kepala-kantor.pengajuan');
    Route::get('/laporan', $sementara)->defaults('judul', 'Laporan aset')->name('kepala-kantor.laporan');
});

Route::middleware('role:pemohon')->prefix('pemohon')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pemohon'])->name('pemohon.dashboard');
    Route::get('/aset-unit', $sementara)->defaults('judul', 'Daftar aset unit')->name('pemohon.aset-unit');
    Route::get('/pengajuan/pengadaan', $sementara)->defaults('judul', 'Pengajuan pengadaan')->name('pemohon.pengadaan');
    Route::get('/pengajuan/perbaikan', $sementara)->defaults('judul', 'Pengajuan perbaikan')->name('pemohon.perbaikan');
    Route::get('/pengajuan/mutasi', $sementara)->defaults('judul', 'Pengajuan mutasi')->name('pemohon.mutasi');
    Route::get('/pengajuan/penghapusan', $sementara)->defaults('judul', 'Pengajuan penghapusan')->name('pemohon.penghapusan');
    Route::get('/pengajuan', $sementara)->defaults('judul', 'Daftar pengajuan')->name('pemohon.pengajuan');
    Route::get('/riwayat-perpindahan', $sementara)->defaults('judul', 'Riwayat perpindahan')->name('pemohon.riwayat-perpindahan');
});

Route::middleware('role:pegawai')->prefix('pegawai')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pegawai'])->name('pegawai.dashboard');
    Route::get('/aset', $sementara)->defaults('judul', 'Aset tanggung jawab pribadi')->name('pegawai.aset');
});

Route::middleware('role:teknisi')->prefix('teknisi')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'teknisi'])->name('teknisi.dashboard');
    Route::get('/tugas', $sementara)->defaults('judul', 'Tugas perbaikan')->name('teknisi.tugas');
    Route::get('/riwayat', $sementara)->defaults('judul', 'Riwayat pekerjaan')->name('teknisi.riwayat');
});
