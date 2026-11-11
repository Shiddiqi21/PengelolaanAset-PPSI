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
            $table->smallInteger('masa_manfaat_tahun')->nullable();
            $table->timestamps();
        });

        Schema::create('gedung', function (Blueprint $table) {
            $table->increments('id_gedung');
            $table->string('kode_gedung', 20)->unique();
            $table->string('nama_gedung', 100);
            $table->timestamps();
        });

        Schema::create('vendor', function (Blueprint $table) {
            $table->increments('id_vendor');
            $table->string('nama_vendor', 150);
            $table->text('alamat')->nullable();
            $table->string('kontak', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor');
        Schema::dropIfExists('gedung');
        Schema::dropIfExists('kategori_aset');
    }
};
