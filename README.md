# Sistem Informasi Pengelolaan Aset Tetap FTI

Fondasi untuk kelompok 11 (PPSI): autentikasi, peran, manajemen akun, log aktivitas, dan kerangka tampilan (layout, menu per peran, komponen bersama). Modul aset, pengajuan, pengadaan, dan laporan dibuat anggota tim di atas fondasi ini.

Stack: Laravel 12, Inertia + React, Tailwind CSS 3, Vite, MySQL.

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Buat database MySQL `asetfti`, lalu isi `DB_*` di `.env`.

```bash
php artisan migrate:fresh --seed
npm install
npm run dev
```

Jalankan server di terminal lain: `php artisan serve`.

Tes backend: `php artisan test` (tidak butuh `npm run build`).

## Akun pengembangan

Kata sandi semua akun: `password`

| Username | Peran |
|---|---|
| admin | Operator Aset Fakultas |
| pimpinan | Pimpinan |
| kepala | Kepala Kantor |
| pemohon | Pemohon + Pegawai/Dosen (dua peran) |
| pegawai | Pegawai/Dosen |
| teknisi | Teknisi Fakultas |

Akun contoh dan aset contoh hanya dibuat di environment lokal. Di `production`, seeder tidak membuat akun contoh. Untuk membuat admin awal, isi `ADMIN_AWAL_PASSWORD` di `.env`, jalankan seeder, lalu segera ganti kata sandinya lewat Profil saya.

## Aturan akun

- Login memakai `username`. Registrasi publik tidak dibuka.
- Satu akun boleh memiliki beberapa peran (contoh: Pemohon sekaligus Pegawai/Dosen). Peran utama (`pengguna.id_peran`) menentukan halaman awal; semua peran tercatat di tabel `pengguna_peran`. Menu sidebar dibuat satu kelompok per peran, dan route dengan `role:` lolos bila akun memiliki salah satu perannya.
- Tidak ada "lupa kata sandi" lewat email. Di halaman login, tombol "Lupa kata sandi?" menampilkan petunjuk menghubungi administrator. Kata sandi direset operator di menu Pengguna & hak akses; sesi lama akun tersebut diakhiri.
- Kata sandi: minimal 8 karakter, berisi huruf dan angka.
- Pemilik akun tidak bisa menghapus akunnya. Akun hanya dinonaktifkan operator.
- Operator aktif terakhir tidak bisa dinonaktifkan atau diganti perannya.
- Login memeriksa kata sandi lebih dulu, baru status akun, sehingga status akun tidak bocor ke orang yang tidak punya kata sandinya.
- Zona waktu aplikasi `Asia/Jakarta`, bahasa `id`.

## Konvensi untuk tim

### Hak akses
- Route yang butuh login memakai middleware `auth` dan `aktif`. Akun nonaktif ditolak.
- Batasan peran memakai middleware `role:` dengan slug `operator`, `pimpinan`, `kepala-kantor`, `pemohon`, `pegawai`, `teknisi`. Contoh: `->middleware('role:operator')`. Beberapa peran boleh digabung: `role:pemohon,pegawai`. Pemeriksaan ini terjadi di server; menyembunyikan menu saja tidak cukup.
- Di kode: `$user->hasRole('pemohon')`, `$user->hasAnyRole('pemohon', 'pegawai')`, `$user->namaSemuaPeran()`.
- Di controller, pakai `$this->authorize()` dengan Policy bila aturannya lebih rinci dari peran.

### Menambah modul (route dan menu)
Setiap menu sidebar sudah punya route sementara di `routes/modul.php` (halaman "Modul belum tersedia"), dan daftar menunya ada di satu tempat: `app/Support/MenuPeran.php`. Untuk membuat modul sungguhan, **ganti controller pada baris route-nya** dan biarkan nama route serta URL tetap:

```php
// routes/modul.php  (sebelum)
Route::get('/master-aset', $sementara)->defaults('judul', 'Master aset')->name('aset.index');

// sesudah
Route::get('/master-aset', [AsetController::class, 'index'])->name('aset.index');
```

Menu baru: tambahkan satu baris di `MenuPeran::MENU` pada peran yang boleh melihatnya, lalu daftarkan route-nya di `routes/modul.php`.

### Dashboard per peran
Dashboard tiap peran (`resources/js/Pages/Dashboard/*.jsx`) sudah sesuai Figma dan masih memakai DATA CONTOH dari `app/Support/DataContohDashboard.php`. Ganti pemanggilan di `DashboardController` dengan query nyata yang menghasilkan bentuk array yang sama, lalu hapus `<CatatanDataContoh />` dari halamannya. `/dashboard` mengarahkan ke dashboard peran utama.

### Membuat halaman baru

