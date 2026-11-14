<?php

namespace App\Models\Concerns;

use App\Observers\ActivityObserver;

/**
 * Pasang trait ini pada model modul lain agar tambah, ubah, dan hapus
 * tercatat di log_aktivitas. Jangan pasang pada model yang sudah
 * didaftarkan di AppServiceProvider.
 */
trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        static::observe(ActivityObserver::class);
    }
}
