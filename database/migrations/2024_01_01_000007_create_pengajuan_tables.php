<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengajuan', function (Blueprint $table) {
            $table->id('id_pengajuan');
            $table->unsignedBigInteger('id_pemohon');
            $table->string('nomor_pengajuan', 30)->unique();
            // Nilai ENUM belum tercantum di ERD. Daftar ini menunggu konfirmasi.
            $table->enum('jenis_pengajuan', ['pengadaan', 'perbaikan', 'mutasi', 'penghapusan']);
            $table->dateTime('tanggal_pengajuan');
            $table->text('keterangan')->nullable();
            $table->enum('status', [
                'draft',
                'diajukan',
                'disetujui_kadep',
                'disetujui_pimpinan',
                'diproses',
                'selesai',
                'ditolak',
            ]);

            $table->foreign('id_pemohon')->references('id_pengguna')->on('pengguna');
        });

        Schema::create('riwayat_status_pengajuan', function (Blueprint $table) {
            $table->id('id_riwayat_status');
            $table->unsignedBigInteger('id_pengajuan');
            $table->unsignedBigInteger('id_pengguna');
            $table->string('status_baru', 20);
            $table->text('catatan')->nullable();
            $table->dateTime('waktu');

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');
            $table->foreign('id_pengguna')->references('id_pengguna')->on('pengguna');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_status_pengajuan');
        Schema::dropIfExists('pengajuan');
    }
};
