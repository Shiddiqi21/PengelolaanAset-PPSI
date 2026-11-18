<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Perbaiki kolom tanggal_selesai dan keterangan pada tabel penempatan_aset
     * agar sesuai definisi migrasi asli (nullable).
     */
    public function up(): void
    {
        Schema::table('penempatan_aset', function (Blueprint $table) {
            $table->datetime('tanggal_selesai')->nullable()->change();
            $table->string('keterangan', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('penempatan_aset', function (Blueprint $table) {
            $table->datetime('tanggal_selesai')->nullable(false)->change();
            $table->string('keterangan', 255)->nullable(false)->change();
        });
    }
};
