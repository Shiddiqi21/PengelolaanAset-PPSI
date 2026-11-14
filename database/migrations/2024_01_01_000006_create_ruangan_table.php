<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ruangan', function (Blueprint $table) {
            $table->increments('id_ruangan');
            $table->unsignedInteger('id_gedung');
            $table->unsignedInteger('id_unit');
            $table->unsignedInteger('id_sub_unit');
            $table->smallInteger('lantai');
            $table->string('nomor_ruangan', 20);
            $table->string('nama_ruangan', 100)->nullable();

            $table->foreign('id_gedung')->references('id_gedung')->on('gedung');
            $table->foreign('id_unit')->references('id_unit')->on('unit');
            $table->foreign('id_sub_unit')->references('id_sub_unit')->on('sub_unit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ruangan');
    }
};
