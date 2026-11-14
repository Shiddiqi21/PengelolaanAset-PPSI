<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PeranDanAdminSeeder::class,
            ReferensiSeeder::class,
            AsetContohSeeder::class,
        ]);
    }
}
