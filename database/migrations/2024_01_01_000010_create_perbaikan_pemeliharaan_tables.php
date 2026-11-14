<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_perbaikan', function (Blueprint $table) {
            $table->id('id_item_perbaikan');
            $table->unsignedBigInteger('id_pengajuan');
            $table->unsignedBigInteger('id_aset');
            $table->unsignedBigInteger('id_teknisi')->nullable();
            $table->unsignedInteger('id_vendor')->nullable();
            $table->text('deskripsi_kerusakan');
            $table->string('foto_kerusakan_path', 255)->nullable();
            $table->text('hasil_pemeriksaan')->nullable();
            $table->decimal('estimasi_biaya', 15, 2)->nullable();
            $table->boolean('perlu_vendor')->nullable();
            $table->decimal('harga_penawaran', 15, 2)->nullable();
            // Nilai ENUM belum tercantum di ERD. Daftar ini menunggu konfirmasi.
            $table->enum('status_perbaikan', [
                'menunggu',
                'diperiksa',
                'disetujui',
                'dalam_perbaikan',
                'selesai',
                'ditolak',
            ]);
            $table->dateTime('tanggal_mulai')->nullable();
            $table->dateTime('tanggal_selesai')->nullable();
            $table->text('hasil_perbaikan')->nullable();
            $table->decimal('biaya_aktual', 15, 2)->nullable();

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');
            $table->foreign('id_aset')->references('id_aset')->on('aset');
            $table->foreign('id_teknisi')->references('id_pengguna')->on('pengguna');
            $table->foreign('id_vendor')->references('id_vendor')->on('vendor');
        });

        Schema::create('pemeliharaan_aset', function (Blueprint $table) {
            $table->id('id_pemeliharaan');
            $table->unsignedBigInteger('id_aset');
            $table->unsignedBigInteger('id_pelaksana')->nullable();
            $table->unsignedInteger('id_vendor')->nullable();
            $table->string('jenis_pemeliharaan', 100);
            $table->date('tanggal_jadwal');
            // Nilai ENUM belum tercantum di ERD. Daftar ini menunggu konfirmasi.
            $table->enum('status', ['terjadwal', 'dalam_proses', 'selesai', 'dibatalkan']);
            $table->date('tanggal_pelaksanaan')->nullable();
            $table->text('uraian')->nullable();
            $table->decimal('biaya', 15, 2)->nullable();

            $table->foreign('id_aset')->references('id_aset')->on('aset');
            $table->foreign('id_pelaksana')->references('id_pengguna')->on('pengguna');
            $table->foreign('id_vendor')->references('id_vendor')->on('vendor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemeliharaan_aset');
        Schema::dropIfExists('item_perbaikan');
    }
};
