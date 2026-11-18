<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\BeritaAcara;
use App\Models\Dokumen;
use App\Models\Gedung;
use App\Models\ItemPenerimaan;
use App\Models\ItemPengadaan;
use App\Models\KategoriAset;
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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BastTest extends TestCase
{
    use RefreshDatabase;

    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }

    private function buatPenerimaanLengkap(User $pemohon, User $operator): PenerimaanAset
    {
        $vendor = Vendor::query()->create([
            'nama_vendor' => 'PT Mitra Solusi Mandiri',
            'kontak' => '08123456789',
            'alamat' => 'Jl. Veteran No. 12 Padang',
        ]);

        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'PNG-2026-0001',
            'jenis_pengajuan' => 'pengadaan',
            'status' => 'disetujui_pimpinan',
            'keterangan' => 'Pengadaan Laptop dan Monitor',
            'tanggal_pengajuan' => now()->subDays(5),
        ]);

        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KAT-KOMP'],
            ['nama_kategori' => 'Peralatan Komputer', 'masa_manfaat_tahun' => 4]
        );

        $itemPengadaan = ItemPengadaan::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_kategori' => $kategori->id_kategori,
            'nama_barang' => 'Laptop ThinkPad T14',
            'spesifikasi' => 'Intel Core i7, 16GB RAM, 512GB SSD',
            'jumlah' => 2,
            'estimasi_anggaran' => 18000000,
        ]);

        $penerimaan = PenerimaanAset::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_vendor' => $vendor->id_vendor,
            'id_verifikator' => $operator->id_pengguna,
            'nomor_nota' => 'NOTA-2026-0001',
            'tanggal_terima' => now()->toDateString(),
            'catatan' => 'Barang diterima lengkap dan berfungsi normal',
        ]);

        ItemPenerimaan::query()->create([
            'id_penerimaan' => $penerimaan->id_penerimaan,
            'id_item_pengadaan' => $itemPengadaan->id_item_pengadaan,
            'jumlah_diterima' => 2,
            'spesifikasi_diterima' => 'Intel Core i7, 16GB RAM, 512GB SSD',
            'hasil_verifikasi' => 'sesuai',
            'catatan_kekurangan' => 'Kondisi mulus dan tersegel',
        ]);

        return $penerimaan;
    }

    public function test_akses_halaman_bast_sesuai_peran(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pegawai = $this->akun(PeranNama::PEGAWAI);

        // Operator dapat membuka meja kerja BAST
        $this->actingAs($operator)
            ->get(route('bast.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Bast/Index'));

        // Pegawai tidak diizinkan mengakses meja kerja BAST (403)
        $this->actingAs($pegawai)
            ->get(route('bast.index'))
            ->assertForbidden();
    }

    public function test_operator_dapat_menyusun_draft_bast_penerimaan(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);
        $penerimaan = $this->buatPenerimaanLengkap($pemohon, $operator);

        $response = $this->actingAs($operator)->post(route('bast.store'), [
            'jenis_bast' => 'penerimaan',
            'id_penerimaan' => $penerimaan->id_penerimaan,
            'id_pengajuan' => $penerimaan->id_pengajuan,
            'tanggal_bast' => now()->toDateString(),
            'pihak_pertama' => 'PT Mitra Solusi Mandiri (Vendor)',
            'pihak_kedua' => 'Operator BMN FTI Universitas Andalas',
            'keterangan' => 'Serah terima pengadaan laptop FTI 2026',
            'items' => [
                [
                    'id_aset' => null,
                    'kode_aset' => 'FTI-2026-9001',
                    'nama_barang' => 'Laptop ThinkPad T14',
                    'spesifikasi' => 'Intel Core i7, 16GB RAM',
                    'nomor_seri' => 'SN-TP14-9981',
                    'jumlah' => 2,
                    'satuan' => 'unit',
                    'kondisi' => 'baik',
                    'keterangan' => 'Kondisi baru tersegel',
                ],
            ],
        ]);

        $bast = BeritaAcara::query()->where('id_penerimaan', $penerimaan->id_penerimaan)->first();

        $this->assertNotNull($bast);
        $this->assertEquals('penerimaan', $bast->jenis_bast);
        $this->assertEquals('draft', $bast->status);
        $this->assertStringStartsWith('BAST-', $bast->nomor_bast);
        $this->assertEquals('PT Mitra Solusi Mandiri (Vendor)', $bast->pihak_pertama);
        $this->assertNull($bast->id_dokumen);
        $this->assertCount(1, $bast->items);
        $this->assertEquals('Laptop ThinkPad T14', $bast->items->first()->nama_barang);
        $this->assertEquals(2, $bast->items->first()->jumlah);

        $response->assertRedirect(route('bast.index'));
        $response->assertSessionHas('status');
    }

    public function test_cetak_pdf_bast_menghasilkan_dokumen_pdf(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);
        $penerimaan = $this->buatPenerimaanLengkap($pemohon, $operator);

        // Susun draf BAST
        $response = $this->actingAs($operator)->post(route('bast.store'), [
            'jenis_bast' => 'penerimaan',
            'id_penerimaan' => $penerimaan->id_penerimaan,
            'id_pengajuan' => $penerimaan->id_pengajuan,
            'tanggal_bast' => now()->toDateString(),
            'pihak_pertama' => 'PT Mitra Solusi Mandiri',
            'pihak_kedua' => 'Operator Aset FTI',
            'keterangan' => 'Uji cetak dokumen PDF',
            'items' => [
                [
                    'nama_barang' => 'Laptop ThinkPad T14',
                    'jumlah' => 2,
                    'kondisi' => 'baik',
                ],
            ],
        ]);

        $bast = BeritaAcara::query()->where('id_penerimaan', $penerimaan->id_penerimaan)->first();

        // 1. Stream PDF
        $responseStream = $this->actingAs($operator)->get(route('bast.pdf', $bast->id_bast));
        $responseStream->assertOk();
        $this->assertStringContainsString('application/pdf', $responseStream->headers->get('Content-Type'));

        // 2. Unduh PDF
        $responseUnduh = $this->actingAs($operator)->get(route('bast.pdf', ['beritaAcara' => $bast->id_bast, 'mode' => 'unduh']));
        $responseUnduh->assertOk();
        $this->assertStringContainsString('attachment', $responseUnduh->headers->get('Content-Disposition') ?? '');
    }

    public function test_operator_dapat_mengunggah_arsip_bast_bertanda_tangan(): void
    {
        Storage::fake('public');

        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);
        $penerimaan = $this->buatPenerimaanLengkap($pemohon, $operator);

        // Susun draf BAST
        $response = $this->actingAs($operator)->post(route('bast.store'), [
            'jenis_bast' => 'penerimaan',
            'id_penerimaan' => $penerimaan->id_penerimaan,
            'id_pengajuan' => $penerimaan->id_pengajuan,
            'tanggal_bast' => now()->toDateString(),
            'pihak_pertama' => 'PT Mitra Solusi Mandiri',
            'pihak_kedua' => 'Operator Aset FTI',
            'keterangan' => 'Pengadaan Laptop',
            'items' => [
                [
                    'nama_barang' => 'Laptop ThinkPad T14',
                    'jumlah' => 2,
                    'kondisi' => 'baik',
                ],
            ],
        ]);

        $bast = BeritaAcara::query()->where('id_penerimaan', $penerimaan->id_penerimaan)->first();
        $this->assertEquals('draft', $bast->status);
        $this->assertNull($bast->id_dokumen);

        // Unggah scan PDF bertanda tangan
        $scanFile = UploadedFile::fake()->create('bast_bertandatangan_resmi.pdf', 500, 'application/pdf');

        $response = $this->actingAs($operator)->post(route('bast.arsipkan', $bast->id_bast), [
            'file_bast' => $scanFile,
            'catatan_arsip' => 'Ditandatangani lengkap bermaterai Rp 10.000',
        ]);

        $response->assertRedirect(route('bast.index'));
        $response->assertSessionHas('status');

        $bast->refresh();
        $this->assertEquals('selesai', $bast->status);
        $this->assertNotNull($bast->id_dokumen);

        $dokumen = Dokumen::find($bast->id_dokumen);
        $this->assertNotNull($dokumen);
        $this->assertEquals('bast', $dokumen->jenis_dokumen);
        $this->assertEquals('bast_bertandatangan_resmi.pdf', $dokumen->nama_file);
        Storage::disk('public')->assertExists($dokumen->path_file);
    }

    public function test_operator_dapat_menyusun_draft_bast_mutasi(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);

        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'MTS-2026-0010',
            'jenis_pengajuan' => 'mutasi',
            'status' => 'selesai',
            'keterangan' => 'Mutasi PC ke Lab Sistem Informasi',
            'tanggal_pengajuan' => now()->subDays(3),
        ]);

        $response = $this->actingAs($operator)->post(route('bast.store'), [
            'jenis_bast' => 'mutasi',
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'tanggal_bast' => now()->toDateString(),
            'pihak_pertama' => 'Dr. Ahmad (Lab Komputer Dasar)',
            'pihak_kedua' => 'Siti Nurhaliza (Lab Sistem Informasi)',
            'keterangan' => 'Mutasi 3 unit PC All-in-One',
            'items' => [
                [
                    'kode_aset' => 'FTI-2024-1011',
                    'nama_barang' => 'PC All-in-One Dell OptiPlex',
                    'spesifikasi' => 'Core i5, 8GB RAM',
                    'jumlah' => 3,
                    'kondisi' => 'baik',
                ],
            ],
        ]);

        $bast = BeritaAcara::query()->where('id_pengajuan', $pengajuan->id_pengajuan)->first();

        $this->assertNotNull($bast);
        $this->assertEquals('mutasi', $bast->jenis_bast);
        $this->assertEquals('draft', $bast->status);
        $this->assertCount(1, $bast->items);
        $this->assertEquals('PC All-in-One Dell OptiPlex', $bast->items->first()->nama_barang);

        $response->assertRedirect(route('bast.index'));
    }

    public function test_operator_dapat_menyusun_draft_bast_penghapusan_hibah(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);

        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'HPS-2026-0020',
            'jenis_pengajuan' => 'penghapusan',
            'status' => 'selesai',
            'keterangan' => 'Hibah peralatan ke SMKN 1 Pariaman',
            'tanggal_pengajuan' => now()->subDays(2),
        ]);

        $response = $this->actingAs($operator)->post(route('bast.store'), [
            'jenis_bast' => 'hibah',
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'tanggal_bast' => now()->toDateString(),
            'pihak_pertama' => 'Fakultas Teknologi Informasi Universitas Andalas',
            'pihak_kedua' => 'Kepala SMKN 1 Pariaman',
            'keterangan' => 'Penyerahan hibah resmi',
            'items' => [
                [
                    'kode_aset' => 'FTI-2018-0055',
                    'nama_barang' => 'Switch Cisco Catalyst',
                    'spesifikasi' => '24 Port 10/100',
                    'jumlah' => 1,
                    'kondisi' => 'rusak_berat',
                ],
            ],
        ]);

        $bast = BeritaAcara::query()->where('id_pengajuan', $pengajuan->id_pengajuan)->first();

        $this->assertNotNull($bast);
        $this->assertEquals('hibah', $bast->jenis_bast);
        $this->assertEquals('draft', $bast->status);
        $this->assertEquals('Kepala SMKN 1 Pariaman', $bast->pihak_kedua);

        $response->assertRedirect(route('bast.index'));
    }
}
