<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aset', function (Blueprint $table) {
            $table->id('id_aset');
            $table->unsignedInteger('id_kategori');
            $table->unsignedBigInteger('id_item_penerimaan')->nullable();
            $table->string('kode_aset', 50)->unique();
            $table->string('nama_barang', 150);
            $table->string('merek_tipe', 100)->nullable();
            $table->string('nomor_seri', 100)->nullable();
            $table->text('spesifikasi')->nullable();
            $table->string('foto_path', 255)->nullable();
            $table->smallInteger('tahun_perolehan')->nullable();
            $table->decimal('harga_perolehan', 15, 2)->nullable();
            $table->enum('kondisi', ['baik', 'kurang_baik', 'rusak_berat'])->default('baik');
            $table->enum('status_aset', ['aktif', 'dalam_perbaikan', 'dihapus', 'dimutasi'])->default('aktif');
            // Lokasi penempatan saat ini
            $table->unsignedInteger('id_ruangan')->nullable();
            $table->unsignedBigInteger('id_pengguna_pj')->nullable(); // penanggungjawab
            $table->timestamps();

            $table->foreign('id_kategori')->references('id_kategori')->on('kategori_aset');
            $table->foreign('id_item_penerimaan')->references('id_item_penerimaan')->on('item_penerimaan')->nullOnDelete();
            $table->foreign('id_ruangan')->references('id_ruangan')->on('ruangan')->nullOnDelete();
            $table->foreign('id_pengguna_pj')->references('id_pengguna')->on('pengguna')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aset');
    }
};
