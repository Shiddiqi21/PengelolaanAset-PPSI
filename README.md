# Sistem Informasi Pengelolaan Aset Tetap FTI Universitas Andalas (SIM Aset FTI)

> **Panduan Referensi Utama (Single Source of Truth) — Kelompok 11 PPSI**
> Dokumen ini diselaraskan langsung dengan **GitHub Project #4 (`PROJECT PENGELOLAAN ASET FTI`)**, **61 GitHub Issues**, **Dokumen PRD (A1–A3 & SOP BMN FTI)**, **ERD 22 Tabel**, dan **46 Frame Desain Figma**. Dirancang agar seluruh anggota tim (`hasbi`, `fatih`, `trici`, `fathiya`, `naisya`) maupun *AI Coding Assistant* dapat langsung mengerjakan Issue masing-masing tanpa salah sentuh file anggota lain dan dengan pemakaian *token* seminimal mungkin.

---

## Daftar Isi
1. [Ringkasan Proyek, Modul Resmi (M1–M5) & Aturan Bisnis PRD](#1-ringkasan-proyek-modul-resmi-m1m5--aturan-bisnis-prd)
2. [Matriks Pembagian Tugas Tim (GitHub Project #4 & Issues #10–#61)](#2-matriks-pembagian-tugas-tim-github-project-4--issues-1061)
3. [Kontrak Integrasi Antar-Modul (Panduan Anti-Konflik Git)](#3-kontrak-integrasi-antar-modul-panduan-anti-konflik-git)
4. [Setup & Perintah Pengembangan](#4-setup--perintah-pengembangan)
5. [Peran Pengguna (RBAC) & Akun Pengembangan](#5-peran-pengguna-rbac--akun-pengembangan)
6. [Peta Desain Figma Lengkap (46 Frame, Node ID, Route & PIC Issue)](#6-peta-desain-figma-lengkap-46-frame-node-id-route--pic-issue)
7. [Referensi Skema Database (22 Tabel ERD + Pivot)](#7-referensi-skema-database-22-tabel-erd--pivot)
8. [Daftar Lengkap Nilai ENUM Database (10 Kolom)](#8-daftar-lengkap-nilai-enum-database-10-kolom)
9. [Arsitektur, Konvensi Kode & Panduan Modul Baru](#9-arsitektur-konvensi-kode--panduan-modul-baru)
10. [Komponen UI Bersama & Sistem Desain Tailwind](#10-komponen-ui-bersama--sistem-desain-tailwind)
11. [Struktur Direktori Penting](#11-struktur-direktori-penting)

---

## 1. Ringkasan Proyek, Modul Resmi (M1–M5) & Aturan Bisnis PRD

### Konteks Sistem
- **Nama Sistem:** Sistem Informasi Pengelolaan Aset Tetap Fakultas Teknologi Informasi (FTI) Universitas Andalas.
- **Metode Pengembangan:** SDLC Prototype (Kelompok 11 — Mata Kuliah PPSI).
- **Repository:** `https://github.com/Shiddiqi21/PengelolaanAset-PPSI`
- **GitHub Project Board:** [PROJECT PENGELOLAAN ASET FTI (Project #4)](https://github.com/users/Shiddiqi21/projects/4)
- **Tech Stack:** Laravel 12 (PHP 8.2+), MySQL (`asetfti`), Inertia.js + React 18, Tailwind CSS 3, Vite 7.
- **Zona Waktu & Bahasa:** `Asia/Jakarta` (`id` / Bahasa Indonesia untuk seluruh teks antarmuka pengguna).

### Struktur 5 Modul Resmi Proyek (Sesuai GitHub Project #4)
Sesuai dokumen perencanaan dan pembagian di GitHub Project #4, sistem dibagi menjadi **5 Modul Utama (M1–M5)**:
1. **Modul M1 — Pemeliharaan & Perbaikan Aset:**
   - Pengajuan perbaikan aset rusak oleh Pemohon (`item_perbaikan`), pemeriksaan oleh Operator/Kepala Kantor, persetujuan Pimpinan, penugasan Teknisi Fakultas atau Vendor eksternal, pembaruan hasil & biaya aktual perbaikan, serta jadwal & realisasi pemeliharaan berkala (`pemeliharaan_aset`).
2. **Modul M2 — Master Data Aset, Lokasi, Penanggung Jawab & Riwayat Perpindahan:**
   - Pengelolaan referensi `kategori_aset`, `gedung`, `ruangan`, `vendor`, CRUD inventaris `aset`, penempatan awal lokasi & penanggung jawab (`penempatan_aset`), daftar aset unit (`/pemohon/aset-unit`), aset tanggung jawab pribadi (`/pegawai/aset`), serta riwayat perpindahan aset (`/pemohon/riwayat-perpindahan`).
3. **Modul M3 — Fondasi, Autentikasi, RBAC, Manajemen Akun & Log Aktivitas *(Selesai — Issue #10 & #45)*:**
   - Setup repositori & arsitektur Laravel + Inertia React, migrasi 22 tabel ERD + `pengguna_peran`, seeder, login `username` dengan *rate limiting*, middleware peran (`role:`) & status akun (`aktif`), manajemen pengguna & matriks hak akses, audit trail otomatis (`log_aktivitas`), serta kerangka layout & komponen UI bersama.
4. **Modul M4 — Pengadaan, Penerimaan, Mutasi, Penghapusan (3 Jalur), Layanan Persetujuan Bersama & BAST PDF:**
   - Pengajuan pengadaan (`item_pengadaan`), verifikasi fisik penerimaan barang dari vendor (`penerimaan_aset`, `item_penerimaan`), pengajuan & eksekusi mutasi (`item_mutasi`), pengajuan & eksekusi penghapusan (`item_penghapusan`), layanan persetujuan berjenjang & pelacakan status bersama (`pengajuan`, `riwayat_status_pengajuan`), serta pembuatan & pengarsipan dokumen BAST PDF (`berita_acara`, `dokumen`).
5. **Modul M5 — Dashboard, Laporan (PDF/Excel), Rekonsiliasi, Cetak Label & Kartu Kendali Ruangan:**
   - Query data aktual untuk ke-6 Dashboard peran, laporan inventaris & penyusutan/nilai buku (ekspor PDF/Excel), rekonsiliasi aset, cetak label kode/QR aset (`/cetak-label`), dan Kartu Kendali Ruangan / DBR (`/kartu-kendali`).

### Aturan Bisnis Kritis (Wajib Dipatuhi Semua Modul)
1. **Alur Status Pengajuan (`pengajuan.status`):**
   - Nilai status: `'draft'` -> `'diajukan'` -> `'disetujui_kadep'` -> `'disetujui_pimpinan'` -> `'diproses'` -> `'selesai'` (atau `'ditolak'`).
   - Setiap kali `pengajuan.status` berubah, sistem **wajib** mencatat baris baru ke tabel `riwayat_status_pengajuan` (`id_pengajuan`, `id_pengguna`, `status_baru`, `catatan`, `waktu`).
2. **Siklus Lokasi & Penanggung Jawab (`penempatan_aset`):**
   - **Penempatan Awal (Modul M2):** Saat aset baru ditempatkan pertama kali tanpa lewat pengajuan mutasi, buat baris `penempatan_aset` dengan `id_item_mutasi = NULL` dan `tanggal_selesai = NULL`. Lokasi & PJ aktif suatu aset adalah baris `penempatan_aset` dengan `tanggal_selesai IS NULL`.
   - **Perpindahan via Mutasi (Modul M4):** Saat mutasi disetujui/diproses, tutup baris `penempatan_aset` aktif sebelumnya (`tanggal_selesai = now()`), lalu buat baris `penempatan_aset` baru dengan `id_item_mutasi` terisi dan `tanggal_selesai = NULL`.
3. **Aturan Berita Acara (`berita_acara` — Modul M4):**
   - Setiap `berita_acara` wajib berelasi 1-ke-1 dengan berkas di tabel `dokumen` (`id_dokumen` bersifat `UNIQUE`).
   - Kolom `id_penerimaan` hanya diisi bila `jenis_bast = 'penerimaan'`. Untuk `jenis_bast` bernilai `'mutasi'`, `'penghapusan'`, atau `'serah_terima'`, kolom `id_penerimaan` diisi `NULL`.
4. **Rumus Penyusutan Garis Lurus & Nilai Buku (Modul M2 & M5):**
   - **Penting:** Penyusutan dan nilai buku **TIDAK disimpan sebagai kolom di database**, melainkan dihitung secara dinamis (*on-the-fly*) menggunakan `aset.harga_perolehan`, `aset.tahun_perolehan`, dan `kategori_aset.masa_manfaat_tahun`:
     - `Penyusutan per Tahun = harga_perolehan / masa_manfaat_tahun`
     - `Umur Pemakaian = min(max(tahun_berjalan - tahun_perolehan, 0), masa_manfaat_tahun)`
     - `Akumulasi Penyusutan = Umur Pemakaian * Penyusutan per Tahun`
     - `Nilai Buku = max(0, harga_perolehan - Akumulasi Penyusutan)`
5. **Konvensi Timestamp Model Eloquent:**
   - Hanya `App\Models\User` (`pengguna`) yang memiliki `created_at`, `updated_at`, dan `remember_token`.
   - Seluruh **21 model domain lainnya menggunakan `public $timestamps = false;`** sesuai ERD.

---

## 2. Matriks Pembagian Tugas Tim (GitHub Project #4 & Issues #10–#61)

### 2.1. Daftar Anggota, Branch & Tanggung Jawab Implementasi (Epic #6 & #7)

| Anggota Tim | GitHub Username | Branch Git | Issue Backend (Epic #6) | Issue Frontend (Epic #7) | Modul & Fokus Implementasi Kode |
|---|---|---|---|---|---|
| **Hasbi Shiddiqi** | `Shiddiqi21` | `hasbi` | **#10** *(Selesai)* | **#45** *(Selesai)* | **M3 (Fondasi, Auth, RBAC, Akun, Log, Layout UI):** Setup repo, migrasi 22 tabel ERD + `pengguna_peran`, seeder, login, RBAC, manajemen pengguna (`/pengguna`, `/hak-akses`, `/log-aktivitas`), layout & komponen UI bersama (`/komponen`). |
| **Fatih Athaya** | `fatiathaya` | `fatih` | **#37** | **#41** | **M2 (Master Data Aset, Lokasi, PJ & Riwayat Perpindahan):** CRUD `aset`, `kategori_aset`, `gedung`, `ruangan`, `vendor`, penempatan lokasi & PJ (`/master-aset`, `/lokasi`), daftar aset unit (`/pemohon/aset-unit`), aset pribadi (`/pegawai/aset`), riwayat perpindahan (`/pemohon/riwayat-perpindahan`). |
| **Tricia Ayunda** | `triciayundaa` | `trici` | **#38** | **#42** | **M1 (Perbaikan & Pemeliharaan Aset):** Form pengajuan perbaikan (`/pemohon/pengajuan/perbaikan`), pemrosesan & penugasan perbaikan oleh operator (`/perbaikan`), jadwal & riwayat pemeliharaan (`/pemeliharaan`), tugas & riwayat pekerjaan teknisi (`/teknisi/tugas`, `/teknisi/riwayat`). |
| **Fathiya Alzhafira** | `fathiyaAlzhafira` | `fathiya` | **#39** | **#43** | **M4 (Pengadaan, Penerimaan, Mutasi, Penghapusan, Persetujuan Bersama & BAST PDF):** Pengajuan pengadaan/mutasi/penghapusan (`/pemohon/pengajuan/pengadaan`, `.../mutasi`, `.../penghapusan`), layanan daftar & detail status pengajuan (`/pemohon/pengajuan`), pemeriksaan (`/pemeriksaan`, `/kepala-kantor/pengajuan`), persetujuan (`/pimpinan/persetujuan`), verifikasi penerimaan (`/penerimaan`), eksekusi mutasi (`/mutasi`), eksekusi penghapusan (`/penghapusan`), pembuatan & unduh BAST PDF (`/arsip-bast`). |
| **Naisya Harjimen** | `NaisyaHarjimen` | `naisya` | **#40** | **#44** | **M5 (Dashboard, Laporan PDF/Excel, Rekonsiliasi, Cetak Label & Kartu Kendali):** Query aktual 6 dashboard (`DashboardController`), laporan & rekonsiliasi (`/laporan`, `/pimpinan/laporan`, `/kepala-kantor/laporan`), cetak label aset (`/cetak-label`), kartu kendali ruangan (`/kartu-kendali`). |

### 2.2. Daftar Lengkap Seluruh Epics & Sub-Issues (Issues #1–#61)

| Epic (Parent Issue) | Rentang Waktu | Sub-Issues per Anggota (`Hasbi` / `Fatih` / `Tricia` / `Fathiya` / `Naisya`) | Status |
|---|---|---|---|
| **#2** Analisis Kebutuhan Sistem | 23 Sep – 6 Okt | `#11` Hasbi (A1 & BMN), `#12` Fatih (KF M2), `#13` Tricia (KF M3, KNF, Use Case), `#14` Fathiya (SOP & KF M4), `#15` Naisya (SOP & KF M1/M5) | **Done (5/5)** |
| **#3** Perancangan Proses Bisnis & Use Case | 7 Okt – 13 Okt | `#16` Hasbi (BPMN M1), `#17` Fatih (BPMN Penghapusan & Activity M2), `#18` Tricia (Matriks Aktor-Fungsi), `#19` Fathiya (BPMN M4), `#20` Naisya (BPMN M5) | **Done (5/5)** |
| **#4** Perancangan Database dan ERD | 14 Okt – 20 Okt | `#21` Hasbi (Tabel M1), `#22` Fatih (Tabel M2), `#23` Tricia (Tabel M3 & Normalisasi ERD), `#24` Fathiya (Tabel M4), `#25` Naisya (Kamus Data & Relasi M5) | **Done (5/5)** |
| **#5** Desain UI/UX dan Prototype Sistem | 21 Okt – 27 Okt | `#26` Hasbi (Design System & Proto M1), `#27` Fatih (Proto M2), `#28` Tricia (Proto M3), `#29` Fathiya (Proto M4), `#30` Naisya (Proto M5) | **Done (5/5)** |
| **#6** Implementasi Database dan Backend | 28 Okt – 10 Nov | `#10` Hasbi *(Done)*, `#37` Fatih (Backend M2), `#38` Tricia (Backend M1), `#39` Fathiya (Backend M4 & Persetujuan Bersama), `#40` Naisya (Backend M5) | **In Progress (1/5)** |
| **#7** Implementasi Frontend dan Integrasi | 11 Nov – 24 Nov | `#45` Hasbi *(Done)*, `#41` Fatih (UI M2), `#42` Tricia (UI M1), `#43` Fathiya (UI M4), `#44` Naisya (UI M5) | **In Progress (1/5)** |
| **#31** Evaluasi dan Revisi Prototype | 25 Nov – 1 Des | `#32` Hasbi (Demo & Revisi M1), `#33` Fatih (Revisi M2), `#34` Tricia (Revisi M3), `#35` Fathiya (Revisi M4), `#36` Naisya (Revisi M5) | Todo |
| **#8** Pengujian Sistem dan UAT | 2 Des – 8 Des | `#46` Hasbi (Uji M2 & Koord UAT), `#47` Fatih (Uji M3), `#48` Naisya (Uji M1), `#49` Fathiya (Uji M5), `#50` Tricia (Uji M4) | Todo |
| **#9** Dokumentasi & Persiapan Presentasi | 9 Des – 15 Des | `#51` Hasbi (Panduan M1 & Slide), `#52` Fatih (Panduan M2 & Dok DB), `#53` Tricia (Panduan M3 & Dok Konfigurasi), `#54` Fathiya (Panduan M4 & Rekap UAT), `#55` Naisya (Panduan M5 & Video Demo) | Todo |
| **#56** Deployment | 9 Des – 15 Des | `#57` Hasbi (Setup Server Staging/Prod), `#58` Fatih (Migrasi Data SIMAK BMN), `#59` Tricia (Go-Live & Pelatihan), `#60` Fathiya (Smoke Test), `#61` Naisya (Backup & Rencana Maintenance) | Todo |

---

## 3. Kontrak Integrasi Antar-Modul (Panduan Anti-Konflik Git)

Agar pekerjaan di branch `fatih`, `trici`, `fathiya`, dan `naisya` tidak saling menimpa saat di-*merge* ke `main`, patuhi pembagian kontrak di bawah ini:

### 3.1. Titik Sambung 1: Layanan Pengajuan, Pemeriksaan & Persetujuan (`Fathiya #39/#43` <-> `Tricia #38/#42`)
Tabel `pengajuan` dan `riwayat_status_pengajuan` digunakan oleh 4 jenis pengajuan (`pengadaan`, `perbaikan`, `mutasi`, `penghapusan`):
- **Layanan Bersama (Dibuat oleh Fathiya — Issue #39):**
  - Sesuai deskripsi Issue `#39`, Fathiya menyediakan *shared service* / logika perubahan status pengajuan & pencatatan `riwayat_status_pengajuan`, serta mengelola halaman daftar & pemeriksaan pengajuan lintas jenis (`/pemohon/pengajuan`, `/pemeriksaan`, `/kepala-kantor/pengajuan`, `/pimpinan/persetujuan`).
- **Modul Perbaikan (Dibuat oleh Tricia — Issue #38 & #42):**
  - Tricia fokus penuh pada pengajuan dengan `jenis_pengajuan = 'perbaikan'` (`/pemohon/pengajuan/perbaikan`), tabel `item_perbaikan` (`/perbaikan`, `/teknisi/tugas`, `/teknisi/riwayat`), dan tabel `pemeliharaan_aset` (`/pemeliharaan`).
  - Saat `item_perbaikan` mengubah status `pengajuan`, panggil helper/service status pengajuan yang sama agar selalu tercatat di `riwayat_status_pengajuan`.
- **Pemisahan File Controller & Pages:**
  - **Tricia (`trici`):** Gunakan `PerbaikanController`, `PemeliharaanController`, `TeknisiTugasController` dan folder `resources/js/Pages/Perbaikan/*`, `Pages/Pemeliharaan/*`, `Pages/Teknisi/*`.
  - **Fathiya (`fathiya`):** Gunakan `PengadaanController`, `PenerimaanController`, `MutasiController`, `PenghapusanController`, `PengajuanController`, `BastController` dan folder `resources/js/Pages/Pengadaan/*`, `Pages/Penerimaan/*`, `Pages/Mutasi/*`, `Pages/Penghapusan/*`, `Pages/Pengajuan/*`, `Pages/Bast/*`.

### 3.2. Titik Sambung 2: Tabel `aset` dan `penempatan_aset` (`Fatih #37/#41` <-> `Fathiya #39/#43`)
- **Fatih (`fatih` — Issue #37 & #41):**
  - Mengelola CRUD Master Aset (`AsetController`, `Pages/Aset/*`), Lokasi & PJ (`LokasiController`, `Pages/Lokasi/*`), Aset Unit Pemohon (`/pemohon/aset-unit`), Riwayat Perpindahan (`/pemohon/riwayat-perpindahan`), dan Aset Pribadi Pegawai (`/pegawai/aset`).
- **Fathiya (`fathiya` — Issue #39 & #43):**
  - Saat verifikasi `item_penerimaan` dinyatakan `'sesuai'` dan diregistrasi menjadi aset, atau saat `item_mutasi` selesai diproses (menutup `penempatan_aset` lama dan membuat `penempatan_aset` baru dengan `id_item_mutasi`), atau saat `item_penghapusan` mengubah `aset.status_aset = 'dihapus'`, lakukan melalui model `Aset` dan `PenempatanAset` tanpa mengubah struktur controller milik Fatih.

### 3.3. Titik Sambung 3: Dashboard & Laporan (`Naisya #40/#44`)
- **Naisya (`naisya` — Issue #40 & #44):**
  - Mengelola `DashboardController` (`resources/js/Pages/Dashboard/*.jsx`), `LaporanController` (`Pages/Laporan/*`), `CetakLabelController` (`Pages/Label/*`), dan `KartuKendaliController` (`Pages/KartuKendali/*`).
  - Anggota lain **tidak perlu** mengubah `DashboardController` atau `Pages/Dashboard/*.jsx` agar tidak konflik dengan Naisya.

---

## 4. Setup & Perintah Pengembangan

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Pastikan layanan MySQL aktif dan buat database bernama `asetfti`, lalu sesuaikan `DB_*` di `.env`:

```bash
php artisan migrate:fresh --seed
npm install
npm run dev
```

Jalankan server Laravel di terminal terpisah:
```bash
php artisan serve
```

Perintah pengujian & *build*:
- **Tes Backend (PHPUnit — 80 test):** `.\vendor\bin\phpunit` atau `php artisan test`
- **Build Produksi Frontend:** `npm run build`
- **Galeri Komponen UI (Lokal):** Buka `http://127.0.0.1:8000/komponen` saat `APP_ENV=local`

---

## 5. Peran Pengguna (RBAC) & Akun Pengembangan

Kata sandi untuk seluruh akun seeder pengembangan (`APP_ENV=local`): **`password`**

| Slug Middleware (`role:`) | Nama Peran di DB (`peran.nama_peran`) | Username Seeder | Prefix URL / Dashboard Utama | Ringkasan Wewenang |
|---|---|---|---|---|
| `operator` | `Operator Aset Fakultas` | `admin` | `/operator` | Mengelola master aset, lokasi, verifikasi pengajuan & penerimaan, mutasi, penghapusan, perbaikan, pemeliharaan, label, kartu kendali, BAST, pengguna & hak akses, laporan |
| `pimpinan` | `Pimpinan` | `pimpinan` | `/pimpinan` | Dashboard eksekutif, persetujuan pengajuan tingkat fakultas, pratinjau & ekspor laporan aset |
| `kepala-kantor` | `Kepala Kantor` | `kepala` | `/kepala-kantor` | Dashboard pemeriksaan, verifikasi & pemeriksaan daftar pengajuan, laporan aset |
| `pemohon` | `Pemohon` | `pemohon` *(multi-peran: Pemohon + Pegawai/Dosen)* | `/pemohon` | Melihat daftar aset unit, membuat & memantau pengajuan (pengadaan, perbaikan, mutasi, penghapusan), riwayat perpindahan aset unit |
| `pegawai` | `Pegawai/Dosen` | `pegawai` | `/pegawai` | Melihat dashboard dan daftar aset yang menjadi tanggung jawab pribadi |
| `teknisi` | `Teknisi Fakultas` | `teknisi` | `/teknisi` | Menerima tugas perbaikan, memeriksa kerusakan, memperbarui status/hasil perbaikan, melihat riwayat pekerjaan |

---

## 6. Peta Desain Figma Lengkap (46 Frame, Node ID, Route & PIC Issue)

- **File Figma Utama:** [PPSI - Pengelolaan Aset FTI](https://www.figma.com/design/EMWEJ2Y1fFQm7OIuPT0lFA/PPSI---Pengelolaan-Aset-FTI?node-id=0-1&p=f&t=gYJ9E1moxwdFSALp-0)
- **Figma `fileKey`:** `EMWEJ2Y1fFQm7OIuPT0lFA` | **Page `nodeId`:** `0:1` (`Page 1`)
- **Format URL Langsung per Frame:** `https://www.figma.com/design/EMWEJ2Y1fFQm7OIuPT0lFA/PPSI---Pengelolaan-Aset-FTI?node-id=<NODE_ID>`
  *(Untuk pemanggilan tool MCP Figma `get_design_context` / `get_screenshot`, gunakan `fileKey: "EMWEJ2Y1fFQm7OIuPT0lFA"` dan ubah `-` pada `node-id` menjadi `:`, contoh: `5-58799` -> `5:58799`).*

### 6.1. Umum / Autentikasi (1 Frame)
| Node ID | Nama Frame di Figma | URL / Route Name | Modul & PIC Issue | Status / File Halaman |
|---|---|---|---|---|
| `5-58174` | `Umum — Login` | `/login` (`login`) | **M3 — Hasbi (`#10`, `#45`)** | **Selesai** (`Pages/Auth/Login.jsx`) |

### 6.2. Peran: Pimpinan (`role:pimpinan` — 5 Frame)
| Node ID | Nama Frame di Figma | URL & Route Name | Modul & PIC Issue | Target Halaman / Keterangan |
|---|---|---|---|---|
| `5-58215` | `Pimpinan — Dashboard pimpinan` | `/pimpinan` (`pimpinan.dashboard`) | **M5 — Naisya (`#40`, `#44`)** | `Pages/Dashboard/Pimpinan.jsx` (UI siap, sambung query di `DashboardController`) |
| `5-58327` | `Pimpinan — Persetujuan pengajuan` | `/pimpinan/persetujuan` (`pimpinan.persetujuan`) | **M4/M1 — Fathiya (`#39`, `#43`) & Tricia (`#38`, `#42`)** | Daftar pengajuan menunggu persetujuan pimpinan |
| `5-58373` | `Pimpinan — Detail pengajuan` | `/pimpinan/persetujuan/{pengajuan}` | **M4/M1 — Fathiya (`#39`, `#43`) & Tricia (`#38`, `#42`)** | Detail pengajuan + aksi Setujui / Tolak |
| `5-58427` | `Pimpinan — Laporan aset` | `/pimpinan/laporan` (`pimpinan.laporan`) | **M5 — Naisya (`#40`, `#44`)** | Filter & daftar laporan inventaris/penyusutan |
| `5-58485` | `Pimpinan — Pratinjau laporan` | `/pimpinan/laporan/pratinjau` | **M5 — Naisya (`#40`, `#44`)** | Pratinjau cetak/ekspor laporan aset PDF/Excel |

### 6.3. Peran: Kepala Kantor (`role:kepala-kantor` — 4 Frame)
| Node ID | Nama Frame di Figma | URL & Route Name | Modul & PIC Issue | Target Halaman / Keterangan |
|---|---|---|---|---|
| `5-58539` | `Kepala Kantor — Dashboard kepala kantor` | `/kepala-kantor` (`kepala-kantor.dashboard`) | **M5 — Naisya (`#40`, `#44`)** | `Pages/Dashboard/KepalaKantor.jsx` (UI siap, sambung query di `DashboardController`) |
| `5-58585` | `Kepala Kantor — Daftar pengajuan` | `/kepala-kantor/pengajuan` (`kepala-kantor.pengajuan`) | **M4/M1 — Fathiya (`#39`, `#43`) & Tricia (`#38`, `#42`)** | Daftar pengajuan masuk untuk diperiksa Kepala Kantor |
| `5-58631` | `Kepala Kantor — Detail pemeriksaan pengajuan` | `/kepala-kantor/pengajuan/{pengajuan}` | **M4/M1 — Fathiya (`#39`, `#43`) & Tricia (`#38`, `#42`)** | Detail pemeriksaan & verifikasi pengajuan |
| `5-58675` | `Kepala Kantor — Laporan aset` | `/kepala-kantor/laporan` (`kepala-kantor.laporan`) | **M5 — Naisya (`#40`, `#44`)** | Laporan rekonsiliasi & inventaris aset |

### 6.4. Peran: Operator Aset Fakultas (`role:operator` — 17 Frame)
| Node ID | Nama Frame di Figma | URL & Route Name | Modul & PIC Issue | Target Halaman / Keterangan |
|---|---|---|---|---|
| `5-58731` | `Operator Aset Fakultas — Dashboard operator aset` | `/operator` (`operator.dashboard`) | **M5 — Naisya (`#40`, `#44`)** | `Pages/Dashboard/Operator.jsx` (UI siap, sambung query di `DashboardController`) |
| `5-58799` | `Operator Aset Fakultas — Master aset` | `/master-aset` (`aset.index`) | **M2 — Fatih (`#37`, `#41`)** | Tabel inventaris master aset, filter, pencarian |
| `5-58847` | `Operator Aset Fakultas — Tambah aset` | `/master-aset/create` (`aset.create`) | **M2 — Fatih (`#37`, `#41`)** | Form tambah aset baru |
| `5-58915` | `Operator Aset Fakultas — Edit aset` | `/master-aset/{aset}/edit` (`aset.edit`) | **M2 — Fatih (`#37`, `#41`)** | Form pembaruan data aset |
| `5-58983` | `Operator Aset Fakultas — Detail aset` | `/master-aset/{aset}` (`aset.show`) | **M2 — Fatih (`#37`, `#41`)** | Rincian spesifikasi, nilai buku, lokasi, histori aset |
| `5-59038` | `Operator Aset Fakultas — Lokasi dan penanggung jawab aset` | `/lokasi` (`lokasi.index`) | **M2 — Fatih (`#37`, `#41`)** | Manajemen gedung, ruangan, dan penempatan PJ aset (`penempatan_aset`) |
| `5-59097` | `Operator Aset Fakultas — Pemeriksaan pengajuan` | `/pemeriksaan` (`pemeriksaan.index`) | **M4/M1 — Fathiya (`#39`, `#43`) & Tricia (`#38`, `#42`)** | Pemeriksaan pengajuan masuk oleh operator |
| `5-59158` | `Operator Aset Fakultas — Verifikasi penerimaan aset` | `/penerimaan` (`penerimaan.index`) | **M4 — Fathiya (`#39`, `#43`)** | Pencatatan `penerimaan_aset` & verifikasi `item_penerimaan` dari vendor |
| `5-59215` | `Operator Aset Fakultas — Pemrosesan mutasi aset` | `/mutasi` (`mutasi.index`) | **M4 — Fathiya (`#39`, `#43`)** | Eksekusi `item_mutasi` & pembaruan `penempatan_aset` |
| `5-59273` | `Operator Aset Fakultas — Pemrosesan penghapusan aset` | `/penghapusan` (`penghapusan.index`) | **M4 — Fathiya (`#39`, `#43`)** | Eksekusi `item_penghapusan` (3 jalur) & ubah `status_aset = 'dihapus'` |
| `5-59324` | `Operator Aset Fakultas — Pemrosesan pengajuan perbaikan` | `/perbaikan` (`perbaikan.index`) | **M1 — Tricia (`#38`, `#42`)** | Kelola `item_perbaikan`, penugasan teknisi / penunjukan vendor |
| `5-59382` | `Operator Aset Fakultas — Jadwal dan riwayat pemeliharaan` | `/pemeliharaan` (`pemeliharaan.index`) | **M1 — Tricia (`#38`, `#42`)** | Kelola jadwal & realisasi `pemeliharaan_aset` |
| `5-59440` | `Operator Aset Fakultas — Cetak label aset` | `/cetak-label` (`label.index`) | **M5 — Naisya (`#40`, `#44`)** | Pilih aset & pratinjau cetak label inventaris |
| `5-59511` | `Operator Aset Fakultas — Kartu kendali ruangan` | `/kartu-kendali` (`kartu-kendali.index`) | **M5 — Naisya (`#40`, `#44`)** | Daftar Barang Ruangan (DBR) per `ruangan` |
| `5-59568` | `Operator Aset Fakultas — Pengelolaan pengguna dan hak akses` | `/pengguna`, `/hak-akses`, `/log-aktivitas` | **M3 — Hasbi (`#10`, `#45`)** | **Selesai** (`Pages/Pengguna/*`, `Pages/HakAkses/*`, `Pages/LogAktivitas/*`) |
| `5-59634` | `Operator Aset Fakultas — Pembuatan dan arsip BAST` | `/arsip-bast` (`bast.index`) | **M4 — Fathiya (`#39`, `#43`)** | Pembuatan `berita_acara` PDF & unggah/arsip `dokumen` BAST |
| `5-59700` | `Operator Aset Fakultas — Laporan dan rekonsiliasi` | `/laporan` (`laporan.index`) | **M5 — Naisya (`#40`, `#44`)** | Laporan nilai buku, penyusutan, dan rekonsiliasi aset (PDF/Excel) |

### 6.5. Peran: Pemohon (`role:pemohon` — 10 Frame)
| Node ID | Nama Frame di Figma | URL & Route Name | Modul & PIC Issue | Target Halaman / Keterangan |
|---|---|---|---|---|
| `5-59756` | `Pemohon — Dashboard pemohon` | `/pemohon` (`pemohon.dashboard`) | **M5 — Naisya (`#40`, `#44`)** | `Pages/Dashboard/Pemohon.jsx` (UI siap, sambung query di `DashboardController`) |
| `5-59812` | `Pemohon — Daftar aset unit` | `/pemohon/aset-unit` (`pemohon.aset-unit`) | **M2 — Fatih (`#37`, `#41`)** | Daftar aset yang berada di unit/sub-unit pemohon |
| `5-59859` | `Pemohon — Detail aset` | `/pemohon/aset-unit/{aset}` | **M2 — Fatih (`#37`, `#41`)** | Detail informasi aset unit |
| `5-59913` | `Pemohon — Pengajuan pengadaan` | `/pemohon/pengajuan/pengadaan` (`pemohon.pengadaan`) | **M4 — Fathiya (`#39`, `#43`)** | Form buat `pengajuan` (`jenis_pengajuan = 'pengadaan'`) + `item_pengadaan` |
| `5-59976` | `Pemohon — Pengajuan perbaikan` | `/pemohon/pengajuan/perbaikan` (`pemohon.perbaikan`) | **M1 — Tricia (`#38`, `#42`)** | Form buat `pengajuan` (`jenis_pengajuan = 'perbaikan'`) + `item_perbaikan` |
| `5-60037` | `Pemohon — Pengajuan mutasi` | `/pemohon/pengajuan/mutasi` (`pemohon.mutasi`) | **M4 — Fathiya (`#39`, `#43`)** | Form buat `pengajuan` (`jenis_pengajuan = 'mutasi'`) + `item_mutasi` |
| `5-60092` | `Pemohon — Pengajuan penghapusan` | `/pemohon/pengajuan/penghapusan` (`pemohon.penghapusan`) | **M4 — Fathiya (`#39`, `#43`)** | Form buat `pengajuan` (`jenis_pengajuan = 'penghapusan'`) + `item_penghapusan` |
| `5-60142` | `Pemohon — Daftar pengajuan` | `/pemohon/pengajuan` (`pemohon.pengajuan`) | **M4 — Fathiya (`#39`, `#43`)** | Daftar seluruh pengajuan milik pemohon |
| `5-60190` | `Pemohon — Detail dan status pengajuan` | `/pemohon/pengajuan/{pengajuan}` | **M4/M1 — Fathiya (`#39`, `#43`) & Tricia (`#38`, `#42`)** | Detail pengajuan & lini masa `riwayat_status_pengajuan` |
| `5-60242` | `Pemohon — Riwayat perpindahan aset` | `/pemohon/riwayat-perpindahan` (`pemohon.riwayat-perpindahan`) | **M2 — Fatih (`#37`, `#41`)** | Riwayat mutasi/penempatan aset di unit pemohon |

### 6.6. Peran: Pegawai/Dosen (`role:pegawai` — 3 Frame)
| Node ID | Nama Frame di Figma | URL & Route Name | Modul & PIC Issue | Target Halaman / Keterangan |
|---|---|---|---|---|
| `5-60294` | `Pegawai/Dosen — Dashboard pegawai / dosen` | `/pegawai` (`pegawai.dashboard`) | **M5 — Naisya (`#40`, `#44`)** | `Pages/Dashboard/Pegawai.jsx` (UI siap, sambung query di `DashboardController`) |
| `5-60339` | `Pegawai/Dosen — Daftar aset tanggung jawab pribadi` | `/pegawai/aset` (`pegawai.aset`) | **M2 — Fatih (`#37`, `#41`)** | Daftar aset dengan `penempatan_aset.id_pengguna_pj = auth()->id()` |
| `5-60383` | `Pegawai/Dosen — Detail aset` | `/pegawai/aset/{aset}` | **M2 — Fatih (`#37`, `#41`)** | Detail aset tanggung jawab pribadi |

### 6.7. Peran: Teknisi Fakultas (`role:teknisi` — 5 Frame)
| Node ID | Nama Frame di Figma | URL & Route Name | Modul & PIC Issue | Target Halaman / Keterangan |
|---|---|---|---|---|
| `5-60431` | `Teknisi Fakultas — Dashboard teknisi` | `/teknisi` (`teknisi.dashboard`) | **M5 — Naisya (`#40`, `#44`)** | `Pages/Dashboard/Teknisi.jsx` (UI siap, sambung query di `DashboardController`) |
| `5-60477` | `Teknisi Fakultas — Daftar tugas perbaikan` | `/teknisi/tugas` (`teknisi.tugas`) | **M1 — Tricia (`#38`, `#42`)** | Daftar `item_perbaikan` yang ditugaskan ke teknisi (`id_teknisi`) |
| `5-60523` | `Teknisi Fakultas — Detail tugas perbaikan` | `/teknisi/tugas/{itemPerbaikan}` | **M1 — Tricia (`#38`, `#42`)** | Detail kerusakan, foto, dan riwayat pemeriksaan |
| `5-60570` | `Teknisi Fakultas — Pembaruan status dan hasil perbaikan` | `/teknisi/tugas/{itemPerbaikan}/edit` | **M1 — Tricia (`#38`, `#42`)** | Form input `hasil_pemeriksaan`, `estimasi_biaya`, `perlu_vendor`, `hasil_perbaikan`, `biaya_aktual`, `status_perbaikan` |
| `5-60625` | `Teknisi Fakultas — Riwayat pekerjaan perbaikan` | `/teknisi/riwayat` (`teknisi.riwayat`) | **M1 — Tricia (`#38`, `#42`)** | Daftar perbaikan yang telah diselesaikan teknisi |

---

## 7. Referensi Skema Database (22 Tabel ERD + Pivot)

Seluruh model berada di namespace `App\Models`. Jangan menambah, menghapus, atau mengubah nama tabel/kolom tanpa kesepakatan tim.

| # | Modul Resmi | Nama Tabel | Model (`App\Models\...`) | Primary Key | Foreign Key & Kolom Utama |
|---|---|---|---|---|---|
| 1 | **M3** | `peran` | `Peran` | `id_peran` (INT) | `nama_peran` (UNIQUE), `deskripsi` (nullable) |
| 2 | **M3 / M2** | `unit` | `Unit` | `id_unit` (INT) | `nama_unit`, `jenis_unit` |
| 3 | **M3 / M2** | `sub_unit` | `SubUnit` | `id_sub_unit` (INT) | FK: `id_unit` -> `unit`; `nama_sub_unit`, `jenis_sub_unit` |
| 4 | **M3** | `pengguna` | `User` | `id_pengguna` (BIGINT) | FK: `id_peran` -> `peran`, `id_unit` -> `unit`, `id_sub_unit` -> `sub_unit`; `nip` (UNIQUE, nullable), `nama_lengkap`, `email` (UNIQUE), `username` (UNIQUE), `password_hash`, `is_aktif` (bool), `remember_token`, `timestamps` |
| 5 | **M3** | `pengguna_peran` | *(Pivot)* | `PRIMARY(id_pengguna, id_peran)` | FK: `id_pengguna` -> `pengguna` (CASCADE), `id_peran` -> `peran` (RESTRICT) |
| 6 | **M3** | `log_aktivitas` | `LogAktivitas` | `id_log` (BIGINT) | FK: `id_pengguna` -> `pengguna` (nullable, NULL ON DELETE); `waktu` (datetime), `aksi`, `nama_tabel`, `id_data` (nullable), `detail` (nullable) |
| 7 | **M2** | `kategori_aset` | `KategoriAset` | `id_kategori` (INT) | `kode_kategori` (UNIQUE), `nama_kategori`, `masa_manfaat_tahun` (smallint) |
| 8 | **M2** | `gedung` | `Gedung` | `id_gedung` (INT) | `kode_gedung` (UNIQUE), `nama_gedung` |
| 9 | **M2 / M4 / M1** | `vendor` | `Vendor` | `id_vendor` (INT) | `nama_vendor`, `alamat`, `kontak` |
| 10 | **M2** | `ruangan` | `Ruangan` | `id_ruangan` (INT) | FK: `id_gedung` -> `gedung`, `id_unit` -> `unit`, `id_sub_unit` -> `sub_unit`; `lantai` (smallint), `nomor_ruangan`, `nama_ruangan` (nullable) |
| 11 | **M2** | `aset` | `Aset` | `id_aset` (BIGINT) | FK: `id_kategori` -> `kategori_aset`, `id_item_penerimaan` -> `item_penerimaan` (nullable); `kode_aset` (UNIQUE), `nama_barang`, `merek_tipe` (nullable), `nomor_seri` (nullable), `spesifikasi` (nullable), `foto_path` (nullable), `tahun_perolehan` (nullable), `harga_perolehan` (decimal(15,2), nullable), `kondisi` (ENUM), `status_aset` (ENUM) |
| 12 | **M2 / M4** | `penempatan_aset` | `PenempatanAset` | `id_penempatan` (BIGINT) | FK: `id_aset` -> `aset`, `id_ruangan` -> `ruangan`, `id_pengguna_pj` -> `pengguna.id_pengguna`, `id_item_mutasi` -> `item_mutasi` (nullable, UNIQUE, NULL ON DELETE); `tanggal_mulai` (datetime), `tanggal_selesai` (datetime, nullable), `keterangan` (varchar(255), nullable) |
| 13 | **M4 / M1** | `pengajuan` | `Pengajuan` | `id_pengajuan` (BIGINT) | FK: `id_pemohon` -> `pengguna.id_pengguna`; `nomor_pengajuan` (UNIQUE), `jenis_pengajuan` (ENUM), `tanggal_pengajuan` (datetime), `keterangan` (nullable), `status` (ENUM) |
| 14 | **M4 / M1** | `riwayat_status_pengajuan` | `RiwayatStatusPengajuan` | `id_riwayat_status` (BIGINT) | FK: `id_pengajuan` -> `pengajuan`, `id_pengguna` -> `pengguna`; `status_baru` (varchar(20)), `catatan` (nullable), `waktu` (datetime) |
| 15 | **M4** | `item_pengadaan` | `ItemPengadaan` | `id_item_pengadaan` (BIGINT) | FK: `id_pengajuan` -> `pengajuan`, `id_kategori` -> `kategori_aset`; `nama_barang`, `spesifikasi`, `jumlah` (int), `estimasi_anggaran` (decimal(15,2)) |
| 16 | **M4** | `penerimaan_aset` | `PenerimaanAset` | `id_penerimaan` (BIGINT) | FK: `id_pengajuan` -> `pengajuan`, `id_vendor` -> `vendor`, `id_verifikator` -> `pengguna.id_pengguna`; `tanggal_terima` (date), `nomor_nota`, `catatan` (nullable) |
| 17 | **M4** | `item_penerimaan` | `ItemPenerimaan` | `id_item_penerimaan` (BIGINT) | FK: `id_penerimaan` -> `penerimaan_aset`, `id_item_pengadaan` -> `item_pengadaan`; `jumlah_diterima` (int), `spesifikasi_diterima` (nullable), `hasil_verifikasi` (ENUM), `catatan_kekurangan` (nullable) |
| 18 | **M4** | `item_mutasi` | `ItemMutasi` | `id_item_mutasi` (BIGINT) | FK: `id_pengajuan` -> `pengajuan`, `id_aset` -> `aset`, `id_ruangan_tujuan` -> `ruangan.id_ruangan`, `id_pengguna_pj` -> `pengguna.id_pengguna` |
| 19 | **M4** | `item_penghapusan` | `ItemPenghapusan` | `id_item_penghapusan` (BIGINT) | FK: `id_pengajuan` -> `pengajuan`, `id_aset` -> `aset`; `jalur_penghapusan` (ENUM, nullable), `catatan_tim_penilai` (nullable), `pihak_penerima` (nullable), `nilai_penjualan` (decimal(15,2), nullable), `tanggal_penghapusan` (date, nullable) |
| 20 | **M4 / M1** | `dokumen` | `Dokumen` | `id_dokumen` (BIGINT) | FK: `id_pengajuan` -> `pengajuan` (nullable), `id_aset` -> `aset` (nullable), `id_pengunggah` -> `pengguna.id_pengguna`; `jenis_dokumen` (ENUM), `nama_file`, `path_file`, `tanggal_unggah` (datetime) |
| 21 | **M4** | `berita_acara` | `BeritaAcara` | `id_bast` (BIGINT) | FK: `id_pengajuan` -> `pengajuan`, `id_penerimaan` -> `penerimaan_aset` (nullable, NULL ON DELETE), `id_dokumen` -> `dokumen` (UNIQUE); `nomor_bast` (UNIQUE), `jenis_bast` (ENUM), `tanggal_bast` (date), `pihak_pertama`, `pihak_kedua` |
| 22 | **M1** | `item_perbaikan` | `ItemPerbaikan` | `id_item_perbaikan` (BIGINT) | FK: `id_pengajuan` -> `pengajuan`, `id_aset` -> `aset`, `id_teknisi` -> `pengguna.id_pengguna` (nullable), `id_vendor` -> `vendor` (nullable); `deskripsi_kerusakan`, `foto_kerusakan_path` (nullable), `hasil_pemeriksaan` (nullable), `estimasi_biaya` (nullable), `perlu_vendor` (bool, nullable), `harga_penawaran` (nullable), `status_perbaikan` (ENUM), `tanggal_mulai` (nullable), `tanggal_selesai` (nullable), `hasil_perbaikan` (nullable), `biaya_aktual` (nullable) |
| 23 | **M1** | `pemeliharaan_aset` | `PemeliharaanAset` | `id_pemeliharaan` (BIGINT) | FK: `id_aset` -> `aset`, `id_pelaksana` -> `pengguna.id_pengguna` (nullable), `id_vendor` -> `vendor` (nullable); `jenis_pemeliharaan`, `tanggal_jadwal` (date), `status` (ENUM), `tanggal_pelaksanaan` (date, nullable), `uraian` (nullable), `biaya` (decimal(15,2), nullable) |

---

## 8. Daftar Lengkap Nilai ENUM Database (10 Kolom)

Gunakan nilai string persis seperti di bawah ini saat melakukan validasi Form Request (`Rule::in(...)`), query Eloquent, maupun pembuatan data seeder/test:

| Tabel & Kolom | Nilai ENUM yang Valid |
|---|---|
| `aset.kondisi` | `'baik'`, `'kurang_baik'`, `'rusak_berat'` |
| `aset.status_aset` | `'aktif'`, `'dalam_perbaikan'`, `'dihapus'`, `'dimutasi'` |
| `pengajuan.jenis_pengajuan` | `'pengadaan'`, `'perbaikan'`, `'mutasi'`, `'penghapusan'` |
| `pengajuan.status` | `'draft'`, `'diajukan'`, `'disetujui_kadep'`, `'disetujui_pimpinan'`, `'diproses'`, `'selesai'`, `'ditolak'` |
| `item_penerimaan.hasil_verifikasi` | `'sesuai'`, `'tidak_sesuai'`, `'kurang'` |
| `item_perbaikan.status_perbaikan` | `'menunggu'`, `'diperiksa'`, `'disetujui'`, `'dalam_perbaikan'`, `'selesai'`, `'ditolak'` |
| `pemeliharaan_aset.status` | `'terjadwal'`, `'dalam_proses'`, `'selesai'`, `'dibatalkan'` |
| `item_penghapusan.jalur_penghapusan` | `'penjualan'`, `'hibah'`, `'pemusnahan'`, `'lainnya'` *(nullable)* |
| `dokumen.jenis_dokumen` | `'bast'`, `'surat_pengajuan'`, `'surat_persetujuan'`, `'foto'`, `'lainnya'` |
| `berita_acara.jenis_bast` | `'penerimaan'`, `'mutasi'`, `'penghapusan'`, `'serah_terima'` |

---

## 9. Arsitektur, Konvensi Kode & Panduan Modul Baru

### 9.1. Hak Akses & Middleware
- Semua route internal berada di dalam grup middleware `['auth', 'aktif']` (`routes/web.php`). Akun dengan `is_aktif = false` otomatis ditolak dan dikeluarkan.
- Pembatasan peran di sisi server menggunakan middleware `role:<slug>` (`App\Http\Middleware\EnsureRole`). Contoh:
  - Satu peran: `->middleware('role:operator')`
  - Beberapa peran: `->middleware('role:pemohon,pegawai')`
- Helper pada model `User` (`App\Models\User`):
  - `$user->hasRole('pemohon')`
  - `$user->hasAnyRole('pemohon', 'pegawai')`
  - `$user->namaSemuaPeran()`
- Untuk otorisasi tingkat objek/baris data, gunakan Policy Laravel (`$this->authorize('...', $model)`).

### 9.2. Mengaktifkan Route & Menu Modul Baru
Seluruh menu sidebar untuk ke-6 peran sudah terdaftar di `app/Support/MenuPeran.php` dan memiliki route penampung sementara di `routes/modul.php` yang mengarah ke `ModulBelumTersediaController`.

Saat mengerjakan modul bagian Anda:
1. Buka `routes/modul.php`.
2. **Pertahankan URL dan `->name(...)` yang sudah ada** agar navigasi sidebar tetap menyala otomatis, lalu ganti `$sementara` dengan Controller Anda:
   ```php
   // SEBELUM (di routes/modul.php)
   Route::get('/master-aset', $sementara)->defaults('judul', 'Master aset')->name('aset.index');

   // SESUDAH
   Route::get('/master-aset', [AsetController::class, 'index'])->name('aset.index');
   Route::get('/master-aset/create', [AsetController::class, 'create'])->name('aset.create');
   Route::post('/master-aset', [AsetController::class, 'store'])->name('aset.store');
   ```
3. Jika perlu menambahkan sub-route baru, letakkan di dalam grup middleware `role:...` yang sesuai di `routes/modul.php`.

### 9.3. Mengganti Data Contoh Dashboard (Khusus Modul M5 — Naisya)
- Keenam halaman dashboard (`resources/js/Pages/Dashboard/*.jsx`) sudah diimplementasikan sesuai desain Figma.
- Saat ini `App\Http\Controllers\DashboardController` masih mengambil data statis dari `App\Support\DataContohDashboard`.
- Untuk mengaktifkan dashboard nyata: ganti pemanggilan `DataContohDashboard::...()` di `DashboardController` dengan query Eloquent asli yang mengembalikan struktur array/prop yang sama, lalu hapus komponen `<CatatanDataContoh />` pada file JSX terkait.

### 9.4. Pencatatan Log Aktivitas (`log_aktivitas`)
- Seluruh 21 model domain yang sudah ada **telah didaftarkan pada `ActivityObserver` di `App\Providers\AppServiceProvider`**. Setiap operasi `created`, `updated`, dan `deleted` via Eloquent akan otomatis tercatat ke tabel `log_aktivitas`.
- **Jangan** menambahkan trait `LogsActivity` pada model yang sudah terdaftar di `AppServiceProvider` (agar tidak tercatat ganda).
- Untuk aksi bisnis khusus yang perlu dicatat secara eksplisit (misalnya persetujuan pengajuan, cetak BAST, atau ekspor laporan), panggil:
  ```php
  use App\Support\ActivityLogger;

  ActivityLogger::record('setujui_pengajuan', 'pengajuan', $pengajuan->id_pengajuan, 'Pengajuan disetujui oleh Pimpinan');
  ```

### 9.5. Pola Halaman Inertia + React
Letakkan halaman di `resources/js/Pages/<Modul>/<Halaman>.jsx`:
```jsx
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Index({ daftarAset }) {
    return (
        <AuthenticatedLayout>
            <Head title="Master aset" />
            <PageHeader
                judul="Master aset"
                deskripsi="Kelola seluruh data inventaris aset tetap FTI."
            />
            {/* Isi halaman menggunakan komponen dari @/Components/ui */}
        </AuthenticatedLayout>
    );
}
```
- Notifikasi berhasil (`redirect()->...->with('status', 'Data berhasil disimpan.')`) dan pesan galat (`->withErrors(['status' => '...'])`) ditampilkan otomatis oleh `AuthenticatedLayout` melalui `FlashMessage`.

---

## 10. Komponen UI Bersama & Sistem Desain Tailwind

### 10.1. Daftar Komponen Siap Pakai (`resources/js/Components/ui`)
Lihat contoh interaktif dan potongan kodenya langsung di **`http://127.0.0.1:8000/komponen`** (`resources/js/Pages/Komponen/Galeri.jsx`). Referensi implementasi produksi lengkap dapat dilihat pada `resources/js/Pages/Pengguna/Index.jsx` dan `resources/js/Pages/Pengguna/Form.jsx`.

| Komponen (`@/Components/ui/...`) | Kegunaan Utama |
|---|---|
| `PageHeader`, `Breadcrumb` | Header halaman standar dengan judul, deskripsi, breadcrumb, dan slot tombol aksi di kanan |
| `Card`, `IsiKartu` | Kontainer kartu putih ber-border `line` dengan dukungan header `judul`, `deskripsi`, dan `tautan` |
| `DataTable` | Tabel responsif standar desain FTI (`kolom`, `baris`, `kunciBaris`, pesan `kosong`) |
| `Pagination` | Navigasi halaman otomatis untuk objek paginasi Laravel (`paginate()`) |
| `StatCard`, `StatGrid` | Kartu metrik/angka ringkasan di bagian atas halaman atau dashboard |
| `Badge`, `StatusText` | Label status berbentuk pil (`Badge`) atau teks berwarna (`StatusText`) dengan varian `brand`, `warn`, `bahaya`, `info`, `netral` |
| `Alert` | Kotak pesan informasi, peringatan, sukses, atau bahaya di dalam halaman |
| `SearchInput`, `SelectInput`, `Field`, `CheckboxGroup`, `FloatingInput` | Komponen input form terstandarisasi lengkap dengan label, pesan error, dan fokus warna `brand` |
| `TautanAksi`, `TombolLink` | Tautan aksi di dalam baris tabel (`TautanAksi`) dan `<Link>` Inertia bergaya tombol (`TombolLink`) |
| `ConfirmDialog` | Modal konfirmasi sebelum aksi destruktif/penting (nonaktifkan, tolak, hapus, setujui) |
| `ProgressList`, `BarChart`, `Timeline`, `QuickActions`, `InfoList` | Komponen visualisasi ringkasan dashboard dan detail status/riwayat |
| `EmptyState`, `TabNav`, `FlashMessage` | Tampilan saat data kosong, navigasi tab horizontal, dan notifikasi flash otomatis |

Tombol standar tersedia di `@/Components/PrimaryButton`, `@/Components/SecondaryButton`, dan `@/Components/DangerButton`.

### 10.2. Token Warna Tailwind (`tailwind.config.js`)
**Selalu gunakan class token warna di bawah ini (jangan menggunakan kode hex mentah atau warna hijau bawaan Tailwind seperti `green-*` / `emerald-*`):**
- **`brand` (`50`–`900`):** Hijau utama SIM Aset FTI (`bg-brand-600`, `text-brand-700`, `border-brand-500`, `bg-brand-50`).
- **`ink` (`900`, `600`, `500`, `400`):** Warna tipografi (`text-ink-900` untuk judul/teks utama, `text-ink-600` untuk subteks, `text-ink-500` untuk keterangan redup, `text-ink-400` untuk placeholder).
- **`surface` (`#f4f6f5`):** Warna latar belakang halaman (`bg-surface`).
- **`line` (`#e2e8e4`):** Warna garis pembatas dan border kartu/tabel (`border-line`, `divide-line`).
- **`warn` (`50`, `600`, `700`):** Kuning/oranye untuk status menunggu/peringatan (`bg-warn-50 text-warn-700`).
- **`bahaya` (`50`, `600`):** Merah untuk status ditolak/rusak berat/bahaya (`bg-bahaya-50 text-bahaya-600`).
- **`info` (`50`, `600`):** Biru untuk status informasi/proses (`bg-info-50 text-info-600`).
- **Radius Kartu:** `rounded-kartu` (`0.75rem`).

---

## 11. Struktur Direktori Penting

```text
Sistem Pengelolaan Aset FTI/
├── app/
│   ├── Http/
│   │   ├── Controllers/       # Controller utama (Pengguna, HakAkses, LogAktivitas, Dashboard, dll.)
│   │   ├── Middleware/        # EnsureRole (role:), EnsureUserIsActive (aktif)
│   │   └── Requests/          # Form Request validasi server-side
│   ├── Models/                # 22 Model Eloquent sesuai tabel ERD
│   ├── Observers/             # ActivityObserver (pencatatan otomatis log_aktivitas)
│   ├── Policies/              # UserPolicy (otorisasi manajemen akun)
│   └── Support/
│       ├── ActivityLogger.php       # Helper pencatatan log_aktivitas manual
│       ├── DataContohDashboard.php  # Data contoh sementara untuk 6 dashboard
│       ├── MenuPeran.php            # Definisi menu sidebar untuk 6 peran
│       └── PeranNama.php            # Konstanta & pemetaan slug <-> nama peran
├── database/
│   ├── migrations/            # 19 file migrasi (22 tabel ERD + pengguna_peran + tabel sistem Laravel)
│   └── seeders/               # PeranDanAdminSeeder, ReferensiSeeder, AsetContohSeeder
├── lang/id/                   # Terjemahan pesan validasi & autentikasi Bahasa Indonesia
├── resources/js/
│   ├── Components/ui/         # 20+ komponen UI bersama sesuai sistem desain Figma
│   ├── Layouts/               # AuthenticatedLayout.jsx & GuestLayout.jsx
│   └── Pages/                 # Halaman Inertia React (Auth, Dashboard, Pengguna, HakAkses, LogAktivitas, Komponen)
├── routes/
│   ├── auth.php               # Route login & logout
│   ├── modul.php              # Titik sambung route seluruh modul untuk anggota tim
│   └── web.php                # Route inti, profil, manajemen pengguna, dan galeri komponen
└── tests/Feature/             # 80 pengujian otomatis (Auth, RBAC, Pengguna, Skema ERD, dll.)
```
