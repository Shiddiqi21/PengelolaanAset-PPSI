<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dokumen', function (Blueprint $table) {
            $table->id('id_dokumen');
            $table->unsignedBigInteger('id_pengajuan')->nullable();
            $table->unsignedBigInteger('id_aset')->nullable();
            $table->unsignedBigInteger('id_pengunggah');
            // Nilai ENUM belum tercantum di ERD. Daftar ini menunggu konfirmasi.
            $table->enum('jenis_dokumen', [
                'bast',
                'surat_pengajuan',
                'surat_persetujuan',
                'foto',
                'lainnya',
            ]);
            $table->string('nama_file', 150);
            $table->string('path_file', 255);
            $table->dateTime('tanggal_unggah');

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');
            $table->foreign('id_aset')->references('id_aset')->on('aset');
            $table->foreign('id_pengunggah')->references('id_pengguna')->on('pengguna');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dokumen');
    }
};
