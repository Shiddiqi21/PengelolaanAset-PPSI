<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit', function (Blueprint $table) {
            $table->increments('id_unit');
            $table->string('nama_unit', 100);
            $table->string('jenis_unit', 30);
            $table->timestamps();
        });

        Schema::create('sub_unit', function (Blueprint $table) {
            $table->increments('id_sub_unit');
            $table->unsignedInteger('id_unit');
            $table->string('nama_sub_unit', 100);
            $table->timestamps();

            $table->foreign('id_unit')->references('id_unit')->on('unit')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sub_unit');
        Schema::dropIfExists('unit');
    }
};
