<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\Dokumen;
use App\Models\Gedung;
use App\Models\ItemMutasi;
use App\Models\KategoriAset;
use App\Models\Pengajuan;
use App\Models\PenempatanAset;
use App\Models\Peran;
use App\Models\RiwayatStatusPengajuan;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MutasiAsetTest extends TestCase
{
    use RefreshDatabase;

    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }

    private function buatRuangan(string $namaRuangan = 'Laboratorium Komputer', string $nomorRuangan = 'LAB-201', ?Unit $unit = null): Ruangan
    {
        $gedung = Gedung::query()->firstOrCreate(
            ['nama_gedung' => 'Gedung FTI'],
            ['kode_gedung' => 'FTI-A']
        );

        $unit = $unit ?? Unit::query()->firstOrCreate(
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
            'nomor_ruangan' => $nomorRuangan,
            'nama_ruangan' => $namaRuangan,
            'lantai' => 2,
        ]);
    }

    private function buatAsetAktif(Ruangan $ruangan, User $penanggungJawab): Aset
    {
        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KAT-PC'],
            ['nama_kategori' => 'Peralatan Komputer', 'masa_manfaat_tahun' => 4]
        );

        $tahun = date('Y');
        $kodeAset = 'FTI-' . $tahun . '-' . str_pad((string) rand(1000, 9999), 4, '0', STR_PAD_LEFT);

        $aset = Aset::query()->create([
            'id_kategori' => $kategori->id_kategori,
            'kode_aset' => $kodeAset,
            'nama_barang' => 'PC All-in-One Core i7',
            'spesifikasi' => 'Intel Core i7, 16GB RAM',
            'tahun_perolehan' => (int) $tahun,
            'harga_perolehan' => 15000000,
            'kondisi' => 'baik',
            'status_aset' => 'aktif',
        ]);

        PenempatanAset::query()->create([
            'id_aset' => $aset->id_aset,
            'id_ruangan' => $ruangan->id_ruangan,
            'id_pengguna_pj' => $penanggungJawab->id_pengguna,
            'id_item_mutasi' => null,
            'tanggal_mulai' => now()->subMonths(6),
            'tanggal_selesai' => null,
            'keterangan' => 'Penempatan awal',
        ]);

        return $aset;
    }

    public function test_akses_halaman_mutasi_sesuai_peran(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);
        $pegawai = $this->akun(PeranNama::PEGAWAI);

        // Pemohon dapat membuka formulir pengajuan mutasi
        $this->actingAs($pemohon)
            ->get(route('pemohon.mutasi'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mutasi/Create'));

        // Operator dapat membuka meja kerja mutasi
        $this->actingAs($operator)
            ->get(route('mutasi.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mutasi/Index'));

        // Pegawai tidak dapat mengakses halaman mutasi pemohon/operator
        $this->actingAs($pegawai)
            ->get(route('pemohon.mutasi'))
            ->assertForbidden();

        $this->actingAs($pegawai)
            ->get(route('mutasi.index'))
            ->assertForbidden();
    }

    public function test_pemohon_dapat_menyimpan_draf_mutasi_tanpa_lampiran(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $ruanganAsal = $this->buatRuangan('Lab Pemrograman', 'LAB-101', $unit);
        $ruanganTujuan = $this->buatRuangan('Ruang Dosen TI', 'DSN-201', $unit);
        $aset = $this->buatAsetAktif($ruanganAsal, $pemohon);

        $payload = [
            'aksi' => 'draft',
            'perihal' => 'Draf Usulan Pemindahan Komputer',
            'jenis_mutasi' => 'Antarruangan dalam fakultas',
            'tanggal_mutasi' => now()->addDays(3)->toDateString(),
            'alasan_mutasi' => 'Pemindahan aset untuk persiapan semester baru',
            'items' => [
                [
                    'id_aset' => $aset->id_aset,
                    'id_ruangan_tujuan' => $ruanganTujuan->id_ruangan,
                    'id_pengguna_pj_tujuan' => null,
                ],
            ],
        ];

        $response = $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.mutasi.store'), $payload);

        $pengajuan = Pengajuan::where('id_pemohon', $pemohon->id_pengguna)
            ->where('jenis_pengajuan', 'mutasi')
            ->first();

        $this->assertNotNull($pengajuan);
        $this->assertEquals('draft', $pengajuan->status);
        $this->assertStringStartsWith('MTS-', $pengajuan->nomor_pengajuan);
        $this->assertCount(1, $pengajuan->itemMutasi);
        $this->assertEquals($ruanganTujuan->id_ruangan, $pengajuan->itemMutasi->first()->id_ruangan_tujuan);

        $response->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan));
    }

    public function test_pemohon_wajib_lampiran_dan_ruangan_berbeda_saat_mengirim_mutasi(): void
    {
        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $ruanganAsal = $this->buatRuangan('Lab Pemrograman', 'LAB-101', $unit);
        $ruanganTujuan = $this->buatRuangan('Ruang Dosen TI', 'DSN-201', $unit);
        $aset = $this->buatAsetAktif($ruanganAsal, $pemohon);

        // 1. Gagal jika kirim (diajukan) tanpa berkas lampiran
        $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.mutasi.store'), [
                'aksi' => 'diajukan',
                'perihal' => 'Usulan Mutasi PC',
                'jenis_mutasi' => 'Antarruangan dalam fakultas',
                'tanggal_mutasi' => now()->toDateString(),
                'alasan_mutasi' => 'Kebutuhan mendesak',
                'items' => [
                    [
                        'id_aset' => $aset->id_aset,
                        'id_ruangan_tujuan' => $ruanganTujuan->id_ruangan,
                    ],
                ],
            ])
            ->assertSessionHasErrors(['lampiran']);

        // 2. Gagal jika ruangan tujuan sama dengan ruangan asal tanpa pergantian penanggung jawab
        Storage::fake('public');
        $berkas = UploadedFile::fake()->create('surat_persetujuan.pdf', 200, 'application/pdf');

        $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.mutasi.store'), [
                'aksi' => 'diajukan',
                'perihal' => 'Usulan Mutasi PC Sama Ruangan',
                'jenis_mutasi' => 'Antarruangan dalam fakultas',
                'tanggal_mutasi' => now()->toDateString(),
                'alasan_mutasi' => 'Uji coba',
                'lampiran' => [$berkas],
                'items' => [
                    [
                        'id_aset' => $aset->id_aset,
                        'id_ruangan_tujuan' => $ruanganAsal->id_ruangan, // Sama dengan asal!
                        'id_pengguna_pj_tujuan' => null,
                    ],
                ],
            ])
            ->assertSessionHasErrors(['items.0.id_ruangan_tujuan']);

        // 3. Berhasil jika lengkap berkas dan ruangan tujuan valid
        $response = $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.mutasi.store'), [
                'aksi' => 'diajukan',
                'perihal' => 'Usulan Mutasi PC Valid',
                'jenis_mutasi' => 'Antarruangan dalam fakultas',
                'tanggal_mutasi' => now()->toDateString(),
                'alasan_mutasi' => 'Kebutuhan mendesak di ruang dosen',
                'lampiran' => [$berkas],
                'items' => [
                    [
                        'id_aset' => $aset->id_aset,
                        'id_ruangan_tujuan' => $ruanganTujuan->id_ruangan,
                        'id_pengguna_pj_tujuan' => null,
                    ],
                ],
            ]);

        $pengajuan = Pengajuan::where('id_pemohon', $pemohon->id_pengguna)
            ->where('status', 'diajukan')
            ->first();

        $this->assertNotNull($pengajuan);
        $this->assertEquals('diajukan', $pengajuan->status);
        $this->assertCount(1, $pengajuan->dokumen);
        $response->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan));
    }

    public function test_alur_lengkap_mutasi_sampai_eksekusi_operator(): void
    {
        Storage::fake('public');

        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $operator = $this->akun(PeranNama::OPERATOR);
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pjBaru = $this->akun(PeranNama::PEGAWAI);

        $ruanganAsal = $this->buatRuangan('Lab Pemrograman', 'LAB-101', $unit);
        $ruanganTujuan = $this->buatRuangan('Ruang Server FTI', 'SRV-01', $unit);
        $aset = $this->buatAsetAktif($ruanganAsal, $pemohon);

        // 1. Pemohon Mengajukan Mutasi
        $berkas = UploadedFile::fake()->create('memo_mutasi.pdf', 300, 'application/pdf');

        $this->actingAs($pemohon)->post(route('pemohon.pengajuan.mutasi.store'), [
            'aksi' => 'diajukan',
            'perihal' => 'Pemindahan Server ke Ruang Server',
            'jenis_mutasi' => 'Antarruangan dalam fakultas',
            'tanggal_mutasi' => now()->toDateString(),
            'alasan_mutasi' => 'Konsolidasi infrastruktur server',
            'lampiran' => [$berkas],
            'items' => [
                [
                    'id_aset' => $aset->id_aset,
                    'id_ruangan_tujuan' => $ruanganTujuan->id_ruangan,
                    'id_pengguna_pj_tujuan' => $pjBaru->id_pengguna,
                ],
            ],
        ]);

        $pengajuan = Pengajuan::where('id_pemohon', $pemohon->id_pengguna)->first();
        $this->assertEquals('diajukan', $pengajuan->status);

        // 2. Operator Memeriksa Berkas
        $this->actingAs($operator)->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
            'keputusan' => 'teruskan',
            'catatan' => 'Berkas lengkap dan sesuai prosedur',
        ]);

        $pengajuan->refresh();
        $this->assertEquals('diajukan', $pengajuan->status);

        // 3. Kepala Kantor Merekomendasikan
        $this->actingAs($kepalaKantor)->post(route('kepala-kantor.pengajuan.proses', $pengajuan->id_pengajuan), [
            'keputusan' => 'rekomendasikan',
            'catatan' => 'Disetujui untuk diteruskan ke pimpinan',
        ]);

        $pengajuan->refresh();
        $this->assertEquals('disetujui_kadep', $pengajuan->status);

        // 4. Pimpinan Menyetujui
        $this->actingAs($pimpinan)->post(route('pimpinan.persetujuan.proses', $pengajuan->id_pengajuan), [
            'keputusan' => 'setujui',
            'catatan' => 'Silakan segera dieksekusi pemindahannya',
        ]);

        $pengajuan->refresh();
        $this->assertEquals('disetujui_pimpinan', $pengajuan->status);

        // 5. Operator Mengeksekusi Mutasi di /mutasi/{pengajuan}/proses
        $itemMutasi = $pengajuan->itemMutasi->first();
        $tanggalEksekusi = now()->toDateString();

        $response = $this->actingAs($operator)->post(route('mutasi.proses', $pengajuan->id_pengajuan), [
            'tanggal_eksekusi' => $tanggalEksekusi,
            'nomor_disposisi' => 'DSP-FTI-2026-001',
            'catatan_mutasi' => 'Fisik barang telah dipindahkan ke rak server A-1',
            'items' => [
                [
                    'id_item_mutasi' => $itemMutasi->id_item_mutasi,
                    'id_ruangan_tujuan' => $ruanganTujuan->id_ruangan,
                    'id_pengguna_pj_tujuan' => $pjBaru->id_pengguna,
                ],
            ],
        ]);

        $response->assertRedirect(route('mutasi.index'));

        // 6. Verifikasi Integritas Database Setelah Eksekusi
        $pengajuan->refresh();
        $this->assertEquals('selesai', $pengajuan->status);

        // Penempatan lama harus berstatus selesai (tanggal_selesai != null)
        $penempatanLama = PenempatanAset::where('id_aset', $aset->id_aset)
            ->where('id_ruangan', $ruanganAsal->id_ruangan)
            ->first();

        $this->assertNotNull($penempatanLama);
        $this->assertNotNull($penempatanLama->tanggal_selesai);

        // Penempatan baru harus aktif (tanggal_selesai == null)
        $penempatanBaru = PenempatanAset::where('id_aset', $aset->id_aset)
            ->where('id_ruangan', $ruanganTujuan->id_ruangan)
            ->whereNull('tanggal_selesai')
            ->first();

        $this->assertNotNull($penempatanBaru);
        $this->assertEquals($pjBaru->id_pengguna, $penempatanBaru->id_pengguna_pj);
        $this->assertEquals($itemMutasi->id_item_mutasi, $penempatanBaru->id_item_mutasi);
        $this->assertStringContainsString('DSP-FTI-2026-001', $penempatanBaru->keterangan);
    }

    public function test_pemohon_dapat_mengedit_draf_mutasi_dan_kirim_ulang(): void
    {
        Storage::fake('public');

        $unit = Unit::query()->create(['nama_unit' => 'Departemen TI', 'jenis_unit' => 'departemen']);
        $pemohon = $this->akun(PeranNama::PEMOHON, ['id_unit' => $unit->id_unit]);
        $ruanganAsal = $this->buatRuangan('Lab Pemrograman', 'LAB-101', $unit);
        $ruanganTujuanAwal = $this->buatRuangan('Ruang Baca', 'RBC-01', $unit);
        $ruanganTujuanBaru = $this->buatRuangan('Ruang Sidang', 'RS-01', $unit);
        $aset = $this->buatAsetAktif($ruanganAsal, $pemohon);

        // Simpan draf awal
        $this->actingAs($pemohon)->post(route('pemohon.pengajuan.mutasi.store'), [
            'aksi' => 'draft',
            'perihal' => 'Draf Usulan Awal',
            'jenis_mutasi' => 'Antarruangan dalam fakultas',
            'tanggal_mutasi' => now()->toDateString(),
            'alasan_mutasi' => 'Alasan awal',
            'items' => [
                [
                    'id_aset' => $aset->id_aset,
                    'id_ruangan_tujuan' => $ruanganTujuanAwal->id_ruangan,
                ],
            ],
        ]);

        $pengajuan = Pengajuan::where('id_pemohon', $pemohon->id_pengguna)->first();

        // Pemohon membuka formulir edit
        $this->actingAs($pemohon)
            ->get(route('pemohon.mutasi.edit', $pengajuan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mutasi/Edit'));

        // Pemohon memperbarui draf dan mengirimkan (diajukan) dengan melampirkan berkas
        $berkas = UploadedFile::fake()->create('dokumen_revisi.pdf', 250, 'application/pdf');

        $this->actingAs($pemohon)->put(route('pemohon.mutasi.update', $pengajuan->id_pengajuan), [
            'aksi' => 'diajukan',
            'perihal' => 'Usulan Mutasi Hasil Perbaikan',
            'jenis_mutasi' => 'Antarruangan dalam fakultas',
            'tanggal_mutasi' => now()->addDays(2)->toDateString(),
            'alasan_mutasi' => 'Alasan yang sudah direvisi dan disetujui',
            'lampiran' => [$berkas],
            'items' => [
                [
                    'id_aset' => $aset->id_aset,
                    'id_ruangan_tujuan' => $ruanganTujuanBaru->id_ruangan,
                ],
            ],
        ])->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan));

        $pengajuan->refresh();
        $this->assertEquals('diajukan', $pengajuan->status);
        $this->assertStringContainsString('Hasil Perbaikan', $pengajuan->keterangan);
        $this->assertEquals($ruanganTujuanBaru->id_ruangan, $pengajuan->itemMutasi->first()->id_ruangan_tujuan);
    }
}
