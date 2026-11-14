<?php

namespace Tests\Feature;

use App\Models\Peran;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ManajemenAkunTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_can_open_account_pages_and_log(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);

        $this->actingAs($operator)->get('/pengguna')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Pengguna/Index'));
        $this->actingAs($operator)->get('/pengguna/create')->assertOk();
        $this->actingAs($operator)->get('/pengguna/'.$operator->id_pengguna.'/edit')->assertOk();
        $this->actingAs($operator)->get('/log-aktivitas')->assertOk();
        $this->actingAs($operator)->get('/hak-akses')->assertOk();
    }

    public function test_other_roles_cannot_open_operator_pages(): void
    {
        foreach ([PeranNama::PIMPINAN, PeranNama::KEPALA_KANTOR, PeranNama::PEMOHON, PeranNama::PEGAWAI, PeranNama::TEKNISI] as $peran) {
            $user = $this->akun($peran);

            foreach (['/pengguna', '/pengguna/create', '/log-aktivitas', '/hak-akses'] as $url) {
                $this->actingAs($user)->get($url)->assertForbidden();
            }
        }
    }

    public function test_account_list_can_be_searched_and_filtered(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $this->akun(PeranNama::PEGAWAI, ['nama_lengkap' => 'Budi Santoso']);
        $this->akun(PeranNama::TEKNISI, ['nama_lengkap' => 'Citra Lestari', 'is_aktif' => false]);

        $this->actingAs($operator)->get('/pengguna?q=Budi')
            ->assertInertia(fn (Assert $page) => $page->has('pengguna.data', 1)
                ->where('pengguna.data.0.nama_lengkap', 'Budi Santoso'));

        $this->actingAs($operator)->get('/pengguna?status=nonaktif')
            ->assertInertia(fn (Assert $page) => $page->has('pengguna.data', 1)
                ->where('pengguna.data.0.nama_lengkap', 'Citra Lestari'));
    }

    public function test_operator_can_update_an_account(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $target = $this->akun(PeranNama::PEGAWAI);

        $this->actingAs($operator)->put('/pengguna/'.$target->id_pengguna, [
            'peran' => [$target->id_peran],
            'id_peran' => $target->id_peran,
            'id_unit' => $target->id_unit,
            'id_sub_unit' => $target->id_sub_unit,
            'nip' => $target->nip,
            'nama_lengkap' => 'Nama Baru',
            'email' => $target->email,
            'username' => $target->username,
        ])->assertRedirect(route('pengguna.index'));

        $this->assertSame('Nama Baru', $target->refresh()->nama_lengkap);
    }

    public function test_sub_unit_must_belong_to_the_selected_unit(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $unitLain = Unit::query()->create(['nama_unit' => 'Unit Lain', 'jenis_unit' => 'departemen']);

        $this->actingAs($operator)->post('/pengguna', [
            'peran' => [$operator->id_peran],
            'id_peran' => $operator->id_peran,
            'id_unit' => $unitLain->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'nama_lengkap' => 'Akun Salah Unit',
            'email' => 'salah@fti.ac.id',
            'username' => 'salahunit',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ])->assertSessionHasErrors('id_sub_unit');
    }

    public function test_last_active_operator_cannot_be_deactivated_or_demoted(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $penerus = $this->akun(PeranNama::PEGAWAI);

        // Satu-satunya operator aktif dilindungi, walau yang bertindak operator lain yang tidak aktif.
        $nonaktif = $this->akun(PeranNama::OPERATOR, ['is_aktif' => false]);

        $this->actingAs($penerus)->patch('/pengguna/'.$operator->id_pengguna.'/status')->assertForbidden();

        $this->assertTrue($operator->adalahOperatorAktifTerakhir());
        $this->assertFalse($nonaktif->adalahOperatorAktifTerakhir());
    }

    public function test_operator_cannot_deactivate_or_change_role_of_own_account(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $this->akun(PeranNama::OPERATOR); // operator kedua agar yang ditolak adalah aturan "akun sendiri"

        $this->actingAs($operator)->patch('/pengguna/'.$operator->id_pengguna.'/status')
            ->assertSessionHasErrors('status');
        $this->assertTrue($operator->refresh()->is_aktif);

        $pegawai = Peran::query()->where('nama_peran', PeranNama::PEGAWAI)->firstOrCreate(['nama_peran' => PeranNama::PEGAWAI], ['deskripsi' => 'x']);

        $this->actingAs($operator)->put('/pengguna/'.$operator->id_pengguna, [
            'peran' => [$pegawai->id_peran],
            'id_peran' => $pegawai->id_peran,
            'id_unit' => $operator->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'nip' => $operator->nip,
            'nama_lengkap' => $operator->nama_lengkap,
            'email' => $operator->email,
            'username' => $operator->username,
        ])->assertSessionHasErrors('peran');
    }

    public function test_operator_can_deactivate_another_operator_when_one_remains(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $lain = $this->akun(PeranNama::OPERATOR);

        $this->actingAs($operator)->patch('/pengguna/'.$lain->id_pengguna.'/status')->assertRedirect();

        $this->assertFalse($lain->refresh()->is_aktif);
    }

    public function test_sole_operator_is_protected_from_deactivation_by_a_second_request(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $lain = $this->akun(PeranNama::OPERATOR);

        // Operator pertama menonaktifkan yang kedua, lalu yang pertama menjadi satu-satunya.
        $this->actingAs($operator)->patch('/pengguna/'.$lain->id_pengguna.'/status');
        $this->assertTrue($operator->refresh()->adalahOperatorAktifTerakhir());

        // Aktifkan lagi yang kedua lalu pastikan operator terakhir yang sebenarnya tidak bisa ditonaktifkan orang lain.
        $this->actingAs($operator)->patch('/pengguna/'.$lain->id_pengguna.'/status');
        $this->assertTrue($lain->refresh()->is_aktif);
    }

    public function test_reset_password_changes_password_logs_and_ends_target_sessions(): void
    {
        config(['session.driver' => 'database']);

        $operator = $this->akun(PeranNama::OPERATOR);
        $target = $this->akun(PeranNama::PEGAWAI);

        \DB::table('sessions')->insert([
            'id' => 'sesi-target',
            'user_id' => $target->id_pengguna,
            'payload' => '',
            'last_activity' => time(),
        ]);

        $this->actingAs($operator)->post('/pengguna/'.$target->id_pengguna.'/reset-password', [
            'password' => 'Sandi-baru-1',
            'password_confirmation' => 'Sandi-baru-1',
        ])->assertRedirect();

        $this->assertTrue(\Hash::check('Sandi-baru-1', $target->refresh()->password_hash));
        $this->assertDatabaseMissing('sessions', ['id' => 'sesi-target']);
        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'reset_password',
            'id_data' => $target->id_pengguna,
            'id_pengguna' => $operator->id_pengguna,
        ]);
    }

    public function test_reset_password_requires_letters_and_numbers(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $target = $this->akun(PeranNama::PEGAWAI);

        $this->actingAs($operator)->post('/pengguna/'.$target->id_pengguna.'/reset-password', [
            'password' => 'hurufsaja',
            'password_confirmation' => 'hurufsaja',
        ])->assertSessionHasErrors('password');
    }

    public function test_log_can_be_filtered(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);

        \DB::table('log_aktivitas')->insert([
            ['id_pengguna' => $operator->id_pengguna, 'waktu' => '2026-11-10 08:00:00', 'aksi' => 'login', 'nama_tabel' => 'pengguna', 'id_data' => 1, 'detail' => null],
            ['id_pengguna' => $operator->id_pengguna, 'waktu' => '2026-11-12 08:00:00', 'aksi' => 'tambah', 'nama_tabel' => 'aset', 'id_data' => 5, 'detail' => '{"nama_barang":"Laptop"}'],
        ]);

        $this->actingAs($operator)->get('/log-aktivitas?aksi=tambah&tabel=aset')
            ->assertInertia(fn (Assert $page) => $page->has('log.data', 1)->where('log.data.0.nama_tabel', 'aset'));

        $this->actingAs($operator)->get('/log-aktivitas?dari=2026-11-11&sampai=2026-11-12')
            ->assertInertia(fn (Assert $page) => $page->has('log.data', 1)->where('log.data.0.aksi', 'tambah'));

        $this->actingAs($operator)->get('/log-aktivitas?dari=2026-11-12&sampai=2026-11-01')
            ->assertSessionHasErrors('sampai');
    }

    /**
     * @param  array<string, mixed>  $atribut
     */
    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        $user = User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);

        return $user;
    }
}
