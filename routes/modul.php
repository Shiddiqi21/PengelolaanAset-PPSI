<?php

use App\Http\Controllers\AsetController;
use App\Http\Controllers\BastController;
use App\Http\Controllers\CetakLabelController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\KartuKendaliController;
use App\Http\Controllers\LaporanController;
use App\Http\Controllers\LokasiController;
use App\Http\Controllers\ModulBelumTersediaController;
use App\Http\Controllers\MutasiController;
use App\Http\Controllers\PemeliharaanController;
use App\Http\Controllers\PenerimaanController;
use App\Http\Controllers\PengadaanController;
use App\Http\Controllers\PengajuanController;
use App\Http\Controllers\PenghapusanController;
use App\Http\Controllers\PerbaikanController;
use App\Http\Controllers\TeknisiTugasController;
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

    // Master Aset
    Route::get('/master-aset', [AsetController::class, 'index'])->name('aset.index');
    Route::get('/master-aset/ekspor', [AsetController::class, 'export'])->name('aset.export');
    Route::post('/master-aset/impor', [AsetController::class, 'import'])->name('aset.import');
    Route::get('/master-aset/create', [AsetController::class, 'create'])->name('aset.create');
    Route::post('/master-aset', [AsetController::class, 'store'])->name('aset.store');
    Route::get('/master-aset/{aset}', [AsetController::class, 'show'])->whereNumber('aset')->name('aset.show');
    Route::get('/master-aset/{aset}/edit', [AsetController::class, 'edit'])->whereNumber('aset')->name('aset.edit');
    Route::put('/master-aset/{aset}', [AsetController::class, 'update'])->whereNumber('aset')->name('aset.update');
    Route::delete('/master-aset/{aset}', [AsetController::class, 'destroy'])->whereNumber('aset')->name('aset.destroy');

    // Lokasi dan Penanggung Jawab
    Route::get('/lokasi', [LokasiController::class, 'index'])->name('lokasi.index');
    Route::get('/lokasi/ekspor', [LokasiController::class, 'export'])->name('lokasi.export');
    Route::post('/lokasi/penetapan-pj', [LokasiController::class, 'tetapkanPj'])->name('lokasi.penetapan-pj');
    Route::post('/lokasi', [LokasiController::class, 'store'])->name('lokasi.store');
    Route::put('/lokasi/{ruangan}', [LokasiController::class, 'update'])->whereNumber('ruangan')->name('lokasi.update');
    Route::delete('/lokasi/{ruangan}', [LokasiController::class, 'destroy'])->whereNumber('ruangan')->name('lokasi.destroy');

    // Pemeriksaan Pengajuan
    Route::get('/pemeriksaan', [PengajuanController::class, 'indexOperator'])->name('pemeriksaan.index');
    Route::post('/pemeriksaan/{pengajuan}', [PengajuanController::class, 'prosesPemeriksaanOperator'])->name('pemeriksaan.proses');

    Route::get('/penerimaan', [PenerimaanController::class, 'index'])->name('penerimaan.index');
    Route::post('/penerimaan', [PenerimaanController::class, 'store'])->name('penerimaan.store');
    Route::get('/mutasi', [MutasiController::class, 'indexOperator'])->name('mutasi.index');
    Route::post('/mutasi/{pengajuan}/proses', [MutasiController::class, 'proses'])->name('mutasi.proses');
    Route::get('/penghapusan', [PenghapusanController::class, 'indexOperator'])->name('penghapusan.index');
    Route::post('/penghapusan/{pengajuan}/proses', [PenghapusanController::class, 'proses'])->name('penghapusan.proses');

    // Perbaikan
    Route::get('/perbaikan', [PerbaikanController::class, 'indexOperator'])->name('perbaikan.index');
    Route::post('/perbaikan/{itemPerbaikan}/tugaskan', [PerbaikanController::class, 'tugaskanTeknisi'])->name('perbaikan.tugaskan');

    // Pemeliharaan
    Route::get('/pemeliharaan', [PemeliharaanController::class, 'index'])->name('pemeliharaan.index');
    Route::post('/pemeliharaan', [PemeliharaanController::class, 'store'])->name('pemeliharaan.store');
    Route::put('/pemeliharaan/{pemeliharaan}', [PemeliharaanController::class, 'update'])->name('pemeliharaan.update');

    Route::get('/cetak-label', [CetakLabelController::class, 'index'])->name('label.index');
    Route::get('/kartu-kendali', [KartuKendaliController::class, 'index'])->name('kartu-kendali.index');

    // Arsip BAST
    Route::get('/arsip-bast', [BastController::class, 'index'])->name('bast.index');
    Route::post('/arsip-bast', [BastController::class, 'store'])->name('bast.store');
    Route::get('/arsip-bast/{beritaAcara}/pdf', [BastController::class, 'cetakPdf'])->name('bast.pdf');
    Route::post('/arsip-bast/{beritaAcara}/arsipkan', [BastController::class, 'arsipkan'])->name('bast.arsipkan');

    Route::get('/laporan', [LaporanController::class, 'index'])->name('laporan.index');
});

Route::middleware('role:pimpinan')->prefix('pimpinan')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pimpinan'])->name('pimpinan.dashboard');
    Route::get('/persetujuan', [PengajuanController::class, 'indexPimpinan'])->name('pimpinan.persetujuan');
    Route::get('/persetujuan/{pengajuan}', [PengajuanController::class, 'showPimpinan'])->name('pimpinan.persetujuan.show');
    Route::post('/persetujuan/{pengajuan}', [PengajuanController::class, 'prosesPimpinan'])->name('pimpinan.persetujuan.proses');
    Route::get('/laporan', [LaporanController::class, 'pimpinan'])->name('pimpinan.laporan');
    Route::get('/laporan/pratinjau', [LaporanController::class, 'pratinjau'])->name('pimpinan.laporan.pratinjau');
});

