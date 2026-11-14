<?php

namespace Tests\Feature;

use App\Models\Aset;
use App\Models\Peran;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_roles_and_one_account_per_role_and_is_repeatable(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(6, Peran::count());
        $this->assertSame(6, User::count());
        $this->assertTrue(User::where('username', 'admin')->first()->isOperator());

        // Akun contoh 'pemohon' memiliki dua peran, seperti pada desain.
        $this->assertSame(
            ['Pemohon', 'Pegawai/Dosen'],
            User::where('username', 'pemohon')->first()->namaSemuaPeran()
        );
    }

    public function test_sample_assets_are_only_seeded_in_local(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(0, Aset::count());

        $this->app['env'] = 'local';
        $this->seed(DatabaseSeeder::class);
        $this->assertGreaterThan(0, Aset::count());
    }

    public function test_production_seeding_skips_sample_accounts_without_initial_password(): void
    {
        putenv('ADMIN_AWAL_PASSWORD');
        $this->app['env'] = 'production';

        $this->jalankanSeeder();

        $this->assertSame(6, Peran::count());
        $this->assertSame(0, User::count());
    }

    public function test_production_seeding_creates_only_admin_with_initial_password(): void
    {
        putenv('ADMIN_AWAL_PASSWORD=Rahasia-awal-1');
        $this->app['env'] = 'production';

        try {
            $this->jalankanSeeder();
        } finally {
            putenv('ADMIN_AWAL_PASSWORD');
        }

        $this->assertSame(1, User::count());
        $this->assertTrue(\Hash::check('Rahasia-awal-1', User::first()->password_hash));
    }

    /**
     * Perintah db:seed menolak berjalan di production tanpa --force, jadi seeder dipanggil langsung.
     */
    private function jalankanSeeder(): void
    {
        $this->app->make(DatabaseSeeder::class)->setContainer($this->app)->__invoke();
    }
}
