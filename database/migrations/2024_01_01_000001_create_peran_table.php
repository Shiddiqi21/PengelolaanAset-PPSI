<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('peran', function (Blueprint $table) {
            $table->increments('id_peran');
            $table->string('nama_peran', 50)->unique();
            $table->string('deskripsi', 200)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peran');
    }
};
