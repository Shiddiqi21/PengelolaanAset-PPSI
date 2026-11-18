<?php

namespace Tests\Feature;

use App\Models\Ruangan;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KartuKendaliTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app['env'] = 'local';
        $this->seed(DatabaseSeeder::class);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get('/kartu-kendali');
        $response->assertRedirect('/login');
    }

    public function test_non_operator_cannot_access_kartu_kendali(): void
    {
        $teknisi = User::where('username', 'teknisi')->first();
        $response = $this->actingAs($teknisi)->get('/kartu-kendali');
        $response->assertForbidden();
    }

    public function test_operator_can_view_kartu_kendali_page(): void
    {
        $operator = User::where('username', 'admin')->first();

        $response = $this->actingAs($operator)->get('/kartu-kendali');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('KartuKendali/Index')
            ->has('daftarRuangan')
            ->has('ruanganAktif')
            ->has('penanggungJawab')
            ->has('daftarAset')
            ->has('tanggalPosisi')
            ->has('nomorDokumen')
            ->has('operatorNama')
        );
    }

    public function test_operator_can_switch_room_filter(): void
    {
        $operator = User::where('username', 'admin')->first();
        $ruangan = Ruangan::first();

        $this->assertNotNull($ruangan);

        $response = $this->actingAs($operator)->get('/kartu-kendali?ruangan=' . $ruangan->id_ruangan);

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('KartuKendali/Index')
            ->where('ruanganAktif.id_ruangan', $ruangan->id_ruangan)
        );
    }
}
