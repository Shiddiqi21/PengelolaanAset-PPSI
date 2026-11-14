<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_status_is_not_revealed_without_the_correct_password(): void
    {
        $user = User::factory()->create(['is_aktif' => false]);

        $this->post('/login', ['username' => $user->username, 'password' => 'salah-total'])
            ->assertSessionHasErrors(['username' => 'Username atau kata sandi salah.']);
    }

    public function test_inactive_account_with_correct_password_is_told_it_is_inactive(): void
    {
        $user = User::factory()->create(['is_aktif' => false]);

        $this->post('/login', ['username' => $user->username, 'password' => 'password'])
            ->assertSessionHasErrors('username');

        $this->assertGuest();
        $this->assertStringContainsString(
            'nonaktif',
            session('errors')->first('username')
        );
    }

    public function test_unknown_username_gets_the_same_message_and_is_logged_without_user(): void
    {
        $this->post('/login', ['username' => 'tidak-ada', 'password' => 'apa-saja'])
            ->assertSessionHasErrors(['username' => 'Username atau kata sandi salah.']);

        $this->assertDatabaseHas('log_aktivitas', [
            'aksi' => 'login_gagal',
            'id_pengguna' => null,
        ]);
    }

    public function test_login_is_locked_after_five_failed_attempts(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['username' => $user->username, 'password' => 'salah']);
        }

        $this->post('/login', ['username' => $user->username, 'password' => 'password'])
            ->assertSessionHasErrors('username');

        $this->assertGuest();
        $this->assertStringContainsString('Terlalu banyak', session('errors')->first('username'));
    }

    public function test_public_registration_and_email_reset_are_not_available(): void
    {
        $this->get('/register')->assertNotFound();
        $this->get('/forgot-password')->assertNotFound();
        $this->post('/forgot-password')->assertNotFound();
        $this->get('/reset-password/token')->assertNotFound();
    }
}
