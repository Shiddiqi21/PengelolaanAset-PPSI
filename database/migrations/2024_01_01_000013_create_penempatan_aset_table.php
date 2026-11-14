<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penempatan_aset', function (Blueprint $table) {
            $table->id('id_penempatan');
            $table->unsignedBigInteger('id_aset');
            $table->unsignedInteger('id_ruangan');
            $table->unsignedBigInteger('id_pengguna_pj');
            $table->unsignedBigInteger('id_item_mutasi')->unique();
            $table->dateTime('tanggal_mulai');
            $table->dateTime('tanggal_selesai');
            $table->string('keterangan', 255);

            $table->foreign('id_aset')->references('id_aset')->on('aset');
            $table->foreign('id_ruangan')->references('id_ruangan')->on('ruangan');
            $table->foreign('id_pengguna_pj')->references('id_pengguna')->on('pengguna');
            $table->foreign('id_item_mutasi')->references('id_item_mutasi')->on('item_mutasi');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penempatan_aset');
    }
};
