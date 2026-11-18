<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LaporanTest extends TestCase
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
        $response = $this->get('/laporan');
        $response->assertRedirect('/login');
    }

    public function test_operator_can_view_laporan_page(): void
    {
        $operator = User::where('username', 'admin')->first();

        $response = $this->actingAs($operator)->get('/laporan');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Laporan/Index')
            ->has('kpi')
            ->has('periode')
            ->has('sumberPembanding')
            ->has('daftarSelisih')
            ->has('daftarSesuai')
            ->has('rekapPerKategori')
            ->has('totalRekap')
        );
    }

    public function test_pimpinan_can_view_laporan_page(): void
    {
        $pimpinan = User::where('username', 'pimpinan')->first();

        $response = $this->actingAs($pimpinan)->get('/pimpinan/laporan');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Laporan/Index')
            ->has('kpi')
        );
    }

    public function test_pimpinan_can_view_pratinjau_laporan_page(): void
    {
        $pimpinan = User::where('username', 'pimpinan')->first();

        $response = $this->actingAs($pimpinan)->get('/pimpinan/laporan/pratinjau');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Laporan/Pratinjau')
            ->has('kpi')
            ->has('rekapPerKategori')
            ->has('totalRekap')
        );
    }

    public function test_kepala_kantor_can_view_laporan_page(): void
    {
        $kepala = User::where('username', 'kepala')->first();

        $response = $this->actingAs($kepala)->get('/kepala-kantor/laporan');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Laporan/Index')
            ->has('kpi')
        );
    }
}
