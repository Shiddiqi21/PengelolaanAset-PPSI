<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('log_aktivitas', function (Blueprint $table) {
            $table->id('id_log');
            // ERD menandai kolom ini wajib. Dibuat nullable agar gagal login
            // untuk username yang tidak dikenal tetap bisa dicatat.
            $table->unsignedBigInteger('id_pengguna')->nullable();
            $table->dateTime('waktu');
            $table->string('aksi', 30);
            $table->string('nama_tabel', 50);
            $table->unsignedBigInteger('id_data')->nullable();
            $table->text('detail')->nullable();

            $table->foreign('id_pengguna')->references('id_pengguna')->on('pengguna')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('log_aktivitas');
    }
};