Route::middleware('role:kepala-kantor')->prefix('kepala-kantor')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'kepalaKantor'])->name('kepala-kantor.dashboard');
    Route::get('/pengajuan', [PengajuanController::class, 'indexKepalaKantor'])->name('kepala-kantor.pengajuan');
    Route::get('/pengajuan/{pengajuan}', [PengajuanController::class, 'showKepalaKantor'])->name('kepala-kantor.pengajuan.show');
    Route::post('/pengajuan/{pengajuan}', [PengajuanController::class, 'prosesKepalaKantor'])->name('kepala-kantor.pengajuan.proses');
    Route::get('/laporan', [LaporanController::class, 'kepalaKantor'])->name('kepala-kantor.laporan');
});

Route::middleware('role:pemohon')->prefix('pemohon')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pemohon'])->name('pemohon.dashboard');

    // Daftar Aset Unit
    Route::get('/aset-unit', [AsetController::class, 'asetUnit'])->name('pemohon.aset-unit');
    Route::get('/aset-unit/{aset}', [AsetController::class, 'showAsetUnit'])->whereNumber('aset')->name('pemohon.aset-unit.show');

    // Pengajuan Pengadaan
    Route::get('/pengajuan/pengadaan', [PengadaanController::class, 'create'])->name('pemohon.pengadaan');
    Route::post('/pengajuan/pengadaan', [PengadaanController::class, 'store'])->name('pemohon.pengadaan.store');

    // Pengajuan Perbaikan
    Route::get('/pengajuan/perbaikan', [PerbaikanController::class, 'pengajuanPemohon'])->name('pemohon.perbaikan');
    Route::post('/pengajuan/perbaikan', [PerbaikanController::class, 'store'])->name('pemohon.perbaikan.store');

    // Pengajuan Mutasi
    Route::get('/pengajuan/mutasi', [MutasiController::class, 'create'])->name('pemohon.mutasi');
    Route::post('/pengajuan/mutasi', [MutasiController::class, 'store'])->name('pemohon.pengajuan.mutasi.store');
    Route::get('/pengajuan/mutasi/{pengajuan}/edit', [MutasiController::class, 'edit'])->name('pemohon.mutasi.edit');
    Route::match(['put', 'patch', 'post'], '/pengajuan/mutasi/{pengajuan}', [MutasiController::class, 'update'])->name('pemohon.mutasi.update');

    // Pengajuan Penghapusan
    Route::get('/pengajuan/penghapusan', [PenghapusanController::class, 'create'])->name('pemohon.penghapusan');
    Route::get('/pengajuan/penghapusan/baru', [PenghapusanController::class, 'create'])->name('pemohon.pengajuan.penghapusan.create');
    Route::post('/pengajuan/penghapusan', [PenghapusanController::class, 'store'])->name('pemohon.pengajuan.penghapusan.store');
    Route::get('/pengajuan/penghapusan/{pengajuan}/edit', [PenghapusanController::class, 'edit'])->name('pemohon.penghapusan.edit');
    Route::match(['put', 'patch', 'post'], '/pengajuan/penghapusan/{pengajuan}', [PenghapusanController::class, 'update'])->name('pemohon.penghapusan.update');

    // Riwayat Pengajuan
    Route::get('/pengajuan', [PengajuanController::class, 'indexPemohon'])->name('pemohon.pengajuan');
    Route::get('/pengajuan/{pengajuan}', [PengajuanController::class, 'showPemohon'])->name('pemohon.pengajuan.show');
    Route::get('/pengajuan/{pengajuan}/edit', [PengadaanController::class, 'edit'])->name('pemohon.pengajuan.edit');
    Route::match(['put', 'patch', 'post'], '/pengajuan/{pengajuan}', [PengadaanController::class, 'update'])->name('pemohon.pengajuan.update');
    Route::post('/pengajuan/{pengajuan}/kirim', [PengajuanController::class, 'kirimDraft'])->name('pemohon.pengajuan.kirim');

    Route::get('/riwayat-perpindahan', $sementara)->defaults('judul', 'Riwayat perpindahan')->name('pemohon.riwayat-perpindahan');
});

Route::middleware('role:pegawai')->prefix('pegawai')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'pegawai'])->name('pegawai.dashboard');
    Route::get('/aset', [AsetController::class, 'asetPribadi'])->name('pegawai.aset');
    Route::get('/aset/{aset}', [AsetController::class, 'showAsetPribadi'])->whereNumber('aset')->name('pegawai.aset.show');
});

Route::middleware('role:teknisi')->prefix('teknisi')->group(function () use ($sementara) {
    Route::get('/', [DashboardController::class, 'teknisi'])->name('teknisi.dashboard');
    Route::get('/tugas', [TeknisiTugasController::class, 'index'])->name('teknisi.tugas');
    Route::post('/tugas/{itemPerbaikan}', [TeknisiTugasController::class, 'update'])->name('teknisi.tugas.update');
    Route::put('/pemeliharaan/{pemeliharaan}', [TeknisiTugasController::class, 'updatePemeliharaan'])->name('teknisi.pemeliharaan.update');
    Route::get('/riwayat', [TeknisiTugasController::class, 'riwayat'])->name('teknisi.riwayat');
});

Route::middleware('auth')->group(function () {
    Route::get('/dokumen/{dokumen}/unduh', [PengajuanController::class, 'unduhDokumen'])->name('dokumen.unduh');
});
