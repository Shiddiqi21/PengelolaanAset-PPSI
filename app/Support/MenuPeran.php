<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/**
 * Satu-satunya sumber menu sidebar per peran (sesuai desain Figma).
 *
 * Akun dengan beberapa peran melihat satu kelompok menu untuk tiap perannya
 * (peran utama paling atas).
 *
 * Cara menambah atau mengubah menu: edit baris pada MENU di bawah.
 *   'label'       teks menu
 *   'route'       nama route tujuan
 *   'cocok'       pola nama route yang menandai menu ini sedang aktif
 *   'labelGanda'  (opsional) teks pengganti bila akun memiliki lebih dari satu peran
 *   'grup'        (opsional) nama sub-kelompok menu di sidebar (kosong/null untuk menu utama seperti Dashboard)
 * Menu otomatis disembunyikan selama route-nya belum terdaftar.
 * Pembatasan akses sebenarnya tetap lewat middleware role: pada route, bukan lewat menu.
 */
final class MenuPeran
{
    private const MENU = [
        'operator' => [
            ['label' => 'Dashboard', 'route' => 'operator.dashboard', 'cocok' => ['operator.dashboard']],

            ['grup' => 'Data & Inventaris', 'label' => 'Master aset', 'route' => 'aset.index', 'cocok' => ['aset.*']],
            ['grup' => 'Data & Inventaris', 'label' => 'Lokasi & penanggung jawab', 'route' => 'lokasi.index', 'cocok' => ['lokasi.*']],
            ['grup' => 'Data & Inventaris', 'label' => 'Cetak label aset', 'route' => 'label.index', 'cocok' => ['label.*']],
            ['grup' => 'Data & Inventaris', 'label' => 'Kartu kendali ruangan', 'route' => 'kartu-kendali.index', 'cocok' => ['kartu-kendali.*']],

            ['grup' => 'Pengajuan & Siklus Aset', 'label' => 'Pemeriksaan pengajuan', 'route' => 'pemeriksaan.index', 'cocok' => ['pemeriksaan.*']],
            ['grup' => 'Pengajuan & Siklus Aset', 'label' => 'Penerimaan aset', 'route' => 'penerimaan.index', 'cocok' => ['penerimaan.*']],
            ['grup' => 'Pengajuan & Siklus Aset', 'label' => 'Mutasi aset', 'route' => 'mutasi.index', 'cocok' => ['mutasi.*']],
            ['grup' => 'Pengajuan & Siklus Aset', 'label' => 'Penghapusan aset', 'route' => 'penghapusan.index', 'cocok' => ['penghapusan.*']],

            ['grup' => 'Perawatan Aset', 'label' => 'Perbaikan aset', 'route' => 'perbaikan.index', 'cocok' => ['perbaikan.*']],
            ['grup' => 'Perawatan Aset', 'label' => 'Pemeliharaan', 'route' => 'pemeliharaan.index', 'cocok' => ['pemeliharaan.*']],

            ['grup' => 'Dokumen & Laporan', 'label' => 'Arsip BAST', 'route' => 'bast.index', 'cocok' => ['bast.*']],
            ['grup' => 'Dokumen & Laporan', 'label' => 'Laporan & rekonsiliasi', 'route' => 'laporan.index', 'cocok' => ['laporan.*']],

            ['grup' => 'Administrasi', 'label' => 'Pengguna & hak akses', 'route' => 'pengguna.index', 'cocok' => ['pengguna.*', 'unit.*', 'hak-akses.*', 'log-aktivitas.*']],
        ],
        'pimpinan' => [
            ['label' => 'Dashboard', 'route' => 'pimpinan.dashboard', 'cocok' => ['pimpinan.dashboard']],
            ['label' => 'Persetujuan pengajuan', 'route' => 'pimpinan.persetujuan', 'cocok' => ['pimpinan.persetujuan', 'pimpinan.persetujuan.*']],
            ['label' => 'Laporan aset', 'route' => 'pimpinan.laporan', 'cocok' => ['pimpinan.laporan', 'pimpinan.laporan.*']],
        ],
        'kepala-kantor' => [
            ['label' => 'Dashboard', 'route' => 'kepala-kantor.dashboard', 'cocok' => ['kepala-kantor.dashboard']],
            ['label' => 'Daftar pengajuan', 'route' => 'kepala-kantor.pengajuan', 'cocok' => ['kepala-kantor.pengajuan', 'kepala-kantor.pengajuan.*']],
            ['label' => 'Laporan aset', 'route' => 'kepala-kantor.laporan', 'cocok' => ['kepala-kantor.laporan', 'kepala-kantor.laporan.*']],
        ],
        'pemohon' => [
            ['label' => 'Dashboard', 'route' => 'pemohon.dashboard', 'cocok' => ['pemohon.dashboard']],

            ['grup' => 'Inventaris Unit', 'label' => 'Daftar aset unit', 'route' => 'pemohon.aset-unit', 'cocok' => ['pemohon.aset-unit', 'pemohon.aset-unit.*']],
            ['grup' => 'Inventaris Unit', 'label' => 'Riwayat perpindahan', 'route' => 'pemohon.riwayat-perpindahan', 'cocok' => ['pemohon.riwayat-perpindahan', 'pemohon.riwayat-perpindahan.*']],

            ['grup' => 'Pengajuan', 'label' => 'Daftar pengajuan', 'route' => 'pemohon.pengajuan', 'cocok' => ['pemohon.pengajuan', 'pemohon.pengajuan.show', 'pemohon.pengajuan.edit', 'pemohon.pengajuan.update', 'pemohon.pengajuan.kirim']],
            ['grup' => 'Pengajuan', 'label' => 'Pengajuan pengadaan', 'route' => 'pemohon.pengadaan', 'cocok' => ['pemohon.pengadaan', 'pemohon.pengadaan.*']],
            ['grup' => 'Pengajuan', 'label' => 'Pengajuan perbaikan', 'route' => 'pemohon.perbaikan', 'cocok' => ['pemohon.perbaikan', 'pemohon.perbaikan.*']],
            ['grup' => 'Pengajuan', 'label' => 'Pengajuan mutasi', 'route' => 'pemohon.mutasi', 'cocok' => ['pemohon.mutasi', 'pemohon.mutasi.*', 'pemohon.pengajuan.mutasi.*']],
            ['grup' => 'Pengajuan', 'label' => 'Pengajuan penghapusan', 'route' => 'pemohon.penghapusan', 'cocok' => ['pemohon.penghapusan', 'pemohon.penghapusan.*', 'pemohon.pengajuan.penghapusan.*']],
        ],
        'pegawai' => [
            ['label' => 'Dashboard', 'labelGanda' => 'Dashboard pribadi', 'route' => 'pegawai.dashboard', 'cocok' => ['pegawai.dashboard']],
            ['label' => 'Aset tanggung jawab pribadi', 'route' => 'pegawai.aset', 'cocok' => ['pegawai.aset', 'pegawai.aset.*']],
        ],
        'teknisi' => [
            ['label' => 'Dashboard', 'route' => 'teknisi.dashboard', 'cocok' => ['teknisi.dashboard']],
            ['label' => 'Tugas perbaikan', 'route' => 'teknisi.tugas', 'cocok' => ['teknisi.tugas', 'teknisi.tugas.*']],
            ['label' => 'Riwayat pekerjaan', 'route' => 'teknisi.riwayat', 'cocok' => ['teknisi.riwayat', 'teknisi.riwayat.*']],
        ],
    ];

