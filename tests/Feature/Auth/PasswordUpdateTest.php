<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'password',
                'password' => 'Password-baru1',
                'password_confirmation' => 'Password-baru1',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertTrue(Hash::check('Password-baru1', $user->refresh()->password_hash));
    }

    public function test_new_password_must_contain_letters_and_numbers(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'password',
                'password' => 'hurufsaja',
                'password_confirmation' => 'hurufsaja',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_password_change_is_recorded_in_log(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->put('/password', [
            'current_password' => 'password',
            'password' => 'Password-baru1',
            'password_confirmation' => 'Password-baru1',
        ]);

        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'ubah_password',
            'id_pengguna' => $user->id_pengguna,
        ]);
    }

    public function test_correct_password_must_be_provided_to_update_password(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'wrong-password',
                'password' => 'Password-baru1',
                'password_confirmation' => 'Password-baru1',
            ]);

        $response
            ->assertSessionHasErrors('current_password')
            ->assertRedirect('/profile');
    }
}
