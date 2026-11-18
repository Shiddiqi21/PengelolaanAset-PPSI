<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jadikan kolom id_pengguna_pj pada item_mutasi dan penempatan_aset nullable
     * sesuai Class Diagram 2 (penanggungJawabTujuan [0..1]) dan Frame Figma 8.
     */
    public function up(): void
    {
        Schema::table('item_mutasi', function (Blueprint $table) {
            $table->dropForeign(['id_pengguna_pj']);
            $table->unsignedBigInteger('id_pengguna_pj')->nullable()->change();
            $table->foreign('id_pengguna_pj')->references('id_pengguna')->on('pengguna')->nullOnDelete();
        });

        Schema::table('penempatan_aset', function (Blueprint $table) {
            $table->dropForeign(['id_pengguna_pj']);
            $table->unsignedBigInteger('id_pengguna_pj')->nullable()->change();
            $table->foreign('id_pengguna_pj')->references('id_pengguna')->on('pengguna')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('penempatan_aset', function (Blueprint $table) {
            $table->dropForeign(['id_pengguna_pj']);
            $table->unsignedBigInteger('id_pengguna_pj')->nullable(false)->change();
            $table->foreign('id_pengguna_pj')->references('id_pengguna')->on('pengguna');
        });

        Schema::table('item_mutasi', function (Blueprint $table) {
            $table->dropForeign(['id_pengguna_pj']);
            $table->unsignedBigInteger('id_pengguna_pj')->nullable(false)->change();
            $table->foreign('id_pengguna_pj')->references('id_pengguna')->on('pengguna');
        });
    }
};
