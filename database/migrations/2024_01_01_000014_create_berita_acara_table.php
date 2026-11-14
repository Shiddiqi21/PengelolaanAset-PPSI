<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('berita_acara', function (Blueprint $table) {
            $table->id('id_bast');
            $table->unsignedBigInteger('id_pengajuan');
            $table->unsignedBigInteger('id_penerimaan');
            $table->unsignedBigInteger('id_dokumen')->unique();
            $table->string('nomor_bast', 50)->unique();
            // Nilai ENUM belum tercantum di ERD. Daftar ini menunggu konfirmasi.
            $table->enum('jenis_bast', ['penerimaan', 'mutasi', 'penghapusan', 'serah_terima']);
            $table->date('tanggal_bast');
            $table->string('pihak_pertama', 150);
            $table->string('pihak_kedua', 150);

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');
            $table->foreign('id_penerimaan')->references('id_penerimaan')->on('penerimaan_aset');
            $table->foreign('id_dokumen')->references('id_dokumen')->on('dokumen');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('berita_acara');
    }
};
