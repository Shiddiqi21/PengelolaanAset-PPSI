<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            Schema::table('penempatan_aset', function (Blueprint $table) {
                $table->dropForeign('penempatan_aset_id_item_mutasi_foreign');
                $table->unsignedBigInteger('id_item_mutasi')->nullable()->change();
                $table->foreign('id_item_mutasi')->references('id_item_mutasi')->on('item_mutasi')->nullOnDelete();
            });
        } else {
            Schema::table('penempatan_aset', function (Blueprint $table) {
                $table->unsignedBigInteger('id_item_mutasi')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            Schema::table('penempatan_aset', function (Blueprint $table) {
                $table->dropForeign('penempatan_aset_id_item_mutasi_foreign');
                $table->unsignedBigInteger('id_item_mutasi')->nullable(false)->change();
                $table->foreign('id_item_mutasi')->references('id_item_mutasi')->on('item_mutasi');
            });
        } else {
            Schema::table('penempatan_aset', function (Blueprint $table) {
                $table->unsignedBigInteger('id_item_mutasi')->nullable(false)->change();
            });
        }
    }
};
