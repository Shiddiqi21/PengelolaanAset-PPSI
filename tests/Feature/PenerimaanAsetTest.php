<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\Gedung;
use App\Models\ItemPengadaan;
use App\Models\ItemPenerimaan;
use App\Models\KategoriAset;
use App\Models\PenerimaanAset;
use App\Models\Pengajuan;
use App\Models\PenempatanAset;
use App\Models\Peran;
use App\Models\RiwayatStatusPengajuan;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Models\Vendor;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PenerimaanAsetTest extends TestCase
{
    use RefreshDatabase;

    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }

    private function buatVendor(string $nama = 'PT Mitra Teknologi Mandiri'): Vendor
    {
        return Vendor::query()->create([
            'nama_vendor' => $nama,
            'alamat' => 'Jl. Jendral Sudirman No. 45, Padang',
            'kontak' => '081234567890',
        ]);
    }

    private function buatRuangan(): Ruangan
    {
        $gedung = Gedung::query()->firstOrCreate(
            ['nama_gedung' => 'Gedung FTI'],
            ['kode_gedung' => 'FTI-A']
        );

        $unit = Unit::query()->firstOrCreate(
            ['nama_unit' => 'Departemen Sistem Informasi'],
            ['jenis_unit' => 'departemen']
        );

        $subUnit = SubUnit::query()->firstOrCreate(
            ['id_unit' => $unit->id_unit, 'nama_sub_unit' => 'Laboratorium'],
            ['jenis_sub_unit' => 'lab']
        );

        return Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'nomor_ruangan' => 'LAB-201',
            'nama_ruangan' => 'Laboratorium Komputer',
            'lantai' => 2,
        ]);
    }

    private function buatPengadaan(User $pemohon, string $status = 'disetujui_pimpinan', int $jumlah = 2): Pengajuan
    {
        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KAT-PC'],
            ['nama_kategori' => 'Peralatan Komputer', 'masa_manfaat_tahun' => 4]
        );

        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'PGD-2026-' . str_pad((string) rand(1000, 9999), 4, '0', STR_PAD_LEFT),
            'jenis_pengajuan' => 'pengadaan',
            'tanggal_pengajuan' => now(),
            'keterangan' => "Perihal: Pengadaan Komputer Lab\nUnit: Informatika\nAlasan: Praktikum mahasiswa",
            'status' => $status,
        ]);

        ItemPengadaan::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_kategori' => $kategori->id_kategori,
            'nama_barang' => 'PC All-in-One Core i7',
            'spesifikasi' => 'Intel Core i7 13th Gen, 16GB RAM, 512GB SSD',
            'jumlah' => $jumlah,
            'estimasi_anggaran' => 24000000,
        ]);

        RiwayatStatusPengajuan::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $pemohon->id_pengguna,
            'status_baru' => $status,
            'catatan' => 'Pengajuan siap diverifikasi penerimaannya',
            'waktu' => now(),
        ]);

        return $pengajuan;
    }

    public function test_akses_halaman_penerimaan_hanya_untuk_operator(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pimpinan = $this->akun(PeranNama::PIMPINAN);

        // Operator diizinkan
        $this->actingAs($operator)
            ->get(route('penerimaan.index'))
            ->assertOk();

        // Non-operator dilarang (403)
        $this->actingAs($pemohon)
            ->get(route('penerimaan.index'))
            ->assertForbidden();

        $this->actingAs($kepalaKantor)
            ->get(route('penerimaan.index'))
            ->assertForbidden();

        $this->actingAs($pimpinan)
            ->get(route('penerimaan.index'))
            ->assertForbidden();

        // Tamu diarahkan ke login
        auth()->logout();
        $this->get(route('penerimaan.index'))
            ->assertRedirect(route('login'));
    }

    public function test_verifikasi_penerimaan_sesuai_mencatat_penerimaan_dan_mendaftarkan_unit_aset_serta_ubah_status_selesai(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $vendor = $this->buatVendor();
        $ruangan = $this->buatRuangan();
        $pj = $this->akun(PeranNama::PEGAWAI);

        $pengajuan = $this->buatPengadaan($pemohon, 'disetujui_pimpinan', 2);
        $item = $pengajuan->itemPengadaan->first();

        $payload = [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_vendor' => $vendor->id_vendor,
            'tanggal_terima' => '2026-03-20',
            'nomor_nota' => 'SJ-VENDOR-001',
            'catatan' => 'Penerimaan barang lengkap dalam kardus bersegel',
            'registrasi_aset' => true,
            'id_ruangan' => $ruangan->id_ruangan,
            'id_pengguna_pj' => $pj->id_pengguna,
            'items' => [
                [
                    'id_item_pengadaan' => $item->id_item_pengadaan,
                    'jumlah_diterima' => 2,
                    'spesifikasi_diterima' => 'Intel Core i7 13th Gen, 16GB RAM, 512GB SSD (Sesuai PO)',
                    'hasil_verifikasi' => 'sesuai',
                    'catatan_kekurangan' => '',
                ],
            ],
        ];

        $response = $this->actingAs($operator)
            ->post(route('penerimaan.store'), $payload);

        $response->assertRedirect(route('penerimaan.index'));
        $response->assertSessionHas('status');

        // Pastikan tabel penerimaan_aset tercatat
        $this->assertDatabaseHas('penerimaan_aset', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_vendor' => $vendor->id_vendor,
            'id_verifikator' => $operator->id_pengguna,
            'nomor_nota' => 'SJ-VENDOR-001',
        ]);

        $penerimaan = PenerimaanAset::where('nomor_nota', 'SJ-VENDOR-001')->first();
        $this->assertNotNull($penerimaan);

        // Pastikan item_penerimaan tercatat
        $this->assertDatabaseHas('item_penerimaan', [
            'id_penerimaan' => $penerimaan->id_penerimaan,
            'id_item_pengadaan' => $item->id_item_pengadaan,
            'jumlah_diterima' => 2,
            'hasil_verifikasi' => 'sesuai',
        ]);

        // Pastikan unit aset didaftarkan sebanyak jumlah_diterima (2 unit) dengan format FTI-YYYY-XXXX
        $unitAset = Aset::where('nama_barang', 'PC All-in-One Core i7')->get();
        $this->assertCount(2, $unitAset);
        foreach ($unitAset as $aset) {
            $this->assertMatchesRegularExpression('/^FTI-2026-\d{4}$/', $aset->kode_aset);
            $this->assertEquals('baik', $aset->kondisi);
            $this->assertEquals('aktif', $aset->status_aset);
            $this->assertEquals(12000000.0, (float) $aset->harga_perolehan);

            // Pastikan penempatan_aset juga dibuat
            $this->assertDatabaseHas('penempatan_aset', [
                'id_aset' => $aset->id_aset,
                'id_ruangan' => $ruangan->id_ruangan,
                'id_pengguna_pj' => $pj->id_pengguna,
            ]);
        }

        // Pastikan status pengajuan berubah menjadi selesai
        $this->assertEquals('selesai', $pengajuan->fresh()->status);
        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status_baru' => 'selesai',
        ]);

        // Pastikan log aktivitas tercatat
        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'verifikasi_penerimaan',
            'nama_tabel' => 'penerimaan_aset',
            'id_data' => $penerimaan->id_penerimaan,
        ]);
    }

    public function test_verifikasi_penerimaan_kurang_atau_tidak_sesuai_mewajibkan_catatan_dan_ubah_status_diproses(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $vendor = $this->buatVendor();

        $pengajuan = $this->buatPengadaan($pemohon, 'disetujui_pimpinan', 3);
        $item = $pengajuan->itemPengadaan->first();

        // 1. Uji validasi gagal jika catatan_kekurangan kosong saat hasil_verifikasi !== 'sesuai'
        $responseGagal = $this->actingAs($operator)
            ->post(route('penerimaan.store'), [
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_vendor' => $vendor->id_vendor,
                'tanggal_terima' => '2026-03-22',
                'nomor_nota' => 'SJ-PARSIAL-001',
                'items' => [
                    [
                        'id_item_pengadaan' => $item->id_item_pengadaan,
                        'jumlah_diterima' => 1,
                        'spesifikasi_diterima' => 'Intel Core i7',
                        'hasil_verifikasi' => 'kurang',
                        'catatan_kekurangan' => '', // Kosong -> harus ditolak
                    ],
                ],
            ]);

        $responseGagal->assertSessionHasErrors('items.0.catatan_kekurangan');

        // 2. Uji kirim dengan catatan_kekurangan yang valid
        $responseSukses = $this->actingAs($operator)
            ->post(route('penerimaan.store'), [
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_vendor' => $vendor->id_vendor,
                'tanggal_terima' => '2026-03-22',
                'nomor_nota' => 'SJ-PARSIAL-001',
                'catatan' => 'Penerimaan bertahap tahap 1',
                'registrasi_aset' => true,
                'items' => [
                    [
                        'id_item_pengadaan' => $item->id_item_pengadaan,
                        'jumlah_diterima' => 1,
                        'spesifikasi_diterima' => 'Intel Core i7',
                        'hasil_verifikasi' => 'kurang',
                        'catatan_kekurangan' => 'Hanya 1 unit yang dikirim vendor hari ini, sisa 2 unit dikirim minggu depan',
                    ],
                ],
            ]);

        $responseSukses->assertRedirect(route('penerimaan.index'));

        // Karena hasil_verifikasi adalah 'kurang', unit aset tidak didaftarkan (hanya didaftarkan bila 'sesuai')
        $this->assertEquals(0, Aset::count());

        // Status pengajuan harus diperbarui menjadi 'diproses'
        $this->assertEquals('diproses', $pengajuan->fresh()->status);
        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status_baru' => 'diproses',
        ]);
    }

    public function test_verifikasi_penerimaan_tidak_sesuai_mewajibkan_catatan_dan_status_diproses(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $vendor = $this->buatVendor();

        $pengajuan = $this->buatPengadaan($pemohon, 'disetujui_pimpinan', 1);
        $item = $pengajuan->itemPengadaan->first();

        $response = $this->actingAs($operator)
            ->post(route('penerimaan.store'), [
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_vendor' => $vendor->id_vendor,
                'tanggal_terima' => '2026-03-23',
                'nomor_nota' => 'SJ-REJECT-001',
                'registrasi_aset' => true,
                'items' => [
                    [
                        'id_item_pengadaan' => $item->id_item_pengadaan,
                        'jumlah_diterima' => 1,
                        'spesifikasi_diterima' => 'Intel Core i3 8GB RAM',
                        'hasil_verifikasi' => 'tidak_sesuai',
                        'catatan_kekurangan' => 'Spesifikasi prosesor dan RAM tidak sesuai dengan RAB (dikirim Core i3 bukan i7). Barang ditolak.',
                    ],
                ],
            ]);

        $response->assertRedirect(route('penerimaan.index'));

        // Tidak ada unit aset didaftarkan untuk barang yang tidak sesuai
        $this->assertEquals(0, Aset::count());

        // Status pengajuan tetap / menjadi diproses
        $this->assertEquals('diproses', $pengajuan->fresh()->status);
    }

    public function test_penerimaan_bertahap_menyelesaikan_pengajuan_ketika_seluruh_barang_terpenuhi(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $vendor = $this->buatVendor();

        $pengajuan = $this->buatPengadaan($pemohon, 'disetujui_pimpinan', 2);
        $item = $pengajuan->itemPengadaan->first();

        // Pengiriman Tahap 1: 1 unit diterima sesuai, 1 unit belum
        $this->actingAs($operator)
            ->post(route('penerimaan.store'), [
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_vendor' => $vendor->id_vendor,
                'tanggal_terima' => '2026-03-20',
                'nomor_nota' => 'SJ-TAHAP-1',
                'registrasi_aset' => true,
                'items' => [
                    [
                        'id_item_pengadaan' => $item->id_item_pengadaan,
                        'jumlah_diterima' => 1,
                        'spesifikasi_diterima' => 'Intel Core i7',
                        'hasil_verifikasi' => 'sesuai',
                        'catatan_kekurangan' => 'Pengiriman bertahap tahap 1 (1 unit dari 2)',
                    ],
                ],
            ]);

        // Status masih diproses karena baru 1 dari 2
        $this->assertEquals('diproses', $pengajuan->fresh()->status);
        $this->assertEquals(1, Aset::count());

        // Pengiriman Tahap 2: 1 unit sisa diterima sesuai
        $this->actingAs($operator)
            ->post(route('penerimaan.store'), [
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_vendor' => $vendor->id_vendor,
                'tanggal_terima' => '2026-03-25',
                'nomor_nota' => 'SJ-TAHAP-2',
                'registrasi_aset' => true,
                'items' => [
                    [
                        'id_item_pengadaan' => $item->id_item_pengadaan,
                        'jumlah_diterima' => 1,
                        'spesifikasi_diterima' => 'Intel Core i7',
                        'hasil_verifikasi' => 'sesuai',
                        'catatan_kekurangan' => '',
                    ],
                ],
            ]);

        // Status menjadi selesai karena total diterima sesuai sudah 2 dari 2
        $this->assertEquals('selesai', $pengajuan->fresh()->status);
        $this->assertEquals(2, Aset::count());
    }

    public function test_filter_dan_pencarian_riwayat_penerimaan(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $vendor1 = $this->buatVendor('CV Mitra Solusi');
        $vendor2 = $this->buatVendor('PT Global Perdana');

        $pengajuan = $this->buatPengadaan($pemohon, 'disetujui_pimpinan', 1);
        $item = $pengajuan->itemPengadaan->first();

        // Simpan penerimaan 1
        $this->actingAs($operator)->post(route('penerimaan.store'), [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_vendor' => $vendor1->id_vendor,
            'tanggal_terima' => '2026-03-20',
            'nomor_nota' => 'NOTA-SOLUSI-001',
            'registrasi_aset' => false,
            'items' => [
                [
                    'id_item_pengadaan' => $item->id_item_pengadaan,
                    'jumlah_diterima' => 1,
                    'spesifikasi_diterima' => 'Spek',
                    'hasil_verifikasi' => 'sesuai',
                    'catatan_kekurangan' => '',
                ],
            ],
        ]);

        // Simpan penerimaan 2
        $pengajuan2 = $this->buatPengadaan($pemohon, 'disetujui_pimpinan', 1);
        $item2 = $pengajuan2->itemPengadaan->first();

        $this->actingAs($operator)->post(route('penerimaan.store'), [
            'id_pengajuan' => $pengajuan2->id_pengajuan,
            'id_vendor' => $vendor2->id_vendor,
            'tanggal_terima' => '2026-03-21',
            'nomor_nota' => 'NOTA-GLOBAL-002',
            'registrasi_aset' => false,
            'items' => [
                [
                    'id_item_pengadaan' => $item2->id_item_pengadaan,
                    'jumlah_diterima' => 1,
                    'spesifikasi_diterima' => 'Spek',
                    'hasil_verifikasi' => 'kurang',
                    'catatan_kekurangan' => 'Kekurangan unit',
                ],
            ],
        ]);

        // Cari dengan query nota
        $responseQ = $this->actingAs($operator)
            ->get(route('penerimaan.index', ['q' => 'SOLUSI']));
        $responseQ->assertOk();

        // Filter dengan hasil_verifikasi
        $responseHasil = $this->actingAs($operator)
            ->get(route('penerimaan.index', ['hasil_verifikasi' => 'kurang']));
        $responseHasil->assertOk();
    }
}