```jsx
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <AuthenticatedLayout>
            <Head title="Judul halaman" />
            <PageHeader judul="Judul halaman" deskripsi="Penjelasan singkat." />
            {/* isi halaman */}
        </AuthenticatedLayout>
    );
}
```

Letakkan file di `resources/js/Pages/<Modul>/<Halaman>.jsx`, lalu `Inertia::render('<Modul>/<Halaman>', [...])` di controller. Pesan berhasil (`->with('status', '...')`) dan gagal (`->withErrors(['status' => '...'])`) tampil otomatis di atas halaman.

### Komponen bersama (`resources/js/Components/ui`)

**Buka `/komponen` saat `npm run dev` + `php artisan serve` (environment local): galeri berisi contoh hidup dan kode salinan untuk setiap komponen.**

| Komponen | Fungsi |
|---|---|
| `PageHeader`, `Breadcrumb` | Judul halaman, jejak halaman, deskripsi, tombol aksi di kanan |
| `Card`, `IsiKartu` | Kotak konten; `judul`, `deskripsi`, dan `tautan` ("Lihat semua →") opsional |
| `DataTable` | Tabel bergaya desain: `kolom`, `baris`, `kunciBaris`, `kosong` |
| `Pagination` | Navigasi halaman untuk hasil `paginate()` |
| `StatCard`, `StatGrid` | Kartu indikator (angka besar + keterangan berwarna) |
| `Alert` | Banner info, sukses, peringatan, atau bahaya |
| `Badge`, `StatusText` | Status berbentuk pil atau teks berwarna |
| `TautanAksi`, `TombolLink` | Tautan aksi di tabel; tautan berbentuk tombol (jangan menaruh tombol di dalam tautan) |
| `ProgressList`, `BarChart`, `Timeline`, `QuickActions`, `InfoList` | Blok ringkasan dashboard |
| `SearchInput`, `SelectInput`, `Field`, `CheckboxGroup`, `FloatingInput` | Elemen form |
| `ConfirmDialog` | Konfirmasi sebelum aksi penting (nonaktifkan, hapus, setujui) |
| `EmptyState`, `TabNav`, `FlashMessage` | Data kosong, tab antarhalaman, pesan flash (sudah otomatis di layout) |

Tombol dasar: `PrimaryButton`, `SecondaryButton`, `DangerButton`. Contoh pemakaian lengkap ada di `Pages/Pengguna/Index.jsx` (pencarian, filter, tabel, konfirmasi) dan `Pages/Pengguna/Form.jsx` (form dengan `Field`).

Palet warna (hijau SIM Aset FTI) diatur di `tailwind.config.js`: `brand`, `ink`, `surface`, `line`, `warn`, `bahaya`, `info`. Pakai nama warna itu, bukan kode hex, supaya tampilan konsisten. Font: Inter.

Foto panel kiri halaman login: taruh file di `public/images/login-kampus.jpg`. Bila belum ada, panel tampil hijau polos.

### Log aktivitas
- Model domain yang sudah ada dicatat otomatis oleh `ActivityObserver` di `AppServiceProvider`. Model baru cukup memakai trait `App\Models\Concerns\LogsActivity`. Jangan pasang trait pada model yang sudah didaftarkan di provider (tercatat dua kali) atau pada `LogAktivitas`.
- Perubahan kata sandi tidak tercatat oleh observer, jadi dicatat eksplisit lewat `ActivityLogger::record(...)`. Lakukan hal serupa untuk aksi penting yang tidak lewat perubahan kolom biasa (persetujuan, cetak BAST, dan sebagainya).
- Sandi disimpan di kolom `password_hash` dan di-hash oleh cast model.

## Struktur singkat

- `database/migrations`: 22 tabel ERD, tabel `pengguna_peran` (peran ganda), dan tabel bawaan Laravel (`sessions`, `cache`, `jobs`, `password_reset_tokens`)
- `database/seeders`: peran, unit, akun contoh, data referensi, aset contoh (lokal)
- `app/Models`: satu model per tabel
- `app/Support/MenuPeran.php`: menu sidebar per peran (satu kelompok per peran)
- `app/Support/DataContohDashboard.php`: data contoh dashboard (ganti dengan query nyata)
- `routes/modul.php`: route sementara untuk semua menu
- `app/Http/Controllers`: `PenggunaController`, `LogAktivitasController`, `HakAksesController`, `DashboardController`, `ModulBelumTersediaController`
- `app/Http/Middleware/EnsureRole.php`: pembatasan peran
- `routes/web.php`: route group per peran
- `resources/js/Layouts`: layout utama dan layout login
- `resources/js/Components/ui`: komponen bersama
- `lang/id`: terjemahan pesan validasi
