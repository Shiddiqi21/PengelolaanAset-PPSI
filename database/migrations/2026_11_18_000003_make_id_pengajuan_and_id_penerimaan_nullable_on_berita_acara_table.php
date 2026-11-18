<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jadikan kolom id_pengajuan dan id_penerimaan pada tabel berita_acara nullable.
     * BAST Penerimaan mengikat id_penerimaan (id_pengajuan nullable).
     * BAST Mutasi & Penghapusan mengikat id_pengajuan (id_penerimaan nullable).
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            Schema::table('berita_acara', function (Blueprint $table) {
                $table->dropForeign('berita_acara_id_pengajuan_foreign');
                $table->unsignedBigInteger('id_pengajuan')->nullable()->change();
                $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan')->nullOnDelete();

                $table->dropForeign('berita_acara_id_penerimaan_foreign');
                $table->unsignedBigInteger('id_penerimaan')->nullable()->change();
                $table->foreign('id_penerimaan')->references('id_penerimaan')->on('penerimaan_aset')->nullOnDelete();
            });
        } else {
            Schema::table('berita_acara', function (Blueprint $table) {
                $table->unsignedBigInteger('id_pengajuan')->nullable()->change();
                $table->unsignedBigInteger('id_penerimaan')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            Schema::table('berita_acara', function (Blueprint $table) {
                $table->dropForeign('berita_acara_id_pengajuan_foreign');
                $table->unsignedBigInteger('id_pengajuan')->nullable(false)->change();
                $table->foreign('id_pengajuan')->references('id_pengajuan')->on('pengajuan');

                $table->dropForeign('berita_acara_id_penerimaan_foreign');
                $table->unsignedBigInteger('id_penerimaan')->nullable(false)->change();
                $table->foreign('id_penerimaan')->references('id_penerimaan')->on('penerimaan_aset');
            });
        } else {
            Schema::table('berita_acara', function (Blueprint $table) {
                $table->unsignedBigInteger('id_pengajuan')->nullable(false)->change();
                $table->unsignedBigInteger('id_penerimaan')->nullable(false)->change();
            });
        }
    }
};
