<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ModulBelumTersediaController;
use App\Http\Controllers\MutasiController;
use App\Http\Controllers\PenerimaanController;
use App\Http\Controllers\PengadaanController;
use App\Http\Controllers\PengajuanController;
use App\Http\Controllers\PenghapusanController;
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
    Route::get('/pemeriksaan', [PengajuanController::class, 'indexOperator'])->name('pemeriksaan.index');
    Route::post('/pemeriksaan/{pengajuan}', [PengajuanController::class, 'prosesPemeriksaanOperator'])->name('pemeriksaan.proses');
    Route::get('/penerimaan', [PenerimaanController::class, 'index'])->name('penerimaan.index');
    Route::post('/penerimaan', [PenerimaanController::class, 'store'])->name('penerimaan.store');
    Route::get('/mutasi', [MutasiController::class, 'indexOperator'])->name('mutasi.index');
    Route::post('/mutasi/{pengajuan}/proses', [MutasiController::class, 'proses'])->name('mutasi.proses');
    Route::get('/penghapusan', [PenghapusanController::class, 'indexOperator'])->name('penghapusan.index');
    Route::post('/penghapusan/{pengajuan}/proses', [PenghapusanController::class, 'proses'])->name('penghapusan.proses');
    Route::get('/perbaikan', $sementara)->defaults('judul', 'Perbaikan aset')->name('perbaikan.index');
    Route::get('/pemeliharaan', $sementara)->defaults('judul', 'Pemeliharaan')->name('pemeliharaan.index');
    Route::get('/cetak-label', $sementara)->defaults('judul', 'Cetak label aset')->name('label.index');
    Route::get('/kartu-kendali', $sementara)->defaults('judul', 'Kartu kendali ruangan')->name('kartu-kendali.index');
    Route::get('/arsip-bast', $sementara)->defaults('judul', 'Arsip BAST')->name('bast.index');
    Route::get('/laporan', $sementara)->defaults('judul', 'Laporan & rekonsiliasi')->name('laporan.index');
});

Route::middleware('role:pimpinan')->prefix('pimpinan')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pimpinan'])->name('pimpinan.dashboard');
    Route::get('/persetujuan', [PengajuanController::class, 'indexPimpinan'])->name('pimpinan.persetujuan');
    Route::get('/persetujuan/{pengajuan}', [PengajuanController::class, 'showPimpinan'])->name('pimpinan.persetujuan.show');
    Route::post('/persetujuan/{pengajuan}', [PengajuanController::class, 'prosesPimpinan'])->name('pimpinan.persetujuan.proses');
    Route::get('/laporan', $sementara)->defaults('judul', 'Laporan aset')->name('pimpinan.laporan');
});

Route::middleware('role:kepala-kantor')->prefix('kepala-kantor')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'kepalaKantor'])->name('kepala-kantor.dashboard');
    Route::get('/pengajuan', [PengajuanController::class, 'indexKepalaKantor'])->name('kepala-kantor.pengajuan');
    Route::get('/pengajuan/{pengajuan}', [PengajuanController::class, 'showKepalaKantor'])->name('kepala-kantor.pengajuan.show');
    Route::post('/pengajuan/{pengajuan}', [PengajuanController::class, 'prosesKepalaKantor'])->name('kepala-kantor.pengajuan.proses');
    Route::get('/laporan', $sementara)->defaults('judul', 'Laporan aset')->name('kepala-kantor.laporan');
});

Route::middleware('role:pemohon')->prefix('pemohon')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pemohon'])->name('pemohon.dashboard');
    Route::get('/aset-unit', $sementara)->defaults('judul', 'Daftar aset unit')->name('pemohon.aset-unit');
    Route::get('/pengajuan/pengadaan', [PengadaanController::class, 'create'])->name('pemohon.pengadaan');
    Route::post('/pengajuan/pengadaan', [PengadaanController::class, 'store'])->name('pemohon.pengadaan.store');
    Route::get('/pengajuan/perbaikan', $sementara)->defaults('judul', 'Pengajuan perbaikan')->name('pemohon.perbaikan');
    Route::get('/pengajuan/mutasi', [MutasiController::class, 'create'])->name('pemohon.mutasi');
    Route::post('/pengajuan/mutasi', [MutasiController::class, 'store'])->name('pemohon.pengajuan.mutasi.store');
    Route::get('/pengajuan/mutasi/{pengajuan}/edit', [MutasiController::class, 'edit'])->name('pemohon.mutasi.edit');
    Route::match(['put', 'patch', 'post'], '/pengajuan/mutasi/{pengajuan}', [MutasiController::class, 'update'])->name('pemohon.mutasi.update');
    Route::get('/pengajuan/penghapusan', [PenghapusanController::class, 'create'])->name('pemohon.penghapusan');
    Route::get('/pengajuan/penghapusan/baru', [PenghapusanController::class, 'create'])->name('pemohon.pengajuan.penghapusan.create');
    Route::post('/pengajuan/penghapusan', [PenghapusanController::class, 'store'])->name('pemohon.pengajuan.penghapusan.store');
    Route::get('/pengajuan/penghapusan/{pengajuan}/edit', [PenghapusanController::class, 'edit'])->name('pemohon.penghapusan.edit');
    Route::match(['put', 'patch', 'post'], '/pengajuan/penghapusan/{pengajuan}', [PenghapusanController::class, 'update'])->name('pemohon.penghapusan.update');
    Route::get('/pengajuan', [PengajuanController::class, 'indexPemohon'])->name('pemohon.pengajuan');
    Route::get('/pengajuan/{pengajuan}', [PengajuanController::class, 'showPemohon'])->name('pemohon.pengajuan.show');
    Route::get('/pengajuan/{pengajuan}/edit', [PengadaanController::class, 'edit'])->name('pemohon.pengajuan.edit');
    Route::match(['put', 'patch', 'post'], '/pengajuan/{pengajuan}', [PengadaanController::class, 'update'])->name('pemohon.pengajuan.update');
    Route::post('/pengajuan/{pengajuan}/kirim', [PengajuanController::class, 'kirimDraft'])->name('pemohon.pengajuan.kirim');
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

Route::middleware('auth')->group(function () {
    Route::get('/dokumen/{dokumen}/unduh', [PengajuanController::class, 'unduhDokumen'])->name('dokumen.unduh');
});
