<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ubah kolom jalur_penghapusan pada item_penghapusan menjadi varchar(50)
     * agar mendukung jalur: sharing_internal, hibah_luar, penjualan_lelang,
     * serta nilai legacy (penjualan, hibah, pemusnahan, lainnya).
     */
    public function up(): void
    {
        Schema::table('item_penghapusan', function (Blueprint $table) {
            $table->string('jalur_penghapusan', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('item_penghapusan', function (Blueprint $table) {
            $table->enum('jalur_penghapusan', ['penjualan', 'hibah', 'pemusnahan', 'lainnya'])->nullable()->change();
        });
    }
};
