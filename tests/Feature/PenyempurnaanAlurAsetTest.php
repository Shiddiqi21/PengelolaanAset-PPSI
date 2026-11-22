<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\Gedung;
use App\Models\ItemMutasi;
use App\Models\ItemPenghapusan;
use App\Models\ItemPerbaikan;
use App\Models\KategoriAset;
use App\Models\PemeliharaanAset;
use App\Models\PenerimaanAset;
use App\Models\Pengajuan;
use App\Models\PenempatanAset;
use App\Models\Peran;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Models\Vendor;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PenyempurnaanAlurAsetTest extends TestCase
{
    use RefreshDatabase;

    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }

    private function buatUnitDanRuangan(string $namaUnit, string $nomorRuangan): array
    {
        $gedung = Gedung::query()->firstOrCreate(
            ['kode_gedung' => 'GFTI'],
            ['nama_gedung' => 'Gedung FTI']
        );

        $unit = Unit::query()->create([
            'nama_unit' => $namaUnit,
            'jenis_unit' => 'departemen',
        ]);

        $subUnit = SubUnit::query()->create([
            'id_unit' => $unit->id_unit,
            'nama_sub_unit' => 'Sub ' . $namaUnit,
            'jenis_sub_unit' => 'lab',
        ]);

        $ruangan = Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'lantai' => 1,
            'nomor_ruangan' => $nomorRuangan,
            'nama_ruangan' => 'Ruang ' . $nomorRuangan,
        ]);

        return [$unit, $subUnit, $ruangan];
    }

    private function buatAsetDiRuangan(Ruangan $ruangan, ?User $pj = null, string $kondisi = 'baik', string $status = 'aktif'): Aset
    {
        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KMP'],
            ['nama_kategori' => 'Komputer', 'masa_manfaat_tahun' => 4]
        );

        $aset = Aset::query()->create([
            'id_kategori' => $kategori->id_kategori,
            'kode_aset' => 'FTI-2026-' . str_pad((string) rand(1000, 9999), 4, '0', STR_PAD_LEFT),
            'nama_barang' => 'Komputer Workstation ' . rand(10, 99),
            'merek_tipe' => 'Dell OptiPlex',
            'tahun_perolehan' => 2024,
            'harga_perolehan' => 15000000,
            'kondisi' => $kondisi,
            'status_aset' => $status,
        ]);

        PenempatanAset::query()->create([
            'id_aset' => $aset->id_aset,
            'id_ruangan' => $ruangan->id_ruangan,
            'id_pengguna_pj' => $pj?->id_pengguna,
            'id_item_mutasi' => null,
            'tanggal_mulai' => now()->subDays(10),
            'tanggal_selesai' => null,
            'keterangan' => 'Penempatan awal',
        ]);

        return $aset;
    }

    public function test_pemohon_dapat_mengakses_dan_memfilter_riwayat_perpindahan(): void
    {
        [$unitA, $subA, $ruangA1] = $this->buatUnitDanRuangan('Departemen SI', '101');
        $ruangA2 = Ruangan::query()->create([
            'id_gedung' => $ruangA1->id_gedung,
            'id_unit' => $unitA->id_unit,
            'id_sub_unit' => $subA->id_sub_unit,
            'lantai' => 2,
            'nomor_ruangan' => '201',
            'nama_ruangan' => 'Lab SI Baru',
        ]);
        [$unitB, , $ruangB] = $this->buatUnitDanRuangan('Tata Usaha', '102');

        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unitA->id_unit, 'id_sub_unit' => $subA->id_sub_unit]);
        $pjUnitB = $this->akun(PeranNama::PEGAWAI, ['id_unit' => $unitB->id_unit]);

        $asetUnitA = $this->buatAsetDiRuangan($ruangA1, $pemohon);
        $asetUnitB = $this->buatAsetDiRuangan($ruangB, $pjUnitB);

        // Tutup penempatan lama & buat penempatan hasil mutasi resmi
        PenempatanAset::query()->where('id_aset', $asetUnitA->id_aset)->update(['tanggal_selesai' => now()->subDay()]);

        $pengajuanMutasi = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'MTS-2026-0001',
            'jenis_pengajuan' => 'mutasi',
            'tanggal_pengajuan' => now()->subDay(),
            'keterangan' => 'Pemindahan ke lab baru',
            'status' => 'selesai',
        ]);

        $itemMutasi = ItemMutasi::query()->create([
            'id_pengajuan' => $pengajuanMutasi->id_pengajuan,
            'id_aset' => $asetUnitA->id_aset,
            'id_ruangan_tujuan' => $ruangA2->id_ruangan,
            'id_pengguna_pj' => $pemohon->id_pengguna,
        ]);

        PenempatanAset::query()->create([
            'id_aset' => $asetUnitA->id_aset,
            'id_ruangan' => $ruangA2->id_ruangan,
            'id_pengguna_pj' => $pemohon->id_pengguna,
            'id_item_mutasi' => $itemMutasi->id_item_mutasi,
            'tanggal_mulai' => now()->subDay(),
            'tanggal_selesai' => null,
            'keterangan' => 'Mutasi resmi ke Lab SI Baru',
        ]);

        // Akses halaman utama
        $this->actingAs($pemohon)
            ->get(route('pemohon.riwayat-perpindahan'))
            ->assertOk()
            ->assertInertia(function (Assert $page) use ($asetUnitB) {
                $page->component('Pemohon/RiwayatPerpindahan/Index')
                    ->where('riwayat.total', 2);

                $kodeList = collect($page->toArray()['props']['riwayat']['data'])->pluck('kode_aset')->all();
                $this->assertNotContains($asetUnitB->kode_aset, $kodeList);
            });

        // Filter status aktif & pencarian nomor mutasi
        $this->actingAs($pemohon)
            ->get(route('pemohon.riwayat-perpindahan', ['status' => 'aktif', 'q' => 'MTS-2026-0001']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('riwayat.total', 1)
                ->where('riwayat.data.0.nomor_mutasi', 'MTS-2026-0001')
                ->where('riwayat.data.0.aktif', true));
    }

    public function test_dashboard_menampilkan_angka_kpi_aktual_termasuk_nol_dan_jadwal_terjadwal(): void
    {
        [, , $ruangan] = $this->buatUnitDanRuangan('Fakultas TI', '101');
        $operator = $this->akun(PeranNama::OPERATOR, ['id_unit' => $ruangan->id_unit]);
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $teknisi = $this->akun(PeranNama::TEKNISI);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $ruangan->id_unit]);

        $aset = $this->buatAsetDiRuangan($ruangan, $operator);

        PemeliharaanAset::query()->create([
            'id_aset' => $aset->id_aset,
            'id_pelaksana' => $teknisi->id_pengguna,
            'jenis_pemeliharaan' => 'Servis Rutin AC',
            'tanggal_jadwal' => now()->addDays(2)->toDateString(),
            'status' => 'terjadwal',
        ]);

        // Operator: perlu verifikasi = 0, perbaikan aktif = 0, jadwal pemeliharaan = 1
        $this->actingAs($operator)->get('/operator')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.1.nilai', '0')
                ->where('kpi.2.nilai', '0')
                ->where('kpi.3.nilai', '1'));

        // Pimpinan: perlu persetujuan = 0 (tidak fallback ke 3)
        $this->actingAs($pimpinan)->get('/pimpinan')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.2.nilai', '0'));

        // Pemohon saat pengajuan saya tidak kosong tapi aset unit = 0 -> KPI aset unit tampil 0
        [$unitKosong] = [$this->buatUnitDanRuangan('Unit Kosong', '999')[0]];
        $pemohonKosong = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unitKosong->id_unit]);
        Pengajuan::query()->create([
            'id_pemohon' => $pemohonKosong->id_pengguna,
            'nomor_pengajuan' => 'PGD-2026-0001',
            'jenis_pengajuan' => 'pengadaan',
            'tanggal_pengajuan' => now(),
            'keterangan' => 'Pengajuan unit kosong',
            'status' => 'draft',
        ]);

        $this->actingAs($pemohonKosong)->get('/pemohon')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.0.nilai', '0'));

        // Teknisi memiliki riwayat selesai tanpa tugas aktif -> tugas aktif tampil 0
        $pengajuanSelesai = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'PRB-2026-0001',
            'jenis_pengajuan' => 'perbaikan',
            'tanggal_pengajuan' => now(),
            'status' => 'selesai',
        ]);
        ItemPerbaikan::query()->create([
            'id_pengajuan' => $pengajuanSelesai->id_pengajuan,
            'id_aset' => $aset->id_aset,
            'id_teknisi' => $teknisi->id_pengguna,
            'deskripsi_kerusakan' => 'Kabel putus',
            'status_perbaikan' => 'selesai',
        ]);

        $this->actingAs($teknisi)->get('/teknisi')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.0.nilai', '0')
                ->where('kpi.2.nilai', '1'));
    }

    public function test_pencarian_riwayat_penerimaan_tidak_gagal_kolom_perihal(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $vendor = Vendor::query()->create([
            'nama_vendor' => 'CV Andalas Karya',
            'alamat' => 'Padang',
            'kontak' => '08111111',
        ]);

        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'PGD-2026-0077',
            'jenis_pengajuan' => 'pengadaan',
            'tanggal_pengajuan' => now(),
            'keterangan' => "Perihal: Pengadaan Printer Laboratorium\nSumber Dana: RKAT 2026",
            'status' => 'selesai',
        ]);

        PenerimaanAset::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_vendor' => $vendor->id_vendor,
            'id_verifikator' => $operator->id_pengguna,
            'tanggal_terima' => now()->toDateString(),
            'nomor_nota' => 'NOTA-999',
            'catatan' => 'Barang lengkap',
        ]);

        $this->actingAs($operator)
            ->get(route('penerimaan.index', ['q' => 'Printer Laboratorium']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('riwayatPenerimaan.total', 1));
    }

    public function test_penghapusan_sharing_internal_dan_hibah_mempertahankan_kondisi_baik_aset(): void
    {
        [$unit, , $ruangan] = $this->buatUnitDanRuangan('Departemen TI', '301');
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);

        // Jalur sharing_internal
        $asetBaik = $this->buatAsetDiRuangan($ruangan, $pemohon, 'baik');
        $pengajuanSharing = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'HPS-2026-0501',
            'jenis_pengajuan' => 'penghapusan',
            'tanggal_pengajuan' => now(),
            'status' => 'disetujui_pimpinan',
        ]);
        ItemPenghapusan::query()->create([
            'id_pengajuan' => $pengajuanSharing->id_pengajuan,
            'id_aset' => $asetBaik->id_aset,
        ]);

        $this->actingAs($operator)->post(route('penghapusan.proses', $pengajuanSharing->id_pengajuan), [
            'jalur_penghapusan' => 'sharing_internal',
            'tanggal_penghapusan' => now()->toDateString(),
            'pihak_penerima' => 'FMIPA UNAND',
        ])->assertRedirect(route('penghapusan.index'));

        $asetBaik->refresh();
        $this->assertEquals('dihapus', $asetBaik->status_aset);
        $this->assertEquals('baik', $asetBaik->kondisi);

        // Jalur hibah_luar mempertahankan kondisi kurang_baik
        $asetKurangBaik = $this->buatAsetDiRuangan($ruangan, $pemohon, 'kurang_baik');
        $pengajuanHibah = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'HPS-2026-0502',
            'jenis_pengajuan' => 'penghapusan',
            'tanggal_pengajuan' => now(),
            'status' => 'disetujui_pimpinan',
        ]);
        ItemPenghapusan::query()->create([
            'id_pengajuan' => $pengajuanHibah->id_pengajuan,
            'id_aset' => $asetKurangBaik->id_aset,
        ]);

        $this->actingAs($operator)->post(route('penghapusan.proses', $pengajuanHibah->id_pengajuan), [
            'jalur_penghapusan' => 'hibah_luar',
            'tanggal_penghapusan' => now()->toDateString(),
            'pihak_penerima' => 'SMK Negeri 2 Padang',
        ])->assertRedirect(route('penghapusan.index'));

        $asetKurangBaik->refresh();
        $this->assertEquals('dihapus', $asetKurangBaik->status_aset);
        $this->assertEquals('kurang_baik', $asetKurangBaik->kondisi);
    }

    public function test_perbaikan_membatasi_unit_mencegah_duplikat_dan_mendukung_vendor_eksternal(): void
    {
        [$unitA, , $ruangA] = $this->buatUnitDanRuangan('Departemen SI', '101');
        [$unitB, , $ruangB] = $this->buatUnitDanRuangan('Departemen TK', '102');

        $pemohonA = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unitA->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);
        $vendor = Vendor::query()->create([
            'nama_vendor' => 'CV Servis Profesional',
            'alamat' => 'Padang',
            'kontak' => '08123456',
        ]);

        $asetA = $this->buatAsetDiRuangan($ruangA, $pemohonA);
        $asetB = $this->buatAsetDiRuangan($ruangB, null);

        // 1. Pemohon unit A tidak dapat mengajukan perbaikan aset unit B
        $this->actingAs($pemohonA)->post(route('pemohon.perbaikan.store'), [
            'id_aset' => $asetB->id_aset,
            'tingkat_kerusakan' => 'kurang_baik',
            'deskripsi_kerusakan' => 'Mati total',
        ])->assertSessionHasErrors('id_aset');

        // 2. Pemohon unit A berhasil mengajukan perbaikan aset A
        $this->actingAs($pemohonA)->post(route('pemohon.perbaikan.store'), [
            'id_aset' => $asetA->id_aset,
            'tingkat_kerusakan' => 'kurang_baik',
            'deskripsi_kerusakan' => 'Layar berkedip parah',
        ])->assertRedirect(route('pemohon.perbaikan'));

        $itemPerbaikan = ItemPerbaikan::query()->where('id_aset', $asetA->id_aset)->firstOrFail();

        // 3. Pengajuan kedua untuk aset A yang masih memiliki tiket aktif ditolak
        $this->actingAs($pemohonA)->post(route('pemohon.perbaikan.store'), [
            'id_aset' => $asetA->id_aset,
            'tingkat_kerusakan' => 'rusak_berat',
            'deskripsi_kerusakan' => 'Tiket ganda',
        ])->assertSessionHasErrors('id_aset');

        // Simulasikan persetujuan pimpinan sehingga status_perbaikan = 'disetujui'
        $itemPerbaikan->update(['status_perbaikan' => 'disetujui']);
        $itemPerbaikan->pengajuan->update(['status' => 'disetujui_pimpinan']);

        // 4. Operator menugaskan Vendor Eksternal
        $this->actingAs($operator)->post(route('perbaikan.tugaskan', $itemPerbaikan->id_item_perbaikan), [
            'jenis_pelaksana' => 'vendor',
            'id_vendor' => $vendor->id_vendor,
            'harga_penawaran' => 1250000,
            'catatan' => 'Butuh penggantian panel resmi vendor',
        ])->assertRedirect(route('perbaikan.index'));

        $itemPerbaikan->refresh();
        $asetA->refresh();
        $this->assertTrue($itemPerbaikan->perlu_vendor);
        $this->assertEquals($vendor->id_vendor, $itemPerbaikan->id_vendor);
        $this->assertNull($itemPerbaikan->id_teknisi);
        $this->assertEquals('dalam_perbaikan', $itemPerbaikan->status_perbaikan);
        $this->assertEquals('dalam_perbaikan', $asetA->status_aset);

        // 5. Operator mencatat penyelesaian vendor dengan kondisi akhir 'baik'
        $this->actingAs($operator)->post(route('perbaikan.selesai-vendor', $itemPerbaikan->id_item_perbaikan), [
            'hasil_perbaikan' => 'Panel layar telah diganti unit baru oleh vendor',
            'biaya_aktual' => 1200000,
            'kondisi_akhir' => 'baik',
        ])->assertRedirect(route('perbaikan.index', ['tab' => 'selesai']));

        $itemPerbaikan->refresh();
        $asetA->refresh();
        $this->assertEquals('selesai', $itemPerbaikan->status_perbaikan);
        $this->assertEquals('selesai', $itemPerbaikan->pengajuan->status);
        $this->assertEquals('aktif', $asetA->status_aset);
        $this->assertEquals('baik', $asetA->kondisi);
    }

    public function test_teknisi_dapat_menentukan_kondisi_akhir_aset_saat_selesai_perbaikan(): void
    {
        [, , $ruangan] = $this->buatUnitDanRuangan('Departemen SI', '101');
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $ruangan->id_unit]);
        $teknisi = $this->akun(PeranNama::TEKNISI);

        $aset1 = $this->buatAsetDiRuangan($ruangan, $pemohon, 'kurang_baik', 'dalam_perbaikan');
        $aset2 = $this->buatAsetDiRuangan($ruangan, $pemohon, 'kurang_baik', 'dalam_perbaikan');

        $p1 = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'PRB-2026-0101',
            'jenis_pengajuan' => 'perbaikan',
            'tanggal_pengajuan' => now(),
            'status' => 'diproses',
        ]);
        $ip1 = ItemPerbaikan::query()->create([
            'id_pengajuan' => $p1->id_pengajuan,
            'id_aset' => $aset1->id_aset,
            'id_teknisi' => $teknisi->id_pengguna,
            'deskripsi_kerusakan' => 'Motherboard korslet berat',
            'status_perbaikan' => 'dalam_perbaikan',
        ]);

        // Kasus A: Teknisi menyatakan tidak ekonomis diperbaiki -> kondisi_akhir = rusak_berat
        $this->actingAs($teknisi)->post(route('teknisi.tugas.update', $ip1->id_item_perbaikan), [
            'status_perbaikan' => 'selesai',
            'hasil_pemeriksaan' => 'IC power dan chipset utama terbakar permanen',
            'hasil_perbaikan' => 'Tidak layak diperbaiki karena biaya melebihi harga aset; direkomendasikan penghapusan',
            'kondisi_akhir' => 'rusak_berat',
        ])->assertRedirect(route('teknisi.tugas', ['tab' => 'perbaikan']));

        $aset1->refresh();
        $this->assertEquals('aktif', $aset1->status_aset);
        $this->assertEquals('rusak_berat', $aset1->kondisi);

        // Kasus B: Teknisi memperbaiki parsial -> kondisi_akhir = kurang_baik
        $p2 = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'PRB-2026-0102',
            'jenis_pengajuan' => 'perbaikan',
            'tanggal_pengajuan' => now(),
            'status' => 'diproses',
        ]);
        $ip2 = ItemPerbaikan::query()->create([
            'id_pengajuan' => $p2->id_pengajuan,
            'id_aset' => $aset2->id_aset,
            'id_teknisi' => $teknisi->id_pengguna,
            'deskripsi_kerusakan' => 'Baterai drop',
            'status_perbaikan' => 'dalam_perbaikan',
        ]);

        $this->actingAs($teknisi)->post(route('teknisi.tugas.update', $ip2->id_item_perbaikan), [
            'status_perbaikan' => 'selesai',
            'hasil_perbaikan' => 'Berfungsi normal saat terhubung adaptor daya langsung',
            'kondisi_akhir' => 'kurang_baik',
        ])->assertRedirect(route('teknisi.tugas', ['tab' => 'perbaikan']));

        $aset2->refresh();
        $this->assertEquals('aktif', $aset2->status_aset);
        $this->assertEquals('kurang_baik', $aset2->kondisi);
    }
}
