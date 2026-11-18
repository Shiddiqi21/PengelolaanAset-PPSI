<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        // 1. Perbarui tabel berita_acara
        Schema::table('berita_acara', function (Blueprint $table) use ($driver) {
            if ($driver === 'mysql') {
                $table->dropForeign('berita_acara_id_dokumen_foreign');
                $table->unsignedBigInteger('id_dokumen')->nullable()->change();
                $table->foreign('id_dokumen')->references('id_dokumen')->on('dokumen')->nullOnDelete();
                $table->string('jenis_bast', 50)->change();
            } else {
                $table->unsignedBigInteger('id_dokumen')->nullable()->change();
                $table->string('jenis_bast', 50)->change();
            }

            if (! Schema::hasColumn('berita_acara', 'status')) {
                $table->string('status', 20)->default('draft')->after('jenis_bast');
            }

            if (! Schema::hasColumn('berita_acara', 'keterangan')) {
                $table->text('keterangan')->nullable()->after('pihak_kedua');
            }

            if (! Schema::hasColumn('berita_acara', 'id_pembuat')) {
                $table->unsignedBigInteger('id_pembuat')->nullable()->after('id_dokumen');
                $table->foreign('id_pembuat')->references('id_pengguna')->on('pengguna')->nullOnDelete();
            }
        });

        // 2. Buat tabel berita_acara_item jika belum ada
        if (! Schema::hasTable('berita_acara_item')) {
            Schema::create('berita_acara_item', function (Blueprint $table) {
                $table->id('id_item_bast');
                $table->unsignedBigInteger('id_bast');
                $table->unsignedBigInteger('id_aset')->nullable();
                $table->string('kode_aset', 100)->nullable();
                $table->string('nama_barang', 255);
                $table->text('spesifikasi')->nullable();
                $table->string('nomor_seri', 100)->nullable();
                $table->integer('jumlah')->default(1);
                $table->string('satuan', 50)->default('unit');
                $table->string('kondisi', 50)->default('baik');
                $table->text('keterangan')->nullable();

                $table->foreign('id_bast')->references('id_bast')->on('berita_acara')->cascadeOnDelete();
                $table->foreign('id_aset')->references('id_aset')->on('aset')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('berita_acara_item');

        Schema::table('berita_acara', function (Blueprint $table) {
            if (Schema::hasColumn('berita_acara', 'id_pembuat')) {
                $table->dropForeign(['id_pembuat']);
                $table->dropColumn('id_pembuat');
            }

            if (Schema::hasColumn('berita_acara', 'keterangan')) {
                $table->dropColumn('keterangan');
            }

            if (Schema::hasColumn('berita_acara', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
