<?php

namespace Tests\Feature;

use App\Models\Peran;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AksesDanLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_account_cannot_login(): void
    {
        $user = User::factory()->create(['is_aktif' => false]);

        $this->post('/login', [
            'username' => $user->username,
            'password' => 'password',
        ])->assertSessionHasErrors('username');

        $this->assertGuest();
        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'login_gagal',
            'id_pengguna' => $user->id_pengguna,
        ]);
    }

    public function test_successful_login_is_recorded(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'username' => $user->username,
            'password' => 'password',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();
        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'login',
            'id_pengguna' => $user->id_pengguna,
        ]);
    }

    public function test_wrong_role_cannot_open_account_management(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/pengguna')->assertForbidden();
    }

    public function test_operator_can_create_account_and_other_role_is_blocked_from_log(): void
    {
        $operator = $this->userWithRole(PeranNama::OPERATOR);
        $pegawai = $this->userWithRole(PeranNama::PEGAWAI);

        $this->actingAs($pegawai)->get('/log-aktivitas')->assertForbidden();

        $this->actingAs($operator)->post('/pengguna', [
            'peran' => [$pegawai->id_peran],
            'id_peran' => $pegawai->id_peran,
            'id_unit' => $operator->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'nip' => '1111111111',
            'nama_lengkap' => 'Akun Baru',
            'email' => 'baru@fti.ac.id',
            'username' => 'akunbaru',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ])->assertRedirect(route('pengguna.index'));

        $this->assertDatabaseHas('pengguna', ['username' => 'akunbaru']);
        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'tambah',
            'nama_tabel' => 'pengguna',
        ]);
    }

    public function test_operator_can_deactivate_another_account(): void
    {
        $operator = $this->userWithRole(PeranNama::OPERATOR);
        $target = User::factory()->create();

        $this->actingAs($operator)
            ->patch(route('pengguna.status', $target))
            ->assertRedirect();

        $this->assertFalse($target->refresh()->is_aktif);
        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'ubah',
            'nama_tabel' => 'pengguna',
            'id_data' => $target->id_pengguna,
        ]);
    }

    private function userWithRole(string $namaPeran): User
    {
        $peran = Peran::query()->firstOrCreate(
            ['nama_peran' => $namaPeran],
            ['deskripsi' => $namaPeran]
        );

        return User::factory()->create(['id_peran' => $peran->id_peran]);
    }
}
