<?php

namespace App\Providers;

use App\Models\Aset;
use App\Models\BeritaAcara;
use App\Models\Dokumen;
use App\Models\Gedung;
use App\Models\ItemMutasi;
use App\Models\ItemPenerimaan;
use App\Models\ItemPengadaan;
use App\Models\ItemPenghapusan;
use App\Models\ItemPerbaikan;
use App\Models\KategoriAset;
use App\Models\PemeliharaanAset;
use App\Models\PenempatanAset;
use App\Models\Pengajuan;
use App\Models\PenerimaanAset;
use App\Models\Peran;
use App\Models\RiwayatStatusPengajuan;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Models\Vendor;
use App\Observers\ActivityObserver;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Aturan kata sandi untuk seluruh aplikasi: minimal 8 karakter, ada huruf dan angka.
        Password::defaults(fn () => Password::min(8)->letters()->numbers());

        foreach ([
            Peran::class,
            Unit::class,
            SubUnit::class,
            User::class,
            KategoriAset::class,
            Gedung::class,
            Vendor::class,
            Ruangan::class,
            Pengajuan::class,
            RiwayatStatusPengajuan::class,
            ItemPengadaan::class,
            PenerimaanAset::class,
            ItemPenerimaan::class,
            Aset::class,
            ItemPerbaikan::class,
            PemeliharaanAset::class,
            ItemMutasi::class,
            ItemPenghapusan::class,
            PenempatanAset::class,
            Dokumen::class,
            BeritaAcara::class,
        ] as $model) {
            $model::observe(ActivityObserver::class);
        }
    }
}
