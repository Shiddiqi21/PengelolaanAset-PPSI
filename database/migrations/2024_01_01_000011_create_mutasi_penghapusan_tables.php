<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_mutasi', function (Blueprint $table) {
            $table->id('id_item_mutasi');
            $table->unsignedBigInteger('id_pengajuan');
            $table->unsignedBigInteger('id_aset');
            $table->unsignedInteger('id_ruangan_tujuan');
            $table->unsignedBigInteger('id_pengguna_pj');

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');
            $table->foreign('id_aset')->references('id_aset')->on('aset');
            $table->foreign('id_ruangan_tujuan')->references('id_ruangan')->on('ruangan');
            $table->foreign('id_pengguna_pj')->references('id_pengguna')->on('pengguna');
        });

        Schema::create('item_penghapusan', function (Blueprint $table) {
            $table->id('id_item_penghapusan');
            $table->unsignedBigInteger('id_pengajuan');
            $table->unsignedBigInteger('id_aset');
            // Nilai ENUM belum tercantum di ERD. Daftar ini menunggu konfirmasi.
            $table->enum('jalur_penghapusan', ['penjualan', 'hibah', 'pemusnahan', 'lainnya'])->nullable();
            $table->text('catatan_tim_penilai')->nullable();
            $table->string('pihak_penerima', 150)->nullable();
            $table->decimal('nilai_penjualan', 15, 2)->nullable();
            $table->date('tanggal_penghapusan')->nullable();

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');
            $table->foreign('id_aset')->references('id_aset')->on('aset');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_penghapusan');
        Schema::dropIfExists('item_mutasi');
    }
};
