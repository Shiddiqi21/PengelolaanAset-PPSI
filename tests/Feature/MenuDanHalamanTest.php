<?php

namespace Tests\Feature;

use App\Models\Peran;
use App\Models\User;
use App\Support\PeranNama;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MenuDanHalamanTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Menu tiap peran mengikuti desain Figma.
     *
     * @return array<string, array{0: string, 1: string, 2: list<string>}>
     */
    public static function peranDanMenu(): array
    {
        return [
            'operator' => [PeranNama::OPERATOR, '/operator', [
                'Dashboard', 'Master aset', 'Lokasi & penanggung jawab', 'Pemeriksaan pengajuan', 'Penerimaan aset',
                'Mutasi aset', 'Penghapusan aset', 'Perbaikan aset', 'Pemeliharaan', 'Cetak label aset',
                'Kartu kendali ruangan', 'Pengguna & hak akses', 'Arsip BAST', 'Laporan & rekonsiliasi',
            ]],
            'pimpinan' => [PeranNama::PIMPINAN, '/pimpinan', ['Dashboard', 'Persetujuan pengajuan', 'Laporan aset']],
            'kepala kantor' => [PeranNama::KEPALA_KANTOR, '/kepala-kantor', ['Dashboard', 'Daftar pengajuan', 'Laporan aset']],
            'pemohon' => [PeranNama::PEMOHON, '/pemohon', [
                'Dashboard', 'Daftar aset unit', 'Pengajuan pengadaan', 'Pengajuan perbaikan', 'Pengajuan mutasi',
                'Pengajuan penghapusan', 'Daftar pengajuan', 'Riwayat perpindahan',
            ]],
            'pegawai' => [PeranNama::PEGAWAI, '/pegawai', ['Dashboard', 'Aset tanggung jawab pribadi']],
            'teknisi' => [PeranNama::TEKNISI, '/teknisi', ['Dashboard', 'Tugas perbaikan', 'Riwayat pekerjaan']],
        ];
    }

    /**
     * @param  list<string>  $menuDiharapkan
     */
    #[DataProvider('peranDanMenu')]
    public function test_each_role_sees_its_own_dashboard_and_menu(string $namaPeran, string $beranda, array $menuDiharapkan): void
    {
        $user = $this->akun($namaPeran);

        $this->actingAs($user)->get($beranda)->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('menu', fn ($menu) => collect($menu)->count() === 1
                    && $menu[0]['peran'] === $namaPeran
                    && collect($menu[0]['item'])->pluck('label')->all() === $menuDiharapkan));
    }

    #[DataProvider('peranDanMenu')]
    public function test_dashboard_url_redirects_to_the_role_home(string $namaPeran, string $beranda): void
    {
        $this->actingAs($this->akun($namaPeran))->get('/dashboard')->assertRedirect($beranda);
    }

    public function test_role_dashboard_is_blocked_for_other_roles(): void
    {
        $pegawai = $this->akun(PeranNama::PEGAWAI);

        foreach (['/operator', '/pimpinan', '/kepala-kantor', '/pemohon', '/teknisi', '/master-aset', '/pemohon/pengajuan'] as $url) {
            $this->actingAs($pegawai)->get($url)->assertForbidden();
        }
    }

    public function test_every_menu_item_opens_a_page(): void
    {
        foreach (self::peranDanMenu() as [$namaPeran]) {
            $user = $this->akun($namaPeran);

            $this->actingAs($user)->get('/dashboard')->assertRedirect();

            $menu = null;
            $this->actingAs($user)->get(route('profile.edit'))
                ->assertInertia(function (Assert $page) use (&$menu) {
                    $page->where('menu', function ($nilai) use (&$menu) {
                        $menu = $nilai;

                        return true;
                    });
                });

            foreach ($menu as $kelompok) {
                foreach ($kelompok['item'] as $item) {
                    $this->actingAs($user)->get($item['href'])->assertOk();
                }
            }
        }
    }

    public function test_active_menu_item_and_active_role_follow_current_route(): void
    {
        $this->actingAs($this->akun(PeranNama::OPERATOR))->get('/pengguna')
            ->assertInertia(fn (Assert $page) => $page
                ->where('peranAktif', PeranNama::OPERATOR)
                ->where('menu', function ($menu) {
                    $item = collect($menu[0]['item']);

                    return $item->firstWhere('label', 'Pengguna & hak akses')['aktif'] === true
                        && $item->firstWhere('label', 'Dashboard')['aktif'] === false;
                }));
    }

    public function test_operator_account_pages_keep_the_account_menu_active(): void
    {
        $operator = $this->akun(PeranNama::OPERATOR);

        foreach (['/hak-akses', '/log-aktivitas', '/pengguna/create'] as $url) {
            $this->actingAs($operator)->get($url)
                ->assertInertia(fn (Assert $page) => $page->where(
                    'menu',
                    fn ($menu) => collect($menu[0]['item'])->firstWhere('label', 'Pengguna & hak akses')['aktif'] === true
                ));
        }
    }

    public function test_access_page_lists_every_role_with_its_menu(): void
    {
        foreach (PeranNama::SLUG as $nama) {
            Peran::query()->firstOrCreate(['nama_peran' => $nama], ['deskripsi' => $nama]);
        }

        $this->actingAs($this->akun(PeranNama::OPERATOR))->get('/hak-akses')
            ->assertInertia(fn (Assert $page) => $page->component('HakAkses/Index')->has('peran', 6)
                ->where('peran.1.menu', ['Dashboard', 'Persetujuan pengajuan', 'Laporan aset']));
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/pengguna')->assertRedirect('/login');
        $this->get('/operator')->assertRedirect('/login');
    }

    public function test_profile_page_shows_account_details(): void
    {
        $user = $this->akun(PeranNama::PEGAWAI);

        $this->actingAs($user)->get('/profile')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('akun.username', $user->username)
                ->where('akun.peran', PeranNama::PEGAWAI));
    }

    public function test_shared_props_carry_date_and_role_label(): void
    {
        $this->actingAs($this->akun(PeranNama::PEGAWAI))->get('/pegawai')
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.user.peran_label', PeranNama::PEGAWAI)
                ->where('tanggal', now()->locale('id')->translatedFormat('j F Y')));
    }

    public function test_component_gallery_is_only_available_in_local(): void
    {
        $this->actingAs($this->akun(PeranNama::PEGAWAI))->get('/komponen')->assertNotFound();
    }

    private function akun(string $namaPeran): User
    {
        $peran = Peran::query()->firstOrCreate(['nama_peran' => $namaPeran], ['deskripsi' => $namaPeran]);

        return User::factory()->create(['id_peran' => $peran->id_peran]);
    }
}