    /**
     * Menu sidebar akun ini, dikelompokkan per peran.
     *
     * @return list<array{peran: string, aktif: bool, item: list<array{label: string, href: string, aktif: bool, grup: ?string}>}>
     */
    public static function untuk(User $user, Request $request): array
    {
        $namaPeran = $user->namaSemuaPeran();
        $ganda = count($namaPeran) > 1;
        $kelompok = [];

        foreach ($namaPeran as $nama) {
            $item = array_map(
                fn (array $menu) => [
                    'label' => $ganda ? ($menu['labelGanda'] ?? $menu['label']) : $menu['label'],
                    'href' => route($menu['route'], absolute: false),
                    'aktif' => $request->routeIs(...$menu['cocok']),
                    'grup' => $menu['grup'] ?? null,
                ],
                self::itemTersedia($nama)
            );

            if ($item === []) {
                continue;
            }

            $kelompok[] = [
                'peran' => $nama,
                'aktif' => in_array(true, array_column($item, 'aktif'), true),
                'item' => $item,
            ];
        }

        return $kelompok;
    }

    /**
     * Peran yang sedang dipakai: kelompok menu yang memuat halaman terbuka,
     * atau peran utama bila halamannya tidak ada di menu (misalnya Profil).
     */
    public static function peranAktif(User $user, Request $request): ?string
    {
        foreach (self::untuk($user, $request) as $kelompok) {
            if ($kelompok['aktif']) {
                return $kelompok['peran'];
            }
        }

        return $user->peran?->nama_peran;
    }

    /**
     * Alamat beranda akun: menu pertama pada peran utama.
     */
    public static function beranda(User $user): ?string
    {
        foreach ($user->namaSemuaPeran() as $nama) {
            $item = self::itemTersedia($nama);

            if ($item !== []) {
                return route($item[0]['route'], absolute: false);
            }
        }

        return null;
    }

    /**
     * Label menu sebuah peran (untuk halaman Hak akses).
     *
     * @return list<string>
     */
    public static function labelUntuk(?string $namaPeran): array
    {
        return array_map(fn (array $menu) => $menu['label'], self::itemTersedia($namaPeran));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function itemTersedia(?string $namaPeran): array
    {
        $slug = array_search($namaPeran, PeranNama::SLUG, true);

        if ($slug === false) {
            return [];
        }

        return array_values(array_filter(
            self::MENU[$slug] ?? [],
            fn (array $menu) => Route::has($menu['route'])
        ));
    }
}
