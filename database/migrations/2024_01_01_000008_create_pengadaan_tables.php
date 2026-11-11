<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_pengadaan', function (Blueprint $table) {
            $table->id('id_item_pengadaan');
            $table->unsignedBigInteger('id_pengajuan');
            $table->unsignedInteger('id_kategori');
            $table->string('nama_barang', 150);
            $table->text('spesifikasi');
            $table->integer('jumlah');
            $table->decimal('estimasi_anggaran', 15, 2)->nullable();
            $table->timestamps();

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan')->onDelete('cascade');
            $table->foreign('id_kategori')->references('id_kategori')->on('kategori_aset');
        });

        Schema::create('penerimaan_aset', function (Blueprint $table) {
            $table->id('id_penerimaan');
            $table->unsignedBigInteger('id_pengajuan');
            $table->unsignedInteger('id_vendor');
            $table->unsignedBigInteger('id_verifikator');
            $table->date('tanggal_terima');
            $table->string('nomor_nota', 50)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');
            $table->foreign('id_vendor')->references('id_vendor')->on('vendor');
            $table->foreign('id_verifikator')->references('id_pengguna')->on('pengguna');
        });

        Schema::create('item_penerimaan', function (Blueprint $table) {
            $table->id('id_item_penerimaan');
            $table->unsignedBigInteger('id_penerimaan');
            $table->unsignedBigInteger('id_item_pengadaan');
            $table->integer('jumlah_diterima');
            $table->text('spesifikasi_diterima')->nullable();
            $table->enum('hasil_verifikasi', ['sesuai', 'tidak_sesuai', 'kurang'])->default('sesuai');
            $table->text('catatan_kekurangan')->nullable();
            $table->timestamps();

            $table->foreign('id_penerimaan')->references('id_penerimaan')->on('penerimaan_aset')->onDelete('cascade');
            $table->foreign('id_item_pengadaan')->references('id_item_pengadaan')->on('item_pengadaan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_penerimaan');
        Schema::dropIfExists('penerimaan_aset');
        Schema::dropIfExists('item_pengadaan');
    }
};
