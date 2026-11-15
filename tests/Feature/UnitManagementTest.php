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

class UnitManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_can_manage_units_and_sub_units(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);

        $this->actingAs($operator)
            ->get('/unit')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Unit/Index'));

        // Tambah unit baru
        $this->actingAs($operator)
            ->post('/unit', [
                'nama_unit' => 'Departemen Sistem Informasi',
                'jenis_unit' => 'departemen',
            ])
            ->assertRedirect('/unit');

        $unitBaru = Unit::query()->where('nama_unit', 'Departemen Sistem Informasi')->firstOrFail();

        // Ubah unit
        $this->actingAs($operator)
            ->put('/unit/'.$unitBaru->id_unit, [
                'nama_unit' => 'Departemen Sistem Informasi FTI',
                'jenis_unit' => 'departemen',
            ])
            ->assertRedirect('/unit');

        $this->assertDatabaseHas('unit', [
            'id_unit' => $unitBaru->id_unit,
            'nama_unit' => 'Departemen Sistem Informasi FTI',
        ]);

        // Tambah sub-unit di bawah unit baru
        $this->actingAs($operator)
            ->post('/sub-unit', [
                'id_unit' => $unitBaru->id_unit,
                'nama_sub_unit' => 'Lab Sistem Enterprise',
                'jenis_sub_unit' => 'laboratorium',
            ])
            ->assertRedirect('/unit');

        $subUnitBaru = SubUnit::query()->where('nama_sub_unit', 'Lab Sistem Enterprise')->firstOrFail();

        // Unit yang masih punya sub-unit tidak boleh dihapus
        $this->actingAs($operator)
            ->delete('/unit/'.$unitBaru->id_unit)
            ->assertSessionHasErrors('status');

        // Ubah sub-unit
        $this->actingAs($operator)
            ->put('/sub-unit/'.$subUnitBaru->id_sub_unit, [
                'id_unit' => $unitBaru->id_unit,
                'nama_sub_unit' => 'Lab Enterprise & Bisnis Digital',
                'jenis_sub_unit' => 'laboratorium',
            ])
            ->assertRedirect('/unit');

        // Hapus sub-unit yang belum dipakai akun/ruangan, lalu hapus unitnya
        $this->actingAs($operator)
            ->delete('/sub-unit/'.$subUnitBaru->id_sub_unit)
            ->assertRedirect('/unit');

        $this->actingAs($operator)
            ->delete('/unit/'.$unitBaru->id_unit)
            ->assertRedirect('/unit');

        $this->assertDatabaseMissing('sub_unit', ['id_sub_unit' => $subUnitBaru->id_sub_unit]);
        $this->assertDatabaseMissing('unit', ['id_unit' => $unitBaru->id_unit]);
    }

    public function test_used_unit_or_sub_unit_cannot_be_deleted_or_reparented(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);
        $unitLain = Unit::query()->create([
            'nama_unit' => 'Departemen Teknik Komputer',
            'jenis_unit' => 'departemen',
        ]);

        // Unit dan sub-unit milik operator sedang dipakai akun operator
        $this->actingAs($operator)
            ->delete('/unit/'.$operator->id_unit)
            ->assertSessionHasErrors('status');

        $this->actingAs($operator)
            ->delete('/sub-unit/'.$operator->id_sub_unit)
            ->assertSessionHasErrors('status');

        $this->actingAs($operator)
            ->put('/sub-unit/'.$operator->id_sub_unit, [
                'id_unit' => $unitLain->id_unit,
                'nama_sub_unit' => 'Sub Unit Dipindah',
                'jenis_sub_unit' => 'tata_usaha',
            ])
            ->assertSessionHasErrors('status');
    }

    public function test_non_operator_cannot_access_unit_management(): void
    {
        $pemohon = $this->akun(PeranNama::PEMOHON);

        $this->actingAs($pemohon)->get('/unit')->assertForbidden();
        $this->actingAs($pemohon)->post('/unit', [
            'nama_unit' => 'Unit Ilegal',
            'jenis_unit' => 'departemen',
        ])->assertForbidden();
    }

    /**
     * @param  array<string, mixed>  $atribut
     */
    private function akun(string $namaPeran, array $atribut = []): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran, ...$atribut]);
    }
}
