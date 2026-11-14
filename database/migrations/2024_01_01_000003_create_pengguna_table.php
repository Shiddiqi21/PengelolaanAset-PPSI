<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('users');

        Schema::create('pengguna', function (Blueprint $table) {
            $table->id('id_pengguna');
            $table->unsignedInteger('id_peran');
            $table->unsignedInteger('id_unit');
            $table->unsignedInteger('id_sub_unit');
            $table->string('nip', 30)->unique()->nullable();
            $table->string('nama_lengkap', 100);
            $table->string('email', 100)->unique();
            $table->string('username', 50)->unique();
            $table->string('password_hash', 255);
            $table->boolean('is_aktif');
            // Bukan kolom ERD. Dibutuhkan Laravel Auth (remember me dan timestamps Eloquent).
            $table->rememberToken();
            $table->timestamps();

            $table->foreign('id_peran')->references('id_peran')->on('peran');
            $table->foreign('id_unit')->references('id_unit')->on('unit');
            $table->foreign('id_sub_unit')->references('id_sub_unit')->on('sub_unit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengguna');
    }
};
