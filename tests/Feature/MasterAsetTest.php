<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\Gedung;
use App\Models\KategoriAset;
use App\Models\PenempatanAset;
use App\Models\Peran;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MasterAsetTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_can_view_master_aset_index_with_kpi_and_filters(): void
    {
        $operator = $this->akunOperator();
        $kategori = KategoriAset::query()->create([
            'kode_kategori' => 'KMP',
            'nama_kategori' => 'Komputer dan perangkat pengolah data',
            'masa_manfaat_tahun' => 4,
        ]);

        Aset::query()->create([
            'id_kategori' => $kategori->id_kategori,
            'kode_aset' => 'FTI-2024-0001',
            'nama_barang' => 'Lenovo ThinkPad E14',
            'tahun_perolehan' => 2024,
            'harga_perolehan' => 14500000,
            'kondisi' => 'baik',
            'status_aset' => 'aktif',
        ]);

        $this->actingAs($operator)
            ->get(route('aset.index', ['status' => 'aktif', 'q' => 'Lenovo']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Aset/Index')
                ->has('kpi', 4)
                ->has('aset.data', 1)
                ->where('aset.data.0.kode_aset', 'FTI-2024-0001')
                ->where('aset.data.0.kondisi_label', 'Baik'));
    }

    public function test_operator_can_create_update_and_track_placement_history_of_aset(): void
    {
        $operator = $this->akunOperator();
        $kategori = KategoriAset::query()->create([
            'kode_kategori' => 'ELK',
            'nama_kategori' => 'Peralatan elektronik',
            'masa_manfaat_tahun' => 4,
        ]);

        $gedung = Gedung::query()->create([
            'kode_gedung' => 'GFTI',
            'nama_gedung' => 'Gedung FTI',
        ]);

        $ruangan1 = Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $operator->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'lantai' => 2,
            'nomor_ruangan' => '202',
            'nama_ruangan' => 'Lab. Sistem Informasi',
        ]);

        $ruangan2 = Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $operator->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'lantai' => 2,
            'nomor_ruangan' => '203',
            'nama_ruangan' => 'Ruang Dosen SI',
        ]);

        $this->actingAs($operator)
            ->post(route('aset.store'), [
                'kode_aset' => 'FTI-2023-0042',
                'id_kategori' => $kategori->id_kategori,
                'nama_barang' => 'Proyektor Epson EB-X500',
                'merek_tipe' => 'Epson EB-X500',
                'nomor_seri' => 'SN-EPS-0042',
                'tahun_perolehan' => 2023,
                'harga_perolehan' => 8500000,
                'kondisi' => 'kurang_baik',
                'status_aset' => 'aktif',
                'id_ruangan' => $ruangan1->id_ruangan,
                'id_pengguna_pj' => $operator->id_pengguna,
                'keterangan_penempatan' => 'Penempatan awal',
            ])
            ->assertRedirect();

        $aset = Aset::query()->where('kode_aset', 'FTI-2023-0042')->firstOrFail();

        $this->assertDatabaseHas('penempatan_aset', [
            'id_aset' => $aset->id_aset,
            'id_ruangan' => $ruangan1->id_ruangan,
            'tanggal_selesai' => null,
        ]);

        // Pindah ruangan dan pembaruan kondisi dengan alasan perubahan
        $this->actingAs($operator)
            ->put(route('aset.update', $aset->id_aset), [
                'kode_aset' => 'FTI-2023-0042',
                'id_kategori' => $kategori->id_kategori,
                'nama_barang' => 'Proyektor Epson EB-X500',
                'merek_tipe' => 'Epson / EB-X500',
                'nomor_seri' => 'X5EP230042',
                'tanggal_perolehan' => '12 September 2023',
                'harga_perolehan' => 'Rp8.500.000',
                'kondisi' => 'baik',
                'status_aset' => 'aktif',
                'id_ruangan' => $ruangan2->id_ruangan,
                'id_pengguna_pj' => $operator->id_pengguna,
                'alasan_perubahan' => 'Pembaruan kondisi setelah laporan gangguan lampu proyektor, mengacu PRB-2026-0031.',
            ])
            ->assertRedirect(route('aset.show', $aset->id_aset));

        $this->assertSame(2, PenempatanAset::query()->where('id_aset', $aset->id_aset)->count());
        $this->assertSame($ruangan2->id_ruangan, $aset->fresh()->penempatanAktif->id_ruangan);

        $this->actingAs($operator)
            ->get(route('aset.show', $aset->id_aset))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Aset/Show')
                ->where('aset.kode_aset', 'FTI-2023-0042')
                ->where('aset.nup', '42'));
    }

    public function test_operator_can_export_csv(): void
    {
        $operator = $this->akunOperator();

        $this->actingAs($operator)
            ->get(route('aset.export'))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_operator_can_manage_lokasi_and_assign_room_pj(): void
    {
        $operator = $this->akunOperator();
        $gedung = Gedung::query()->create([
            'kode_gedung' => 'GFTI',
            'nama_gedung' => 'Gedung FTI',
        ]);

        $this->actingAs($operator)
            ->post(route('lokasi.store'), [
                'id_gedung' => $gedung->id_gedung,
                'id_unit' => $operator->id_unit,
                'id_sub_unit' => $operator->id_sub_unit,
                'lantai' => 2,
                'nomor_ruangan' => 'FTI-201',
                'nama_ruangan' => 'Lab. Sistem Informasi',
                'id_pengguna_pj' => $operator->id_pengguna,
            ])
            ->assertRedirect();

        $ruangan = Ruangan::query()->where('nomor_ruangan', '201')->firstOrFail();

        $this->actingAs($operator)
            ->get(route('lokasi.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Lokasi/Index')
                ->has('kpi', 4)
                ->where('ruangan.data.0.kode_ruangan', 'FTI-201')
                ->where('ruangan.data.0.nama_ruangan', 'Lab. Sistem Informasi'));

        $this->actingAs($operator)
            ->post(route('lokasi.penetapan-pj'), [
                'id_ruangan' => $ruangan->id_ruangan,
                'id_pengguna_pj' => $operator->id_pengguna,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'penetapan_pj_ruangan',
            'nama_tabel' => 'ruangan',
            'id_data' => $ruangan->id_ruangan,
        ]);
    }

    public function test_pegawai_sees_only_own_assets_and_detail(): void
    {
        $peran = Peran::query()->firstOrCreate(
            ['nama_peran' => PeranNama::PEGAWAI],
            ['deskripsi' => PeranNama::PEGAWAI]
        );
        $unit = Unit::query()->firstOrCreate(
            ['nama_unit' => 'Departemen Sistem Informasi'],
            ['jenis_unit' => 'departemen']
        );
        $subUnit = SubUnit::query()->firstOrCreate(
            ['id_unit' => $unit->id_unit, 'nama_sub_unit' => 'Lab SI'],
            ['jenis_sub_unit' => 'laboratorium']
        );

        $pegawai = User::factory()->create(['id_peran' => $peran->id_peran, 'id_unit' => $unit->id_unit, 'id_sub_unit' => $subUnit->id_sub_unit]);
        $lain = User::factory()->create(['id_peran' => $peran->id_peran, 'id_unit' => $unit->id_unit, 'id_sub_unit' => $subUnit->id_sub_unit]);

        $gedung = Gedung::query()->create(['kode_gedung' => 'GFTI', 'nama_gedung' => 'Gedung FTI']);
        $ruangan = Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'lantai' => 1,
            'nomor_ruangan' => '102',
            'nama_ruangan' => 'Ruang Dosen SI',
        ]);
        $kategori = KategoriAset::query()->create([
            'kode_kategori' => 'KMP',
            'nama_kategori' => 'Komputer',
            'masa_manfaat_tahun' => 4,
        ]);

        $buat = function (string $kode, User $pj) use ($kategori, $ruangan) {
            $aset = Aset::query()->create([
                'id_kategori' => $kategori->id_kategori,
                'kode_aset' => $kode,
                'nama_barang' => 'Barang '.$kode,
                'tahun_perolehan' => 2024,
                'harga_perolehan' => 1000000,
                'kondisi' => 'baik',
                'status_aset' => 'aktif',
            ]);
            PenempatanAset::query()->create([
                'id_aset' => $aset->id_aset,
                'id_ruangan' => $ruangan->id_ruangan,
                'id_pengguna_pj' => $pj->id_pengguna,
                'tanggal_mulai' => now(),
            ]);

            return $aset;
        };

        $milik = $buat('FTI-2024-0001', $pegawai);
        $bukanMilik = $buat('FTI-2024-0002', $lain);

        $this->actingAs($pegawai)
            ->get(route('pegawai.aset'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pegawai/Aset/Index')
                ->where('jumlahAktif', 1)
                ->has('aset.data', 1)
                ->where('aset.data.0.kode_aset', 'FTI-2024-0001'));

        $this->actingAs($pegawai)
            ->get(route('pegawai.aset.show', $milik->id_aset))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pegawai/Aset/Show')
                ->where('aset.kode_aset', 'FTI-2024-0001')
                ->has('aset.riwayat_pencatatan'));

        $this->actingAs($pegawai)
            ->get(route('pegawai.aset.show', $bukanMilik->id_aset))
            ->assertForbidden();
    }

    public function test_pemohon_can_view_daftar_aset_unit_and_detail(): void
    {
        $peranPemohon = Peran::query()->firstOrCreate(
            ['nama_peran' => PeranNama::PEMOHON],
            ['deskripsi' => PeranNama::PEMOHON]
        );

        $unit = Unit::query()->firstOrCreate(
            ['nama_unit' => 'Departemen Sistem Informasi'],
            ['jenis_unit' => 'departemen']
        );

        $subUnit = SubUnit::query()->firstOrCreate(
            ['id_unit' => $unit->id_unit, 'nama_sub_unit' => 'Lab Sistem Informasi'],
            ['jenis_sub_unit' => 'laboratorium']
        );

        $pemohon = User::factory()->create([
            'id_peran' => $peranPemohon->id_peran,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
        ]);

        $gedung = Gedung::query()->create([
            'kode_gedung' => 'GFTI',
            'nama_gedung' => 'Gedung FTI',
        ]);

        $ruangan = Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'lantai' => 2,
            'nomor_ruangan' => '201',
            'nama_ruangan' => 'Lab. Sistem Informasi',
        ]);

        $kategori = KategoriAset::query()->create([
            'kode_kategori' => 'MSN',
            'nama_kategori' => 'Peralatan dan mesin',
            'masa_manfaat_tahun' => 4,
        ]);

        $aset = Aset::query()->create([
            'id_kategori' => $kategori->id_kategori,
            'kode_aset' => 'FTI-2023-0042',
            'nama_barang' => 'Proyektor Epson EB-X500',
            'tahun_perolehan' => 2023,
            'harga_perolehan' => 8500000,
            'kondisi' => 'kurang_baik',
            'status_aset' => 'aktif',
        ]);

        PenempatanAset::query()->create([
            'id_aset' => $aset->id_aset,
            'id_ruangan' => $ruangan->id_ruangan,
            'id_pengguna_pj' => $pemohon->id_pengguna,
            'tanggal_mulai' => now(),
            'tanggal_selesai' => null,
            'keterangan' => 'Penempatan unit',
        ]);

        $this->actingAs($pemohon)
            ->get(route('pemohon.aset-unit', ['kondisi' => 'kurang_baik']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pemohon/AsetUnit/Index')
                ->has('kpi', 4)
                ->has('aset.data', 1)
                ->where('aset.data.0.kode_aset', 'FTI-2023-0042')
                ->where('aset.data.0.kondisi_label', 'Rusak ringan'));

        $this->actingAs($pemohon)
            ->get(route('pemohon.aset-unit.show', $aset->id_aset))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Aset/Show')
                ->where('modePemohon', true)
                ->where('aset.kode_aset', 'FTI-2023-0042'));
    }

    private function akunOperator(): User
    {
        $peran = Peran::query()->firstOrCreate(
            ['nama_peran' => PeranNama::OPERATOR],
            ['deskripsi' => PeranNama::OPERATOR]
        );

        $unit = Unit::query()->firstOrCreate(
            ['nama_unit' => 'Fakultas Teknologi Informasi'],
            ['jenis_unit' => 'fakultas']
        );

        $subUnit = SubUnit::query()->firstOrCreate(
            ['id_unit' => $unit->id_unit, 'nama_sub_unit' => 'Tata Usaha'],
            ['jenis_sub_unit' => 'tata_usaha']
        );

        return User::factory()->create([
            'id_peran' => $peran->id_peran,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
        ]);
    }
}
