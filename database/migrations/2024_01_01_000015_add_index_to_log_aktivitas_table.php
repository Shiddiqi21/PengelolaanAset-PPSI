<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Log aktivitas terus bertambah dan selalu dibaca urut waktu serta difilter. Index ini menjaga halaman log tetap cepat.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('log_aktivitas', function (Blueprint $table) {
            $table->index('waktu');
            $table->index('aksi');
            $table->index(['nama_tabel', 'id_data']);
        });
    }

    public function down(): void
    {
        Schema::table('log_aktivitas', function (Blueprint $table) {
            $table->dropIndex(['waktu']);
            $table->dropIndex(['aksi']);
            $table->dropIndex(['nama_tabel', 'id_data']);
        });
    }
};
