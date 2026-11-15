<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\Dokumen;
use App\Models\Gedung;
use App\Models\ItemMutasi;
use App\Models\ItemPengadaan;
use App\Models\ItemPenghapusan;
use App\Models\ItemPerbaikan;
use App\Models\KategoriAset;
use App\Models\Pengajuan;
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
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PengajuanApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }

    private function buatPengajuan(User $pemohon, string $status = 'diajukan', string $jenis = 'pengadaan'): Pengajuan
    {
        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KAT-TEST'],
            ['nama_kategori' => 'Kategori Pengujian', 'masa_manfaat_tahun' => 5]
        );

        $pengajuan = Pengajuan::query()->create([
            'id_pemohon' => $pemohon->id_pengguna,
            'nomor_pengajuan' => 'PGD-2026-' . str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT),
            'jenis_pengajuan' => $jenis,
            'tanggal_pengajuan' => now(),
            'keterangan' => "Perihal: Pengadaan Alat Lab\nUnit: Informatika\nAlasan: Kebutuhan praktikum",
            'status' => $status,
        ]);

        if ($jenis === 'pengadaan') {
            ItemPengadaan::query()->create([
                'id_pengajuan' => $pengajuan->id_pengajuan,
                'id_kategori' => $kategori->id_kategori,
                'nama_barang' => 'Server Komputasi AI',
                'spesifikasi' => 'GPU RTX 4090, 64GB RAM',
                'jumlah' => 1,
                'estimasi_anggaran' => 50000000,
            ]);
        }

        RiwayatStatusPengajuan::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $pemohon->id_pengguna,
            'status_baru' => $status,
            'catatan' => 'Inisiasi pengajuan dalam status ' . $status,
            'waktu' => now(),
        ]);

        return $pengajuan;
    }

    // ─────────────────────────────────────────────────────────────
    // 1. PEMOHON
    // ─────────────────────────────────────────────────────────────

    public function test_pemohon_can_view_proposal_list(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $this->buatPengajuan($pemohon, 'diajukan');

        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/Index')
                ->has('daftarPengajuan.data', 1)
            );
    }

    public function test_pemohon_can_view_own_proposal_detail(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/Show')
                ->where('pengajuan.id_pengajuan', $pengajuan->id_pengajuan)
                ->where('pengajuan.nomor_pengajuan', $pengajuan->nomor_pengajuan)
            );
    }

    public function test_pemohon_cannot_view_others_proposal_detail(): void
    {
        $pemohonA = $this->akun(PeranNama::PEMOHON);
        $pemohonB = $this->akun(PeranNama::PEMOHON);
        $pengajuanB = $this->buatPengajuan($pemohonB, 'diajukan');

        $this->actingAs($pemohonA)
            ->get(route('pemohon.pengajuan.show', $pengajuanB->id_pengajuan))
            ->assertForbidden();
    }

    public function test_pemohon_cannot_submit_draft_proposal_without_documents(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'draft');

        // Pengajuan draf tanpa dokumen lampiran ditolak
        $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.kirim', $pengajuan->id_pengajuan))
            ->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan))
            ->assertSessionHasErrors(['status']);

        $pengajuan->refresh();
        $this->assertEquals('draft', $pengajuan->status);
    }

    public function test_pemohon_can_submit_draft_proposal(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'draft');

        Dokumen::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengunggah' => $pemohon->id_pengguna,
            'jenis_dokumen' => 'surat_pengajuan',
            'nama_file' => 'surat_rab.pdf',
            'path_file' => 'dokumen/pengadaan/surat_rab.pdf',
            'tanggal_unggah' => now(),
        ]);

        $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.kirim', $pengajuan->id_pengajuan))
            ->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan))
            ->assertSessionHas('status', 'Pengajuan berhasil dikirim.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'diajukan',
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $pemohon->id_pengguna,
            'status_baru' => 'diajukan',
        ]);
    }

    public function test_pemohon_cannot_resubmit_already_submitted_proposal(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        $this->actingAs($pemohon)
            ->post(route('pemohon.pengajuan.kirim', $pengajuan->id_pengajuan))
            ->assertStatus(422);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. OPERATOR ASET FAKULTAS
    // ─────────────────────────────────────────────────────────────

    public function test_operator_can_view_pemeriksaan_index(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $this->buatPengajuan($pemohon, 'diajukan');

        $this->actingAs($operator)
            ->get(route('pemeriksaan.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PemeriksaanIndex')
                ->has('daftarPemeriksaan.data')
                ->has('daftarPemeriksaan.data.0.riwayat')
            );
    }

    public function test_non_operator_cannot_access_pemeriksaan_index(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);

        $this->actingAs($pemohon)
            ->get(route('pemeriksaan.index'))
            ->assertForbidden();
    }

    public function test_operator_can_approve_and_forward_proposal(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'teruskan',
                'catatan' => 'Berkas penawaran harga lengkap dan spesifikasi valid.',
            ])
            ->assertRedirect(route('pemeriksaan.index'))
            ->assertSessionHas('status', 'Pemeriksaan pengajuan berhasil diverifikasi dan diteruskan ke Kepala Kantor.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'diajukan',
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $operator->id_pengguna,
            'status_baru' => 'diajukan',
        ]);

        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'verifikasi',
            'nama_tabel' => 'pengajuan',
            'id_data' => $pengajuan->id_pengajuan,
        ]);
    }

    public function test_operator_cannot_reprocess_already_verified_proposal(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        // Pertama kali diverifikasi -> berhasil
        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'teruskan',
                'catatan' => 'Berkas lengkap dan spesifikasi valid.',
            ])
            ->assertRedirect(route('pemeriksaan.index'));

        // Mencoba verifikasi ulang -> ditolak 403
        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'teruskan',
                'catatan' => 'Mencoba verifikasi ulang berkas yang sama.',
            ])
            ->assertForbidden();
    }

    public function test_operator_can_return_proposal_to_draft(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'kembalikan',
                'catatan' => 'RAB belum mencantumkan rincian PPN.',
            ])
            ->assertRedirect(route('pemeriksaan.index'))
            ->assertSessionHas('status', 'Pengajuan berhasil dikembalikan ke pemohon untuk revisi.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'draft',
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $operator->id_pengguna,
            'status_baru' => 'draft',
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. KEPALA KANTOR
    // ─────────────────────────────────────────────────────────────

    public function test_kepala_kantor_can_view_proposals_and_detail(): void
    {
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        $this->actingAs($kepalaKantor)
            ->get(route('kepala-kantor.pengajuan'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/KepalaKantorIndex')
                ->has('daftarPengajuan.data')
                ->has('statistik')
            );

        $this->actingAs($kepalaKantor)
            ->get(route('kepala-kantor.pengajuan.show', $pengajuan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/KepalaKantorShow')
                ->where('pengajuan.id_pengajuan', $pengajuan->id_pengajuan)
            );
    }

    public function test_non_kepala_kantor_cannot_access_kepala_kantor_routes(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);

        $this->actingAs($pemohon)
            ->get(route('kepala-kantor.pengajuan'))
            ->assertForbidden();
    }

    public function test_kepala_kantor_can_recommend_proposal_to_pimpinan(): void
    {
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        // Operator memverifikasi dan meneruskan ke Kepala Kantor terlebih dahulu
        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'teruskan',
                'catatan' => 'Berkas dan spesifikasi valid.',
            ]);

        $this->actingAs($kepalaKantor)
            ->post(route('kepala-kantor.pengajuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'rekomendasikan',
                'catatan' => 'Sesuai dengan target Renstra FTI dan ketersediaan anggaran RKAT.',
            ])
            ->assertRedirect(route('kepala-kantor.pengajuan'))
            ->assertSessionHas('status', 'Pengajuan berhasil direkomendasikan ke Pimpinan.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'disetujui_kadep',
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $kepalaKantor->id_pengguna,
            'status_baru' => 'disetujui_kadep',
        ]);
    }

    public function test_kepala_kantor_can_return_proposal_for_revision(): void
    {
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        // Operator memverifikasi dan meneruskan ke Kepala Kantor terlebih dahulu
        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'teruskan',
                'catatan' => 'Berkas dan spesifikasi valid.',
            ]);

        $this->actingAs($kepalaKantor)
            ->post(route('kepala-kantor.pengajuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'kembalikan',
                'catatan' => 'Mohon kurangi jumlah server menjadi 1 unit.',
            ])
            ->assertRedirect(route('kepala-kantor.pengajuan'))
            ->assertSessionHas('status', 'Pengajuan berhasil dikembalikan untuk revisi.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'draft',
        ]);
    }

    public function test_kepala_kantor_cannot_process_unverified_by_operator_proposal(): void
    {
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        // Belum diverifikasi operator -> ditolak 403
        $this->actingAs($kepalaKantor)
            ->post(route('kepala-kantor.pengajuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'rekomendasikan',
                'catatan' => 'Mencoba rekomendasi langsung tanpa operator.',
            ])
            ->assertForbidden();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PIMPINAN
    // ─────────────────────────────────────────────────────────────

    public function test_pimpinan_can_view_approval_queue_and_detail(): void
    {
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'disetujui_kadep');

        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanIndex')
                ->where('tabAktif', 'menunggu')
                ->has('daftarPersetujuan.data')
            );

        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan.show', $pengajuan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanShow')
                ->where('pengajuan.id_pengajuan', $pengajuan->id_pengajuan)
                ->where('dapatDiputuskan', true)
            );
    }

    public function test_pimpinan_tabs_filter_proposals_correctly(): void
    {
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pemohon = $this->akun(PeranNama::PEMOHON);

        $pengajuanMenunggu = $this->buatPengajuan($pemohon, 'disetujui_kadep');
        $pengajuanDisetujui = $this->buatPengajuan($pemohon, 'disetujui_pimpinan');
        $pengajuanDitolak = $this->buatPengajuan($pemohon, 'ditolak');
        $pengajuanDraft = $this->buatPengajuan($pemohon, 'draft');

        // 1. Tab Menunggu persetujuan (menunggu) -> status disetujui_kadep
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan', ['tab' => 'menunggu']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanIndex')
                ->where('tabAktif', 'menunggu')
                ->has('daftarPersetujuan.data', 1)
                ->where('daftarPersetujuan.data.0.id_pengajuan', $pengajuanMenunggu->id_pengajuan)
            );

        // 2. Tab Riwayat keputusan (riwayat) -> status disetujui_pimpinan, ditolak, diproses, selesai
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan', ['tab' => 'riwayat']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanIndex')
                ->where('tabAktif', 'riwayat')
                ->has('daftarPersetujuan.data', 2)
            );

        // 3. Tab Semua usulan (semua) -> seluruh non-draft
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan', ['tab' => 'semua']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanIndex')
                ->where('tabAktif', 'semua')
                ->has('daftarPersetujuan.data', 3)
            );
    }

    public function test_operator_tabs_filter_correctly(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->akun(PeranNama::PEMOHON);

        $pengajuanDiajukan = $this->buatPengajuan($pemohon, 'diajukan');
        $pengajuanKadep = $this->buatPengajuan($pemohon, 'disetujui_kadep');
        $pengajuanDraft = $this->buatPengajuan($pemohon, 'draft');

        // Tab Antrean -> status diajukan
        $this->actingAs($operator)
            ->get(route('pemeriksaan.index', ['tab' => 'antrean']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PemeriksaanIndex')
                ->where('tabAktif', 'antrean')
                ->has('daftarPemeriksaan.data', 1)
                ->where('daftarPemeriksaan.data.0.id_pengajuan', $pengajuanDiajukan->id_pengajuan)
            );

        // Tab Semua -> seluruh non-draft
        $this->actingAs($operator)
            ->get(route('pemeriksaan.index', ['tab' => 'semua']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PemeriksaanIndex')
                ->where('tabAktif', 'semua')
                ->has('daftarPemeriksaan.data', 2)
            );
    }

    public function test_non_pimpinan_cannot_access_persetujuan(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);

        $this->actingAs($operator)
            ->get(route('pimpinan.persetujuan'))
            ->assertForbidden();
    }

    public function test_pimpinan_can_approve_proposal(): void
    {
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'disetujui_kadep');

        $this->actingAs($pimpinan)
            ->post(route('pimpinan.persetujuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'setujui',
                'catatan' => 'Disetujui untuk dilaksanakan melalui pengadaan universitas.',
            ])
            ->assertRedirect(route('pimpinan.persetujuan'))
            ->assertSessionHas('status', 'Pengajuan berhasil disetujui.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'disetujui_pimpinan',
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $pimpinan->id_pengguna,
            'status_baru' => 'disetujui_pimpinan',
        ]);

        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'persetujuan',
            'nama_tabel' => 'pengajuan',
            'id_data' => $pengajuan->id_pengajuan,
        ]);
    }

    public function test_pimpinan_can_reject_proposal(): void
    {
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'disetujui_kadep');

        $this->actingAs($pimpinan)
            ->post(route('pimpinan.persetujuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'tolak',
                'catatan' => 'Anggaran fakultas telah mencapai batas pagu maksimal.',
            ])
            ->assertRedirect(route('pimpinan.persetujuan'))
            ->assertSessionHas('status', 'Pengajuan telah ditolak.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'ditolak',
        ]);

        $this->assertDatabaseHas('riwayat_status_pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengguna' => $pimpinan->id_pengguna,
            'status_baru' => 'ditolak',
        ]);
    }

    public function test_pimpinan_can_return_proposal_for_revision(): void
    {
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'disetujui_kadep');

        $this->actingAs($pimpinan)
            ->post(route('pimpinan.persetujuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'kembalikan',
                'catatan' => 'Perbaiki spesifikasi processor dan kartu grafis.',
            ])
            ->assertRedirect(route('pimpinan.persetujuan'))
            ->assertSessionHas('status', 'Pengajuan berhasil dikembalikan untuk perbaikan.');

        $this->assertDatabaseHas('pengajuan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'status' => 'draft',
        ]);
    }

    public function test_pimpinan_cannot_process_proposal_before_recommended_by_kepala_kantor(): void
    {
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        // Pimpinan dapat melihat detail tetapi form keputusan non-aktif (dapatDiputuskan = false)
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan.show', $pengajuan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanShow')
                ->where('pengajuan.id_pengajuan', $pengajuan->id_pengajuan)
                ->where('dapatDiputuskan', false)
            );

        // Jika nekat mengirim proses -> tolak 403
        $this->actingAs($pimpinan)
            ->post(route('pimpinan.persetujuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'setujui',
                'catatan' => 'Mencoba mendahului verifikasi Kepala Kantor.',
            ])
            ->assertForbidden();
    }

    public function test_pimpinan_cannot_process_already_decided_proposal(): void
    {
        $pimpinan = $this->akun(PeranNama::PIMPINAN);
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $pengajuan = $this->buatPengajuan($pemohon, 'disetujui_pimpinan');

        // Halaman detail dapat dibuka dengan dapatDiputuskan = false
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan.show', $pengajuan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanShow')
                ->where('dapatDiputuskan', false)
            );

        // Pengajuan yang sudah diputuskan tidak dapat diproses ulang -> tolak 403
        $this->actingAs($pimpinan)
            ->post(route('pimpinan.persetujuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'setujui',
                'catatan' => 'Mencoba persetujuan ulang.',
            ])
            ->assertForbidden();
    }

    // ─────────────────────────────────────────────────────────────
    // 5. CROSS-TYPE PROPOSAL SUPPORT
    // ─────────────────────────────────────────────────────────────

    public function test_detail_view_supports_all_proposal_types(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $unit = Unit::query()->first();
        $subUnit = SubUnit::query()->first();
        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KAT-PC'],
            ['nama_kategori' => 'Komputer', 'masa_manfaat_tahun' => 4]
        );

        $gedung = Gedung::query()->firstOrCreate(
            ['kode_gedung' => 'GD-TEST'],
            ['nama_gedung' => 'Gedung Uji']
        );

        $ruangan = Ruangan::query()->create([
            'id_gedung' => $gedung->id_gedung,
            'id_unit' => $unit->id_unit,
            'id_sub_unit' => $subUnit->id_sub_unit,
            'lantai' => 1,
            'nomor_ruangan' => 'R-101',
            'nama_ruangan' => 'Ruang Dosen',
        ]);

        $aset = Aset::query()->create([
            'id_kategori' => $kategori->id_kategori,
            'kode_aset' => 'AST-TEST-001',
            'nama_barang' => 'Laptop ThinkPad',
            'spesifikasi' => 'Core i7',
            'kondisi' => 'baik',
            'status_aset' => 'aktif',
            'tahun_perolehan' => 2024,
            'harga_perolehan' => 15000000,
        ]);

        // Perbaikan
        $pengajuanPerbaikan = $this->buatPengajuan($pemohon, 'diajukan', 'perbaikan');
        ItemPerbaikan::query()->create([
            'id_pengajuan' => $pengajuanPerbaikan->id_pengajuan,
            'id_aset' => $aset->id_aset,
            'deskripsi_kerusakan' => 'Layar bergaris',
            'estimasi_biaya' => 2500000,
            'status_perbaikan' => 'menunggu',
        ]);

        // Mutasi
        $pengajuanMutasi = $this->buatPengajuan($pemohon, 'diajukan', 'mutasi');
        ItemMutasi::query()->create([
            'id_pengajuan' => $pengajuanMutasi->id_pengajuan,
            'id_aset' => $aset->id_aset,
            'id_ruangan_tujuan' => $ruangan->id_ruangan,
            'id_pengguna_pj' => $pemohon->id_pengguna,
        ]);

        // Penghapusan
        $pengajuanPenghapusan = $this->buatPengajuan($pemohon, 'diajukan', 'penghapusan');
        ItemPenghapusan::query()->create([
            'id_pengajuan' => $pengajuanPenghapusan->id_pengajuan,
            'id_aset' => $aset->id_aset,
            'jalur_penghapusan' => 'penjualan',
            'nilai_penjualan' => 1000000,
            'catatan_tim_penilai' => 'Kondisi rusak berat',
        ]);

        // Cek halaman detail masing-masing jenis
        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan.show', $pengajuanPerbaikan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/Show')
                ->where('pengajuan.jenis_pengajuan', 'perbaikan')
                ->has('pengajuan.items', 1)
            );

        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan.show', $pengajuanMutasi->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/Show')
                ->where('pengajuan.jenis_pengajuan', 'mutasi')
                ->has('pengajuan.items', 1)
            );

        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan.show', $pengajuanPenghapusan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/Show')
                ->where('pengajuan.jenis_pengajuan', 'penghapusan')
                ->has('pengajuan.items', 1)
            );
    }

    public function test_draft_proposals_are_hidden_from_operator_kepala_kantor_and_pimpinan(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pimpinan = $this->akun(PeranNama::PIMPINAN);

        $draftPengajuan = $this->buatPengajuan($pemohon, 'draft');

        // Operator tidak melihat draf di antrean
        $this->actingAs($operator)
            ->get(route('pemeriksaan.index', ['tab' => 'semua']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PemeriksaanIndex')
                ->has('daftarPemeriksaan.data', 0)
            );

        // Kepala Kantor tidak melihat draf di daftar dan ditolak saat akses show
        $this->actingAs($kepalaKantor)
            ->get(route('kepala-kantor.pengajuan'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/KepalaKantorIndex')
                ->has('daftarPengajuan.data', 0)
            );

        $this->actingAs($kepalaKantor)
            ->get(route('kepala-kantor.pengajuan.show', $draftPengajuan->id_pengajuan))
            ->assertNotFound();

        // Pimpinan tidak melihat draf di daftar dan ditolak saat akses show
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan', ['tab' => 'semua']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanIndex')
                ->has('daftarPersetujuan.data', 0)
            );

        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan.show', $draftPengajuan->id_pengajuan))
            ->assertNotFound();
    }

    public function test_draft_vs_perlu_revisi_differentiation(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);

        // 1. Draf murni (baru dibuat pemohon)
        $drafMurni = $this->buatPengajuan($pemohon, 'draft');
        $this->assertFalse($drafMurni->is_revisi);

        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan.show', $drafMurni->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/Show')
                ->where('pengajuan.status_label', 'Draf')
                ->where('pengajuan.is_revisi', false)
            );

        // 2. Usulan dikembalikan oleh Operator untuk revisi
        $usulanRevisi = $this->buatPengajuan($pemohon, 'diajukan');
        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $usulanRevisi->id_pengajuan), [
                'keputusan' => 'kembalikan',
                'catatan' => 'Mohon sesuaikan rincian harga satuan.',
            ]);

        $usulanRevisi->refresh();
        $this->assertEquals('draft', $usulanRevisi->status);
        $this->assertTrue($usulanRevisi->is_revisi);

        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan.show', $usulanRevisi->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/Show')
                ->where('pengajuan.status_label', 'Perlu Revisi')
                ->where('pengajuan.is_revisi', true)
                ->where('pengajuan.catatan_revisi_terakhir', 'Dikembalikan oleh Operator: Mohon sesuaikan rincian harga satuan.')
            );
    }

    public function test_dokumen_download_and_authorization(): void
    {
        Storage::fake('public');

        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);
        $unrelatedUser = $this->akun(PeranNama::PEMOHON);

        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        $fileContent = 'PDF TEST CONTENT';
        $path = 'dokumen/pengadaan/test_rab.pdf';
        Storage::disk('public')->put($path, $fileContent);

        $dokumen = Dokumen::query()->create([
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'id_pengunggah' => $pemohon->id_pengguna,
            'jenis_dokumen' => 'surat_pengajuan',
            'nama_file' => 'test_rab.pdf',
            'path_file' => $path,
            'tanggal_unggah' => now(),
        ]);

        // Pemohon yang memiliki usulan bisa membuka
        $this->actingAs($pemohon)
            ->get(route('dokumen.unduh', $dokumen->id_dokumen))
            ->assertOk();

        // Operator bisa membuka
        $this->actingAs($operator)
            ->get(route('dokumen.unduh', $dokumen->id_dokumen))
            ->assertOk();

        // Pengguna lain yang tidak berhak ditolak (403)
        $this->actingAs($unrelatedUser)
            ->get(route('dokumen.unduh', $dokumen->id_dokumen))
            ->assertForbidden();
    }

    public function test_pemohon_can_edit_draft_and_revisi_proposal(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);

        // 1. Buat usulan draf
        $pengajuan = $this->buatPengajuan($pemohon, 'draft');
        $kategori = KategoriAset::query()->first();

        // Buka form edit draf
        $this->actingAs($pemohon)
            ->get(route('pemohon.pengajuan.edit', $pengajuan->id_pengajuan))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengadaan/Edit')
                ->where('pengajuan.id_pengajuan', $pengajuan->id_pengajuan)
                ->where('pengajuan.status', 'draft')
                ->where('pengajuan.is_revisi', false)
            );

        // Simpan perubahan draf (status tetap draft)
        $this->actingAs($pemohon)
            ->put(route('pemohon.pengajuan.update', $pengajuan->id_pengajuan), [
                'aksi' => 'draft',
                'perihal' => 'Pengadaan Server AI Lab Terpadu (Revisi Spek)',
                'sumber_dana' => 'BOPTN 2026',
                'alasan' => 'Dukungan riset mahasiswa semester akhir.',
                'items' => [
                    [
                        'id_kategori' => $kategori->id_kategori,
                        'nama_barang' => 'Server GPU RTX 4090 Dual',
                        'spesifikasi' => '128GB RAM, 2TB NVMe',
                        'jumlah' => 2,
                        'harga_satuan' => 60000000,
                    ],
                ],
            ])
            ->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan))
            ->assertSessionHas('status', 'Perubahan draf pengajuan pengadaan berhasil disimpan.');

        $pengajuan->refresh();
        $this->assertEquals('draft', $pengajuan->status);
        $this->assertDatabaseHas('item_pengadaan', [
            'id_pengajuan' => $pengajuan->id_pengajuan,
            'nama_barang' => 'Server GPU RTX 4090 Dual',
            'jumlah' => 2,
        ]);
        // Memastikan tidak menyisipkan baris baru saat status masih 'draft'
        $this->assertEquals(1, RiwayatStatusPengajuan::where('id_pengajuan', $pengajuan->id_pengajuan)->count());

        // 2. Kirim ulang pengajuan (status -> diajukan)
        Storage::fake('public');
        $this->actingAs($pemohon)
            ->put(route('pemohon.pengajuan.update', $pengajuan->id_pengajuan), [
                'aksi' => 'diajukan',
                'perihal' => 'Pengadaan Server AI Lab Terpadu (Final)',
                'sumber_dana' => 'BOPTN 2026',
                'alasan' => 'Dukungan riset mahasiswa semester akhir.',
                'items' => [
                    [
                        'id_kategori' => $kategori->id_kategori,
                        'nama_barang' => 'Server GPU RTX 4090 Dual',
                        'spesifikasi' => '128GB RAM, 2TB NVMe',
                        'jumlah' => 2,
                        'harga_satuan' => 60000000,
                    ],
                ],
                'lampiran' => [
                    UploadedFile::fake()->create('rab_final.pdf', 200, 'application/pdf'),
                ],
            ])
            ->assertRedirect(route('pemohon.pengajuan.show', $pengajuan->id_pengajuan))
            ->assertSessionHas('status', 'Pengajuan pengadaan berhasil dikirim.');

        $pengajuan->refresh();
        $this->assertEquals('diajukan', $pengajuan->status);
        // Baris baru dibuat saat status berubah ke 'diajukan'
        $this->assertEquals(2, RiwayatStatusPengajuan::where('id_pengajuan', $pengajuan->id_pengajuan)->count());
    }

    public function test_pemohon_cannot_edit_non_draft_proposal_or_others_proposal(): void
    {
        $pemohonA = $this->akun(PeranNama::PEMOHON);
        $pemohonB = $this->akun(PeranNama::PEMOHON);

        $pengajuanDiajukan = $this->buatPengajuan($pemohonA, 'diajukan');
        $pengajuanB = $this->buatPengajuan($pemohonB, 'draft');
        $kategori = KategoriAset::query()->first();

        // Tidak bisa mengedit pengajuan yang statusnya bukan draft
        $this->actingAs($pemohonA)
            ->get(route('pemohon.pengajuan.edit', $pengajuanDiajukan->id_pengajuan))
            ->assertForbidden();

        $this->actingAs($pemohonA)
            ->put(route('pemohon.pengajuan.update', $pengajuanDiajukan->id_pengajuan), [
                'aksi' => 'draft',
                'perihal' => 'Edit Coba',
                'sumber_dana' => 'RKAT',
                'alasan' => 'Coba',
                'items' => [
                    [
                        'id_kategori' => $kategori->id_kategori,
                        'nama_barang' => 'Barang Coba',
                        'spesifikasi' => 'Spek',
                        'jumlah' => 1,
                        'harga_satuan' => 1000,
                    ],
                ],
            ])
            ->assertForbidden();

        // Tidak bisa mengedit draf milik orang lain
        $this->actingAs($pemohonA)
            ->get(route('pemohon.pengajuan.edit', $pengajuanB->id_pengajuan))
            ->assertForbidden();

        $this->actingAs($pemohonA)
            ->put(route('pemohon.pengajuan.update', $pengajuanB->id_pengajuan), [
                'aksi' => 'draft',
                'perihal' => 'Edit Coba',
                'sumber_dana' => 'RKAT',
                'alasan' => 'Coba',
                'items' => [
                    [
                        'id_kategori' => $kategori->id_kategori,
                        'nama_barang' => 'Barang Coba',
                        'spesifikasi' => 'Spek',
                        'jumlah' => 1,
                        'harga_satuan' => 1000,
                    ],
                ],
            ])
            ->assertForbidden();
    }

    public function test_strict_hierarchical_queues_operator_kepala_kantor_pimpinan(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $operator = $this->akun(PeranNama::OPERATOR);
        $kepalaKantor = $this->akun(PeranNama::KEPALA_KANTOR);
        $pimpinan = $this->akun(PeranNama::PIMPINAN);

        // 1. Pemohon mengajukan usulan baru
        $pengajuan = $this->buatPengajuan($pemohon, 'diajukan');

        // Pengajuan muncul di antrean Operator (tab: antrean)
        $this->actingAs($operator)
            ->get(route('pemeriksaan.index', ['tab' => 'antrean']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PemeriksaanIndex')
                ->where('daftarPemeriksaan.data.0.id_pengajuan', $pengajuan->id_pengajuan)
            );

        // Pengajuan BELUM muncul di antrean verifikasi Kepala Kantor (tab: menunggu)
        $this->actingAs($kepalaKantor)
            ->get(route('kepala-kantor.pengajuan', ['tab' => 'menunggu']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/KepalaKantorIndex')
                ->has('daftarPengajuan.data', 0)
            );

        // 2. Operator memeriksa dan meneruskan ke Kepala Kantor
        $this->actingAs($operator)
            ->post(route('pemeriksaan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'teruskan',
                'catatan' => 'Pemeriksaan berkas dan spesifikasi valid.',
            ]);

        // Pengajuan hilang dari antrean Operator
        $this->actingAs($operator)
            ->get(route('pemeriksaan.index', ['tab' => 'antrean']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PemeriksaanIndex')
                ->has('daftarPemeriksaan.data', 0)
            );

        // Pengajuan SEKARANG muncul di antrean Kepala Kantor
        $this->actingAs($kepalaKantor)
            ->get(route('kepala-kantor.pengajuan', ['tab' => 'menunggu']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/KepalaKantorIndex')
                ->where('daftarPengajuan.data.0.id_pengajuan', $pengajuan->id_pengajuan)
            );

        // Pengajuan belum ada di antrean persetujuan Pimpinan
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan', ['tab' => 'menunggu']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanIndex')
                ->has('daftarPersetujuan.data', 0)
            );

        // 3. Kepala Kantor merekomendasikan ke Pimpinan
        $this->actingAs($kepalaKantor)
            ->post(route('kepala-kantor.pengajuan.proses', $pengajuan->id_pengajuan), [
                'keputusan' => 'rekomendasikan',
                'catatan' => 'Sesuai Renstra FTI.',
            ]);

        $pengajuan->refresh();
        $this->assertEquals('disetujui_kadep', $pengajuan->status);

        // Pengajuan SEKARANG muncul di antrean Pimpinan
        $this->actingAs($pimpinan)
            ->get(route('pimpinan.persetujuan', ['tab' => 'menunggu']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pengajuan/PimpinanIndex')
                ->where('daftarPersetujuan.data.0.id_pengajuan', $pengajuan->id_pengajuan)
            );
    }

    public function test_submission_requires_attachment_when_diajukan(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);
        $kategori = KategoriAset::query()->firstOrCreate(
            ['kode_kategori' => 'KAT-TEST'],
            ['nama_kategori' => 'Kategori Pengujian', 'masa_manfaat_tahun' => 5]
        );

        // Store diajukan tanpa lampiran -> gagal validasi
        $this->actingAs($pemohon)
            ->post('/pemohon/pengajuan/pengadaan', [
                'aksi' => 'diajukan',
                'perihal' => 'Pengadaan Tanpa Lampiran',
                'sumber_dana' => 'RKAT',
                'alasan' => 'Coba',
                'items' => [
                    [
                        'id_kategori' => $kategori->id_kategori,
                        'nama_barang' => 'Barang',
                        'spesifikasi' => 'Spek',
                        'jumlah' => 1,
                        'harga_satuan' => 1000,
                    ],
                ],
            ])
            ->assertSessionHasErrors(['lampiran']);

        // Update ke diajukan tanpa lampiran dan tanpa dokumen lama -> gagal validasi
        $pengajuan = $this->buatPengajuan($pemohon, 'draft');

        $this->actingAs($pemohon)
            ->put(route('pemohon.pengajuan.update', $pengajuan->id_pengajuan), [
                'aksi' => 'diajukan',
                'perihal' => 'Kirim Tanpa Lampiran',
                'sumber_dana' => 'RKAT',
                'alasan' => 'Coba',
                'items' => [
                    [
                        'id_kategori' => $kategori->id_kategori,
                        'nama_barang' => 'Barang',
                        'spesifikasi' => 'Spek',
                        'jumlah' => 1,
                        'harga_satuan' => 1000,
                    ],
                ],
            ])
            ->assertSessionHasErrors(['lampiran']);
    }
}
