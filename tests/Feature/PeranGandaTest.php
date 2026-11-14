<?php

namespace Tests\Feature;

use App\Models\Peran;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PeranGandaTest extends TestCase
{
    use RefreshDatabase;

    public function test_primary_role_is_always_part_of_all_roles(): void
    {
        $user = $this->akun(PeranNama::PEMOHON);

        $this->assertSame([PeranNama::PEMOHON], $user->namaSemuaPeran());
        $this->assertDatabaseHas('pengguna_peran', ['id_pengguna' => $user->id_pengguna, 'id_peran' => $user->id_peran]);
    }

    public function test_account_with_two_roles_gets_both_menu_groups_with_primary_first(): void
    {
        $user = $this->akun(PeranNama::PEMOHON, [PeranNama::PEGAWAI]);

        $this->actingAs($user)->get('/pemohon')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('menu', function ($menu) {
                $menu = collect($menu);

                return $menu->pluck('peran')->all() === [PeranNama::PEMOHON, PeranNama::PEGAWAI]
                    && $menu[1]['item'][0]['label'] === 'Dashboard pribadi'
                    && $menu[1]['item'][1]['label'] === 'Aset tanggung jawab pribadi';
            })
                ->where('auth.user.peran_label', 'Pegawai/Dosen + Pemohon')
                ->where('peranAktif', PeranNama::PEMOHON));
    }

    public function test_active_role_switches_to_the_group_of_the_open_page(): void
    {
        $user = $this->akun(PeranNama::PEMOHON, [PeranNama::PEGAWAI]);

        $this->actingAs($user)->get('/pegawai')
            ->assertInertia(fn (Assert $page) => $page->where('peranAktif', PeranNama::PEGAWAI));
    }

    public function test_secondary_role_can_open_its_own_pages_but_not_other_roles(): void
    {
        $user = $this->akun(PeranNama::PEMOHON, [PeranNama::PEGAWAI]);

        $this->actingAs($user)->get('/pegawai')->assertOk();
        $this->actingAs($user)->get('/pegawai/aset')->assertOk();
        $this->actingAs($user)->get('/pemohon/pengajuan')->assertOk();
        $this->actingAs($user)->get('/teknisi')->assertForbidden();
        $this->actingAs($user)->get('/pengguna')->assertForbidden();
    }

    public function test_dashboard_goes_to_primary_role_home(): void
    {
        $user = $this->akun(PeranNama::PEGAWAI, [PeranNama::PEMOHON]);

        $this->actingAs($user)->get('/dashboard')->assertRedirect('/pegawai');
    }

    public function test_pemohon_dashboard_explains_the_two_roles_only_for_dual_accounts(): void
    {
        $this->actingAs($this->akun(PeranNama::PEMOHON, [PeranNama::PEGAWAI]))->get('/pemohon')
            ->assertInertia(fn (Assert $page) => $page->where('banner.nada', 'info'));

        $this->actingAs($this->akun(PeranNama::PEMOHON))->get('/pemohon')
            ->assertInertia(fn (Assert $page) => $page->where('banner', null));
    }

    public function test_operator_can_create_an_account_with_several_roles(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->peran(PeranNama::PEMOHON);
        $pegawai = $this->peran(PeranNama::PEGAWAI);

        $this->actingAs($operator)->post('/pengguna', [
            'peran' => [$pemohon->id_peran, $pegawai->id_peran],
            'id_peran' => $pemohon->id_peran,
            'id_unit' => $operator->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'nip' => '123',
            'nama_lengkap' => 'Akun Ganda',
            'email' => 'ganda@fti.ac.id',
            'username' => 'ganda',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ])->assertRedirect(route('pengguna.index'));

        $baru = User::where('username', 'ganda')->first();

        $this->assertSame([PeranNama::PEMOHON, PeranNama::PEGAWAI], $baru->namaSemuaPeran());
        $this->assertDatabaseHas('log_aktivitas', ['aksi' => 'ubah_peran', 'id_data' => $baru->id_pengguna]);
    }

    public function test_primary_role_must_be_one_of_the_selected_roles(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pemohon = $this->peran(PeranNama::PEMOHON);
        $teknisi = $this->peran(PeranNama::TEKNISI);

        $this->actingAs($operator)->post('/pengguna', [
            'peran' => [$pemohon->id_peran],
            'id_peran' => $teknisi->id_peran,
            'id_unit' => $operator->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'nama_lengkap' => 'Salah',
            'email' => 'salah@fti.ac.id',
            'username' => 'salah',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ])->assertSessionHasErrors('id_peran');
    }

    public function test_at_least_one_role_is_required(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);

        $this->actingAs($operator)->post('/pengguna', [
            'peran' => [],
            'id_peran' => '',
            'id_unit' => $operator->id_unit,
            'id_sub_unit' => $operator->id_sub_unit,
            'nama_lengkap' => 'Tanpa Peran',
            'email' => 'tanpa@fti.ac.id',
            'username' => 'tanpa',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ])->assertSessionHasErrors('peran');
    }

    public function test_operator_can_change_roles_of_another_account(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $target = $this->akun(PeranNama::PEGAWAI);
        $pemohon = $this->peran(PeranNama::PEMOHON);

        $this->actingAs($operator)->put('/pengguna/'.$target->id_pengguna, [
            'peran' => [$target->id_peran, $pemohon->id_peran],
            'id_peran' => $target->id_peran,
            'id_unit' => $target->id_unit,
            'id_sub_unit' => $target->id_sub_unit,
            'nip' => $target->nip,
            'nama_lengkap' => $target->nama_lengkap,
            'email' => $target->email,
            'username' => $target->username,
        ])->assertRedirect(route('pengguna.index'));

        $this->assertSame([PeranNama::PEGAWAI, PeranNama::PEMOHON], $target->fresh()->namaSemuaPeran());
        $this->assertDatabaseHas('log_aktivitas', ['aksi' => 'ubah_peran', 'id_data' => $target->id_pengguna]);
    }

    public function test_operator_role_can_be_removed_from_another_operator_while_the_actor_remains(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $pegawai = $this->peran(PeranNama::PEGAWAI);
        $lain = $this->akun(PeranNama::PIMPINAN, [PeranNama::OPERATOR]);

        $this->assertFalse($lain->adalahOperatorAktifTerakhir());

        $this->actingAs($operator)->put('/pengguna/'.$lain->id_pengguna, $this->payloadUbahPeran($lain, [$pegawai->id_peran], $pegawai->id_peran))
            ->assertRedirect(route('pengguna.index'));

        $this->assertFalse($lain->fresh()->hasRole('operator'));
        $this->assertTrue($operator->fresh()->adalahOperatorAktifTerakhir());
    }

    public function test_operator_role_can_be_given_as_secondary_role_and_unlocks_operator_pages(): void
    {
        $user = $this->akun(PeranNama::PEGAWAI, [PeranNama::OPERATOR]);

        $this->actingAs($user)->get('/pengguna')->assertOk();
        $this->actingAs($user)->get('/operator')->assertOk();
    }

    public function test_account_list_shows_all_roles_and_filters_by_secondary_role(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $ganda = $this->akun(PeranNama::PEMOHON, [PeranNama::PEGAWAI]);
        $this->akun(PeranNama::TEKNISI);
        $pegawai = $this->peran(PeranNama::PEGAWAI);

        $this->actingAs($operator)->get('/pengguna?peran='.$pegawai->id_peran)
            ->assertInertia(fn (Assert $page) => $page->has('pengguna.data', 1)
                ->where('pengguna.data.0.id_pengguna', $ganda->id_pengguna)
                ->where('pengguna.data.0.peran', [PeranNama::PEMOHON, PeranNama::PEGAWAI]));
    }

    public function test_access_page_counts_accounts_by_all_roles(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $this->akun(PeranNama::PEMOHON, [PeranNama::PEGAWAI]);
        $this->akun(PeranNama::PEGAWAI);

        $this->actingAs($operator)->get('/hak-akses')
            ->assertInertia(fn (Assert $page) => $page->where('peran', function ($peran) {
                $peran = collect($peran)->keyBy('nama_peran');

                return $peran[PeranNama::PEGAWAI]['akun_total'] === 2 && $peran[PeranNama::PEMOHON]['akun_total'] === 1;
            }));
    }

    /**
     * @param  list<int>  $idPeran
     * @return array<string, mixed>
     */
    private function payloadUbahPeran(User $user, array $idPeran, int $utama): array
    {
        return [
            'peran' => $idPeran,
            'id_peran' => $utama,
            'id_unit' => $user->id_unit,
            'id_sub_unit' => $user->id_sub_unit,
            'nip' => $user->nip,
            'nama_lengkap' => $user->nama_lengkap,
            'email' => $user->email,
            'username' => $user->username,
        ];
    }

    private function peran(string $nama): Peran
    {
        return Peran::query()->firstOrCreate(['nama_peran' => $nama], ['deskripsi' => $nama]);
    }

    /**
     * @param  list<string>  $peranTambahan
     */
    private function akun(string $namaPeran, array $peranTambahan = []): User
    {
        $user = User::factory()->create(['id_peran' => $this->peran($namaPeran)->id_peran]);

        foreach ($peranTambahan as $nama) {
            $user->semuaPeran()->attach($this->peran($nama)->id_peran);
        }

        return $user->fresh();
    }
}
