<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Satu akun dapat memiliki beberapa peran (misalnya Pegawai/Dosen sekaligus Pemohon).
// Kolom pengguna.id_peran tetap dipakai sebagai peran utama; tabel ini memuat SEMUA peran akun,
// termasuk peran utama.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengguna_peran', function (Blueprint $table) {
            $table->unsignedBigInteger('id_pengguna');
            $table->unsignedBigInteger('id_peran');

            $table->primary(['id_pengguna', 'id_peran']);
            $table->foreign('id_pengguna')->references('id_pengguna')->on('pengguna')->cascadeOnDelete();
            $table->foreign('id_peran')->references('id_peran')->on('peran')->restrictOnDelete();
        });

        // Akun yang sudah ada: peran utamanya menjadi baris pertama.
        DB::table('pengguna_peran')->insertUsing(
            ['id_pengguna', 'id_peran'],
            DB::table('pengguna')->select('id_pengguna', 'id_peran')
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('pengguna_peran');
    }
};
