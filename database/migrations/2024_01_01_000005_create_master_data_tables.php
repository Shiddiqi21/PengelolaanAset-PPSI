<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kategori_aset', function (Blueprint $table) {
            $table->increments('id_kategori');
            $table->string('kode_kategori', 20)->unique();
            $table->string('nama_kategori', 100);
            $table->smallInteger('masa_manfaat_tahun');
        });

        Schema::create('gedung', function (Blueprint $table) {
            $table->increments('id_gedung');
            $table->string('kode_gedung', 20)->unique();
            $table->string('nama_gedung', 100);
        });

        Schema::create('vendor', function (Blueprint $table) {
            $table->increments('id_vendor');
            $table->string('nama_vendor', 150);
            $table->text('alamat');
            $table->string('kontak', 50);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor');
        Schema::dropIfExists('gedung');
        Schema::dropIfExists('kategori_aset');
    }
};
