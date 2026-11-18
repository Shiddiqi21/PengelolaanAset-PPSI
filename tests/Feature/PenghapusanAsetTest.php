<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\Dokumen;
use App\Models\Gedung;
use App\Models\ItemPenghapusan;
use App\Models\KategoriAset;
use App\Models\Pengajuan;
use App\Models\PenempatanAset;
use App\Models\Peran;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PenghapusanAsetTest extends TestCase
{
    use RefreshDatabase;

    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }

    private function buatRuangan(string $namaRuangan = 'Ruang Laboratorium Jaringan', string $nomorRuangan = 'LAB-301', ?Unit $unit = null): Ruangan
    {
        $gedung = Gedung::query()->firstOrCreate(
            ['nama_gedung' => 'Gedung FTI'],
            ['kode_gedung' => 'FTI-B']
        );

        $unit = $unit ?? Unit::query()->firstOrCreate(
            ['nama_unit' => 'Departemen Sistem Informasi'],
            ['jenis_unit' => 'departemen']
        );

        $subUnit = SubUnit::query()->firstOrCreate(
            ['id_unit' => $unit->id_unit, 'nama_sub_unit' => 'Laboratorium Jaringan'],
            ['jenis_sub_unit' => 'lab']
        );

        return Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'nomor_ruangan' => $nomorRuangan,
            'nama_ruangan' => $namaRuangan,
            'lantai' => 3,
        ]);
    }

    private function buatAsetAktif(Ruangan $ruangan, User $penanggungJawab, string $kondisi = 'rusak_berat'): Aset
    {
        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KAT-SRV'],
            ['nama_kategori' => 'Server & Jaringan', 'masa_manfaat_tahun' => 5]
        );

        $tahun = (int) date('Y') - 6;
        $kodeAset = 'FTI-' . $tahun . '-' . str_pad((string) rand(1000, 9999), 4, '0', STR_PAD_LEFT);

        $aset = Aset::query()->create([
            'id_kategori' => $kategori->id_kategori,
            'kode_aset' => $kodeAset,
            'nama_barang' => 'Switch Cisco Catalyst 2960',
            'spesifikasi' => '24 Port Gigabit Switch, Mati Total Terbakar Petir',
            'tahun_perolehan' => $tahun,
            'harga_perolehan' => 12500000,
            'kondisi' => $kondisi,
            'status_aset' => 'aktif',
        ]);

        PenempatanAset::query()->create([
            'id_aset' => $aset->id_aset,
            'id_ruangan' => $ruangan->id_ruangan,
            'id_pengguna_pj' => $penanggungJawab->id_pengguna,
            'id_item_mutasi' => null,
            'tanggal_mulai' => now()->subYears(3),
            'tanggal_selesai' => null,
            'keterangan' => 'Penempatan operasional awal',
        ]);

        return $aset;
    }

    public function test_akses_halaman_penghapusan_sesuai_peran(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);
        $pegawai = $this->akun(PeranNama::PEGAWAI);

        // 1. Pemohon dapat membuka formulir buat usulan penghapusan
        $this->actingAs($pemohon)
            ->get(route('pemohon.penghapusan'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Penghapusan/Create'));

        // 2. Operator dapat membuka meja kerja pemrosesan penghapusan
        $this->actingAs($operator)
            ->get(route('penghapusan.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Penghapusan/Index'));

        // 3. Pegawai tidak berhak membuka formulir penghapusan pemohon / meja kerja operator (403)
        $this->actingAs($pegawai)
            ->get(route('pemohon.penghapusan'))
            ->assertForbidden();

        $this->actingAs($pegawai)
            ->get(route('penghapusan.index'))
            ->assertForbidden();
    }

    public function test_pemohon_dapat_menyimpan_draft_penghapusan_tanpa_dokumen(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $ruangan = $this->buatRuangan('Lab Jaringan', 'LAB-301', $unit);
        $aset = $this->buatAsetAktif($ruangan, $pemohon);

        $response = $this->actingAs($pemohon)->post(route('pemohon.pengajuan.penghapusan.store'), [
            'aksi' => 'draft',
            'perihal' => 'Draf Usulan Penghapusan Switch Rusak',
            'dasar_usulan' => 'Rusak berat / tidak ekonomis',
            'alasan_penghapusan' => 'Perangkat sudah berumur lebih dari 6 tahun dan rusak total terbakar petir.',
            'items' => [
                ['id_aset' => $aset->id_aset],
            ],
        ]);

        $pengajuan = Pengajuan::query()->where('id_pemohon', $pemohon->id_pengguna)->first();

        $this->assertNotNull($pengajuan);
        $this->assertEquals('penghapusan', $pengajuan->jenis_pengajuan);
        $this->assertEquals('draft', $pengajuan->status);
        $this->assertStringStartsWith('HPS-', $pengajuan->nomor_pengajuan);
        $this->assertCount(1, $pengajuan->itemPenghapusan);
        $this->assertEquals($aset->id_aset, $pengajuan->itemPenghapusan->first()->id_aset);
        $this->assertCount(0, $pengajuan->dokumen);

        $response->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan));
        $response->assertSessionHas('status', 'Draf usulan penghapusan aset berhasil disimpan.');
    }

    public function test_pemohon_wajib_lampirkan_dokumen_saat_langsung_mengajukan_penghapusan(): void
    {
        Storage::fake('public');

        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $ruangan = $this->buatRuangan('Lab Jaringan', 'LAB-301', $unit);
        $aset = $this->buatAsetAktif($ruangan, $pemohon);

        // 1. Tanpa berkas ditolak jika aksi === 'diajukan'
        $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.penghapusan.store'), [
                'aksi' => 'diajukan',
                'perihal' => 'Usulan Penghapusan Switch Rusak',
                'dasar_usulan' => 'Rusak berat / tidak ekonomis',
                'alasan_penghapusan' => 'Rusak terbakar',
                'items' => [
                    ['id_aset' => $aset->id_aset],
                ],
            ])
            ->assertSessionHasErrors(['lampiran']);

        // 2. Dengan berkas berhasil diajukan
        $berkas = UploadedFile::fake()->create('foto_kondisi_rusak.jpg', 300, 'image/jpeg');

        $response = $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.penghapusan.store'), [
                'aksi' => 'diajukan',
                'perihal' => 'Usulan Penghapusan Switch Rusak Terbakar',
                'dasar_usulan' => 'Rusak berat / tidak ekonomis',
                'alasan_penghapusan' => 'Komponen terbakar petir dan perbaikan melebihi 70% harga baru.',
                'lampiran' => [$berkas],
                'items' => [
                    ['id_aset' => $aset->id_aset],
                ],
            ]);

        $pengajuan = Pengajuan::query()->where('id_pemohon', $pemohon->id_pengguna)->where('status', 'diajukan')->first();

        $this->assertNotNull($pengajuan);
        $this->assertEquals('diajukan', $pengajuan->status);
        $this->assertCount(1, $pengajuan->dokumen);
        $response->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan));
    }

    public function test_pemohon_dapat_mengedit_draft_penghapusan_dan_mengirimkannya(): void
    {
        Storage::fake('public');

        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $ruangan = $this->buatRuangan('Lab Jaringan', 'LAB-301', $unit);
        $aset1 = $this->buatAsetAktif($ruangan, $pemohon);
        $aset2 = $this->buatAsetAktif($ruangan, $pemohon);

        // Buat draf awal
        $this->actingAs($pemohon)->post(route('pemohon.pengajuan.penghapusan.store'), [
            'aksi' => 'draft',
            'perihal' => 'Draf Usulan Awal',
            'dasar_usulan' => 'Rusak berat / tidak ekonomis',
            'alasan_penghapusan' => 'Keterangan awal',
            'items' => [
                ['id_aset' => $aset1->id_aset],
            ],
        ]);

        $pengajuan = Pengajuan::query()->where('id_pemohon', $pemohon->id_pengguna)->first();
        $this->assertEquals('draft', $pengajuan->status);

        // Buka halaman edit
        $this->actingAs($pemohon)
            ->get(route('pemohon.penghapusan.edit', $pengajuan->id_pengajuan))
            ->assertOk();

        // Update draf menjadi diajukan dengan menambah aset2 dan melampirkan berkas
        $berkas = UploadedFile::fake()->create('surat_usulan.pdf', 200, 'application/pdf');

        $this->actingAs($pemohon)
            ->put(route('pemohon.penghapusan.update', $pengajuan->id_pengajuan), [
                'aksi' => 'diajukan',
                'perihal' => 'Usulan Penghapusan Final 2 Unit',
                'dasar_usulan' => 'Kedaluwarsa / mati fungsi',
                'alasan_penghapusan' => 'Kedua unit mati total.',
                'lampiran' => [$berkas],
                'items' => [
                    ['id_aset' => $aset1->id_aset],
                    ['id_aset' => $aset2->id_aset],
                ],
            ])
            ->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan));

        $pengajuan->refresh();
        $this->assertEquals('diajukan', $pengajuan->status);
        $this->assertCount(2, $pengajuan->itemPenghapusan);
        $this->assertCount(1, $pengajuan->dokumen);
    }

    public function test_kirim_draft_gagal_jika_belum_ada_dokumen_lampiran(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $ruangan = $this->buatRuangan('Lab Jaringan', 'LAB-301', $unit);
        $aset = $this->buatAsetAktif($ruangan, $pemohon);

        // Buat draf tanpa dokumen
        $this->actingAs($pemohon)->post(route('pemohon.pengajuan.penghapusan.store'), [
            'aksi' => 'draft',
            'perihal' => 'Draf Tanpa Dokumen',
            'dasar_usulan' => 'Rusak berat / tidak ekonomis',
            'alasan_penghapusan' => 'Alasan draft',
            'items' => [
                ['id_aset' => $aset->id_aset],
            ],
        ]);

        $pengajuan = Pengajuan::query()->where('id_pemohon', $pemohon->id_pengguna)->first();
        $this->assertEquals('draft', $pengajuan->status);

        // Coba kirim via kirimDraft endpoint
        $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.kirim', $pengajuan->id_pengajuan))
            ->assertSessionHasErrors(['status']);

        $pengajuan->refresh();
        $this->assertEquals('draft', $pengajuan->status);
    }

    public function test_eksekusi_penghapusan_jalur_sharing_internal(): void
    {
        Storage::fake('public');

        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pimpinan = $this->akun(PeranNama::PIMPINAN);

        $ruangan = $this->buatRuangan('Lab Jaringan', 'LAB-301', $unit);
        $aset = $this->buatAsetAktif($ruangan, $pemohon);

        // 1. Pengajuan oleh pemohon
        $berkas = UploadedFile::fake()->create('usulan_sharing.pdf', 300, 'application/pdf');
        $this->actingAs($pemohon)->post(route('pemohon.pengajuan.penghapusan.store'), [
            'aksi' => 'diajukan',
            'perihal' => 'Penghapusan Switch untuk Hibah Internal',
            'dasar_usulan' => 'Rusak berat / tidak ekonomis',
            'alasan_penghapusan' => 'Dapat dimanfaatkan kanibalisme komponen oleh Lab Komputer Dasar.',
            'lampiran' => [$berkas],
            'items' => [
                ['id_aset' => $aset->id_aset],
            ],
        ]);

        $pengajuan = Pengajuan::query()->where('id_pemohon', $pemohon->id_pengguna)->first();

        // 2. Verifikasi Operator
        $this->actingAs($operator)->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
            'keputusan' => 'teruskan',
            'catatan' => 'Berkas dan kondisi fisik telah diperiksa operator.',
        ]);

        // 3. Rekomendasi Kepala Kantor
        $this->actingAs($kepalaKantor)->post(route('kepala-kantor.pengajuan.proses', $pengajuan->id_pengajuan), [
            'keputusan' => 'rekomendasikan',
            'catatan' => 'Direkomendasikan untuk sharing internal.',
        ]);

        // 4. Persetujuan Pimpinan
        $this->actingAs($pimpinan)->post(route('pimpinan.persetujuan.proses', $pengajuan->id_pengajuan), [
            'keputusan' => 'setujui',
            'catatan' => 'Disetujui untuk dialihkan ke Lab Komputer Dasar.',
        ]);

        $pengajuan->refresh();
        $this->assertEquals('disetujui_pimpinan', $pengajuan->status);

        // 5. Validasi: Operator eksekusi sharing internal tanpa pihak_penerima harus gagal
        $this->actingAs($operator)->post(route('penghapusan.proses', $pengajuan->id_pengajuan), [
            'jalur_penghapusan' => 'sharing_internal',
            'tanggal_penghapusan' => now()->toDateString(),
            'pihak_penerima' => '',
        ])->assertSessionHasErrors(['pihak_penerima']);

        // 6. Eksekusi sukses dengan pihak_penerima
        $skRektor = UploadedFile::fake()->create('sk_sharing.pdf', 250, 'application/pdf');

        $this->actingAs($operator)->post(route('penghapusan.proses', $pengajuan->id_pengajuan), [
            'jalur_penghapusan' => 'sharing_internal',
            'tanggal_penghapusan' => now()->toDateString(),
            'pihak_penerima' => 'Laboratorium Komputer Dasar FMIPA UNAND',
            'nomor_persetujuan_rektor' => '89/UN16.R/TU/2026',
            'dokumen_sk' => $skRektor,
        ])->assertRedirect(route('penghapusan.index'))
            ->assertSessionHas('status');

        $pengajuan->refresh();
        $this->assertEquals('selesai', $pengajuan->status);

        // Cek data item_penghapusan
        $item = ItemPenghapusan::query()->where('id_pengajuan', $pengajuan->id_pengajuan)->first();
        $this->assertEquals('sharing_internal', $item->jalur_penghapusan);
        $this->assertEquals('Laboratorium Komputer Dasar FMIPA UNAND', $item->pihak_penerima);
        $this->assertStringContainsString('89/UN16.R/TU/2026', $item->catatan_tim_penilai);

        // Cek master aset
        $aset->refresh();
        $this->assertEquals('dihapus', $aset->status_aset);
        $this->assertEquals('rusak_berat', $aset->kondisi);

        // Cek penempatan aset lama ditutup
        $penempatan = PenempatanAset::query()->where('id_aset', $aset->id_aset)->first();
        $this->assertNotNull($penempatan->tanggal_selesai);
    }

    public function test_eksekusi_penghapusan_jalur_hibah_luar(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pimpinan = $this->akun(PeranNama::PIMPINAN);

        $ruangan = $this->buatRuangan('Lab Jaringan', 'LAB-301', $unit);
        $aset = $this->buatAsetAktif($ruangan, $pemohon);

        // Buat pengajuan langsung disetujui_pimpinan
        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'HPS-2026-0099',
            'jenis_pengajuan' => 'penghapusan',
            'status' => 'disetujui_pimpinan',
            'keterangan' => 'Hibah untuk SMK binaan',
            'tanggal_pengajuan' => now(),
        ]);

        ItemPenghapusan::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_aset' => $aset->id_aset,
        ]);

        // Eksekusi Operator via jalur hibah_luar
        $this->actingAs($operator)->post(route('penghapusan.proses', $pengajuan->id_pengajuan), [
            'jalur_penghapusan' => 'hibah_luar',
            'tanggal_penghapusan' => now()->toDateString(),
            'pihak_penerima' => 'SMKN 1 Pariaman',
            'nomor_persetujuan_rektor' => 'SK-HIBAH-2026-01',
        ])->assertRedirect(route('penghapusan.index'));

        $pengajuan->refresh();
        $this->assertEquals('selesai', $pengajuan->status);

        $item = ItemPenghapusan::query()->where('id_pengajuan', $pengajuan->id_pengajuan)->first();
        $this->assertEquals('hibah_luar', $item->jalur_penghapusan);
        $this->assertEquals('SMKN 1 Pariaman', $item->pihak_penerima);

        $aset->refresh();
        $this->assertEquals('dihapus', $aset->status_aset);
    }

    public function test_eksekusi_penghapusan_jalur_penjualan_lelang_validasi_dan_berhasil(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);

        $ruangan = $this->buatRuangan('Lab Jaringan', 'LAB-301', $unit);
        $aset = $this->buatAsetAktif($ruangan, $pemohon);

        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'HPS-2026-0100',
            'jenis_pengajuan' => 'penghapusan',
            'status' => 'disetujui_pimpinan',
            'keterangan' => 'Lelang besi tua dan komponen switch rusak',
            'tanggal_pengajuan' => now(),
        ]);

        ItemPenghapusan::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_aset' => $aset->id_aset,
        ]);

        // 1. Validasi: Form lelang wajib catatan peneliti, penilai, dan nilai taksiran
        $this->actingAs($operator)->post(route('penghapusan.proses', $pengajuan->id_pengajuan), [
            'jalur_penghapusan' => 'penjualan_lelang',
            'tanggal_penghapusan' => now()->toDateString(),
            'catatan_tim_peneliti' => '',
            'catatan_tim_penilai' => '',
            'nilai_taksiran' => '',
        ])->assertSessionHasErrors(['catatan_tim_peneliti', 'catatan_tim_penilai', 'nilai_taksiran']);

        // 2. Berhasil dieksekusi dengan kelengkapan data lelang
        $this->actingAs($operator)->post(route('penghapusan.proses', $pengajuan->id_pengajuan), [
            'jalur_penghapusan' => 'penjualan_lelang',
            'tanggal_penghapusan' => now()->toDateString(),
            'catatan_tim_peneliti' => 'Fisik hancur dan nilai sisa scrap',
            'catatan_tim_penilai' => 'Taksiran harga wajar lelang scrap',
            'nilai_taksiran' => 500000,
            'nomor_persetujuan_rektor' => 'SK-LELANG-2026-88',
        ])->assertRedirect(route('penghapusan.index'))
            ->assertSessionHas('status');

        $pengajuan->refresh();
        $this->assertEquals('selesai', $pengajuan->status);

        $item = ItemPenghapusan::query()->where('id_pengajuan', $pengajuan->id_pengajuan)->first();
        $this->assertEquals('penjualan_lelang', $item->jalur_penghapusan);
        $this->assertEquals(500000, (int) $item->nilai_penjualan);
        $this->assertStringContainsString('Fisik hancur', $item->catatan_tim_penilai);
        $this->assertStringContainsString('Taksiran harga wajar', $item->catatan_tim_penilai);

        $aset->refresh();
        $this->assertEquals('dihapus', $aset->status_aset);
        $this->assertEquals('rusak_berat', $aset->kondisi);
    }
}
