<?php

namespace Tests\Feature;

use App\Models\Gedung;
use App\Models\KategoriAset;
use App\Models\Peran;
use App\Models\Ruangan;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PengadaanTest extends TestCase
{
    use RefreshDatabase;

    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }

    public function test_pemohon_can_view_create_pengadaan_page(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);

        KategoriAset::query()->create([
            'kode_kategori' => 'KAT-TI',
            'nama_kategori' => 'Peralatan Komputer',
            'masa_manfaat_tahun' => 4,
        ]);

        $this->actingAs($pemohon)
            ->get('/pemohon/pengajuan/pengadaan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengadaan/Create')
                ->has('pemohon')
                ->has('kategoriAset')
                ->has('ruangan')
            );
    }

    public function test_non_pemohon_cannot_access_create_pengadaan_page(): void
    {
        $teknisi = $this->akun(PeranNama::TEKNISI);

        $this->actingAs($teknisi)
            ->get('/pemohon/pengajuan/pengadaan')
            ->assertForbidden();
    }

    public function test_pemohon_can_save_pengadaan_as_draft(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);

        $kategori = KategoriAset::query()->create([
            'kode_kategori' => 'KAT-01',
            'nama_kategori' => 'Elektronik Kantor',
            'masa_manfaat_tahun' => 5,
        ]);

        $payload = [
            'aksi' => 'draft',
            'perihal' => 'Draf Usulan Laptop Pengajar',
            'sumber_dana' => 'RKAT FTI 2026',
            'alasan' => 'Laptop pengajar lama mengalami kerusakan motherboard.',
            'items' => [
                [
                    'id_kategori' => $kategori->id_kategori,
                    'nama_barang' => 'Laptop Core i5 16GB',
                    'spesifikasi' => 'RAM 16GB, SSD 512GB, Layar 14 inch',
                    'jumlah' => 2,
                    'harga_satuan' => 12000000,
                ],
            ],
        ];

        $this->actingAs($pemohon)
            ->post('/pemohon/pengajuan/pengadaan', $payload)
            ->assertRedirect(route('pemohon.pengajuan'))
            ->assertSessionHas('status', 'Draf pengajuan pengadaan berhasil disimpan.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pemohon' => $pemohon->id_pengguna,
            'jenis_pengajuan' => 'pengadaan',
            'status' => 'draft',
        ]);

        $this->assertDatabaseHas('item_pengadaan', [
            'nama_barang' => 'Laptop Core i5 16GB',
            'jumlah' => 2,
            'estimasi_anggaran' => 24000000,
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'status_baru' => 'draft',
            'catatan' => 'Draf pengajuan pengadaan disimpan',
        ]);
    }

    public function test_pemohon_can_submit_pengadaan_with_attachment_and_room(): void
    {
        Storage::fake('public');

        $pemohon = $this->akun(PeranNama::PEMOHON);

        $kategori = KategoriAset::query()->create([
            'kode_kategori' => 'KAT-PC',
            'nama_kategori' => 'Komputer & Jaringan',
            'masa_manfaat_tahun' => 4,
        ]);

        $unit = Unit::query()->first();
        $subUnit = SubUnit::query()->first();

        $gedung = Gedung::query()->create([
            'kode_gedung' => 'GD-FTI',
            'nama_gedung' => 'Gedung Utama FTI',
        ]);

        $ruangan = Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'lantai' => 2,
            'nomor_ruangan' => 'LAB-201',
            'nama_ruangan' => 'Laboratorium Rekayasa Perangkat Lunak',
        ]);

        $fileRab = UploadedFile::fake()->create('rab_pengadaan.pdf', 500, 'application/pdf');

        $payload = [
            'aksi' => 'diajukan',
            'perihal' => 'Pengadaan 10 PC Laboratorium RPL',
            'sumber_dana' => 'BOPTN 2026',
            'id_ruangan' => $ruangan->id_ruangan,
            'alasan' => 'Penambahan kapasitas praktikum pemrograman mahasiswa.',
            'items' => [
                [
                    'id_kategori' => $kategori->id_kategori,
                    'nama_barang' => 'PC Rakitan Core i7',
                    'spesifikasi' => 'Core i7-13700, RAM 32GB, RTX 3060, Monitor 24 inch',
                    'jumlah' => 10,
                    'harga_satuan' => 15000000,
                ],
            ],
            'lampiran' => [$fileRab],
        ];

        $response = $this->actingAs($pemohon)
            ->post('/pemohon/pengajuan/pengadaan', $payload);

        $response->assertRedirect(route('pemohon.pengajuan'))
            ->assertSessionHas('status', 'Pengajuan pengadaan berhasil dikirim.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pemohon' => $pemohon->id_pengguna,
            'jenis_pengajuan' => 'pengadaan',
            'status' => 'diajukan',
        ]);

        $this->assertDatabaseHas('item_pengadaan', [
            'nama_barang' => 'PC Rakitan Core i7',
            'jumlah' => 10,
            'estimasi_anggaran' => 150000000,
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'status_baru' => 'diajukan',
            'catatan' => 'Pengajuan pengadaan dikirim oleh pemohon',
        ]);

        $this->assertDatabaseHas('dokumen', [
            'jenis_dokumen' => 'surat_pengajuan',
            'id_pengunggah' => $pemohon->id_pengguna,
        ]);
    }

    public function test_pengadaan_requires_valid_data(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);

        $this->actingAs($pemohon)
            ->post('/pemohon/pengajuan/pengadaan', [
                'aksi' => 'diajukan',
                'perihal' => '',
                'sumber_dana' => '',
                'alasan' => '',
                'items' => [],
            ])
            ->assertSessionHasErrors(['perihal', 'sumber_dana', 'alasan', 'items']);
    }
}
