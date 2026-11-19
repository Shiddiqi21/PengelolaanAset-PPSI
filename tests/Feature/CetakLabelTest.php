<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\KategoriAset;
use App\Models\Peran;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CetakLabelTest extends TestCase
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
        $response = $this->get('/cetak-label');
        $response->assertRedirect('/login');
    }

    public function test_non_operator_cannot_access_cetak_label(): void
    {
        $teknisi = User::where('username', 'teknisi')->first();
        $response = $this->actingAs($teknisi)->get('/cetak-label');
        $response->assertForbidden();
    }

    public function test_operator_can_view_cetak_label_page_with_seeded_assets(): void
    {
        $operator = User::where('username', 'admin')->first();

        $response = $this->actingAs($operator)->get('/cetak-label');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Label/Index')
            ->has('daftarAset.data')
            ->has('opsiKategori')
            ->has('filter')
        );
    }

    public function test_filter_by_keyword_searches_code_and_name(): void
    {
        $operator = User::where('username', 'admin')->first();

        $response = $this->actingAs($operator)->get('/cetak-label?q=FTI-2024-0001');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Label/Index')
            ->where('filter.q', 'FTI-2024-0001')
            ->has('daftarAset.data', 1)
            ->where('daftarAset.data.0.kode_aset', 'FTI-2024-0001')
        );
    }
}
