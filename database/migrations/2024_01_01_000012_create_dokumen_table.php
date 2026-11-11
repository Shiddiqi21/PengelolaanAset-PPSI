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
            $table->string('jenis_dokumen', 50); // 'bast', 'surat_pengajuan', 'surat_persetujuan', dll
            $table->string('nama_file', 255);
            $table->string('path', 255);
            $table->unsignedBigInteger('diunggah_oleh');
            $table->dateTime('tanggal_unggah');
            $table->timestamps();

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan')->nullOnDelete();
            $table->foreign('id_aset')->references('id_aset')->on('aset')->nullOnDelete();
            $table->foreign('diunggah_oleh')->references('id_pengguna')->on('pengguna');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dokumen');
    }
};
