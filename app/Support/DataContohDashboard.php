<?php

namespace App\Support;

/**
 * DATA CONTOH untuk dashboard per peran, disalin dari desain Figma.
 *
 * Dipakai supaya halaman dashboard sudah tampil utuh selama modul datanya belum jadi.
 * Saat modul sungguhan siap, ganti pemanggilan di DashboardController dengan query nyata
 * yang menghasilkan bentuk array yang sama.
 */
final class DataContohDashboard
{
    /**
     * @return array<string, mixed>
     */
    public static function operator(): array
    {
        return [
            'kpi' => [
                ['label' => 'Master aset', 'nilai' => '1.248', 'keterangan' => '6 aset ditambahkan bulan ini', 'nada' => 'sukses'],
                ['label' => 'Perlu verifikasi', 'nilai' => '8', 'keterangan' => '6 pengajuan + 2 penerimaan', 'nada' => 'peringatan'],
                ['label' => 'Perbaikan aktif', 'nilai' => '5', 'keterangan' => '3 sedang dikerjakan teknisi', 'nada' => 'sukses'],
                ['label' => 'Jadwal pemeliharaan', 'nilai' => '4', 'keterangan' => 'Dalam 7 hari mendatang', 'nada' => 'sukses'],
            ],
            'banner' => ['nada' => 'peringatan', 'teks' => '2 dokumen penerimaan belum lengkap. Pastikan nomor seri dan BAST tercatat sebelum aset diaktifkan.'],
            'antrean' => [
                ['referensi' => 'HPS-2026-0006', 'pekerjaan' => 'Pemeriksaan penghapusan', 'batas' => '22 Okt 2026', 'aksi' => 'Periksa', 'href' => route('pemeriksaan.index', absolute: false)],
                ['referensi' => 'TER-2026-0021', 'pekerjaan' => 'Verifikasi penerimaan printer', 'batas' => '22 Okt 2026', 'aksi' => 'Proses', 'href' => route('penerimaan.index', absolute: false)],
                ['referensi' => 'MTS-2026-0014', 'pekerjaan' => 'Proses mutasi Dell OptiPlex', 'batas' => '23 Okt 2026', 'aksi' => 'Proses', 'href' => route('mutasi.index', absolute: false)],
            ],
            'kondisi' => self::kondisi(),
            'aktivitas' => [
                ['ikon' => 'selesai', 'judul' => 'PRB-2026-0031 ditugaskan ke teknisi', 'detail' => 'Budi Saputra • Proyektor Epson EB-X500', 'waktu' => '20 Okt 2026, 09.00 WIB'],
                ['ikon' => 'selesai', 'judul' => 'PGD-2026-0087 diteruskan', 'detail' => 'Kepala Kantor telah memberi rekomendasi', 'waktu' => '20 Okt 2026, 14.30 WIB'],
            ],
            'jadwal' => [
                ['ikon' => 'jadwal', 'judul' => 'Pemeliharaan AC Lab. Jaringan', 'detail' => 'FTI-2022-0018 • Budi Saputra', 'waktu' => '23 Okt 2026, 09.00 WIB'],
                ['ikon' => 'jadwal', 'judul' => 'Pemeriksaan inventaris ruangan', 'detail' => 'FTI-201 • Lab. Sistem Informasi', 'waktu' => '24 Okt 2026, 10.00 WIB'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function pimpinan(): array
    {
        return [
            'banner' => ['nada' => 'info', 'teks' => '3 pengajuan menunggu keputusan. Pengadaan PC laboratorium PGD-2026-0087 telah direkomendasikan Kepala Kantor.'],
            'kpi' => [
                ['label' => 'Total aset tercatat', 'nilai' => '1.248', 'keterangan' => 'Tersebar di 24 ruangan', 'nada' => 'sukses'],
                ['label' => 'Nilai perolehan', 'nilai' => 'Rp18,42 M', 'keterangan' => 'Per 21 Oktober 2026', 'nada' => 'sukses'],
                ['label' => 'Perlu persetujuan', 'nilai' => '3', 'keterangan' => 'Estimasi Rp165.800.000', 'nada' => 'peringatan'],
                ['label' => 'Kondisi baik', 'nilai' => '89%', 'keterangan' => '1.106 aset siap digunakan', 'nada' => 'sukses'],
            ],
            'grafik' => [
                'seriA' => 'Perolehan aset',
                'seriB' => 'Penyusutan',
                'satuan' => 'Dalam juta rupiah',
                'data' => [
                    ['label' => 'Mei', 'a' => 78, 'b' => 20],
                    ['label' => 'Jun', 'a' => 89, 'b' => 28],
                    ['label' => 'Jul', 'a' => 68, 'b' => 24],
                    ['label' => 'Agu', 'a' => 103, 'b' => 30],
                    ['label' => 'Sep', 'a' => 92, 'b' => 34],
                    ['label' => 'Okt', 'a' => 120, 'b' => 36],
                ],
            ],
            'kondisi' => self::kondisi(),
            'persetujuan' => [
                ['nomor' => 'PGD-2026-0087', 'jenis' => 'Pengadaan • 10 PC laboratorium', 'pemohon' => 'Andi Pratama', 'tanggal' => '19 Okt 2026', 'status' => 'Menunggu persetujuan', 'nada' => 'peringatan', 'aksi' => 'Lihat', 'href' => route('pimpinan.persetujuan', absolute: false)],
                ['nomor' => 'PGD-2026-0084', 'jenis' => 'Pengadaan • 2 AC', 'pemohon' => 'Siti Rahma', 'tanggal' => '15 Okt 2026', 'status' => 'Menunggu persetujuan', 'nada' => 'peringatan', 'aksi' => 'Lihat', 'href' => route('pimpinan.persetujuan', absolute: false)],
                ['nomor' => 'PRB-2026-0030', 'jenis' => 'Perbaikan • Server NAS', 'pemohon' => 'Dedi Putra', 'tanggal' => '14 Okt 2026', 'status' => 'Menunggu persetujuan', 'nada' => 'peringatan', 'aksi' => 'Lihat', 'href' => route('pimpinan.persetujuan', absolute: false)],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function kepalaKantor(): array
    {
        $href = route('kepala-kantor.pengajuan', absolute: false);

        return [
            'kpi' => [
                ['label' => 'Menunggu pemeriksaan', 'nilai' => '6', 'keterangan' => '2 pengajuan lebih dari 2 hari', 'nada' => 'peringatan'],
                ['label' => 'Direkomendasikan', 'nilai' => '14', 'keterangan' => 'Selama Oktober 2026', 'nada' => 'sukses'],
                ['label' => 'Perlu revisi', 'nilai' => '2', 'keterangan' => 'Dikembalikan kepada pemohon', 'nada' => 'sukses'],
                ['label' => 'Rata-rata pemeriksaan', 'nilai' => '1,4 hari', 'keterangan' => 'Target layanan ≤ 3 hari', 'nada' => 'sukses'],
            ],
            'banner' => ['nada' => 'peringatan', 'teks' => 'Penghapusan HPS-2026-0006 memerlukan konfirmasi hasil pemeriksaan kondisi fisik sebelum direkomendasikan.'],
            'pemeriksaan' => [
                'total' => 6,
                'baris' => [
                    ['nomor' => 'PGD-2026-0088', 'jenis' => 'Pengadaan • 2 switch jaringan', 'pemohon' => 'Dedi Putra', 'tanggal' => '20 Okt 2026', 'status' => 'Menunggu pemeriksaan', 'nada' => 'peringatan', 'aksi' => 'Periksa', 'href' => $href],
                    ['nomor' => 'HPS-2026-0006', 'jenis' => 'Penghapusan • HP ProDesk', 'pemohon' => 'Andi Pratama', 'tanggal' => '16 Okt 2026', 'status' => 'Perlu pemeriksaan', 'nada' => 'peringatan', 'aksi' => 'Periksa', 'href' => $href],
                    ['nomor' => 'MTS-2026-0015', 'jenis' => 'Mutasi • 4 meja kerja', 'pemohon' => 'Yulia Putri', 'tanggal' => '20 Okt 2026', 'status' => 'Menunggu pemeriksaan', 'nada' => 'peringatan', 'aksi' => 'Periksa', 'href' => $href],
                ],
            ],
            'aktivitas' => [
                ['ikon' => 'selesai', 'judul' => 'PGD-2026-0087 direkomendasikan', 'detail' => '10 PC laboratorium • Rp128.000.000', 'waktu' => '20 Okt 2026, 14.30 WIB'],
                ['ikon' => 'selesai', 'judul' => 'PGD-2026-0086 dikembalikan', 'detail' => 'Spesifikasi printer perlu diperjelas', 'waktu' => '20 Okt 2026, 11.05 WIB'],
            ],
            'agenda' => [
                ['ikon' => 'jadwal', 'judul' => 'Pemeriksaan fisik aset rusak berat', 'detail' => 'Gudang aset • Operator dan teknisi', 'waktu' => '22 Okt 2026, 09.00 WIB'],
                ['ikon' => 'jadwal', 'judul' => 'Rekonsiliasi aset bulanan', 'detail' => 'Penutupan data inventaris Oktober', 'waktu' => '30 Okt 2026, 13.00 WIB'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function pemohon(): array
    {
        $href = route('pemohon.pengajuan', absolute: false);

        return [
            'kpi' => [
                ['label' => 'Aset unit', 'nilai' => '486', 'keterangan' => 'Program Studi Sistem Informasi', 'nada' => 'sukses'],
                ['label' => 'Pengajuan saya', 'nilai' => '8', 'keterangan' => 'Selama tahun 2026', 'nada' => 'sukses'],
                ['label' => 'Sedang diproses', 'nilai' => '4', 'keterangan' => '1 menunggu persetujuan', 'nada' => 'peringatan'],
                ['label' => 'Pengajuan selesai', 'nilai' => '4', 'keterangan' => 'Pengadaan dan perbaikan', 'nada' => 'sukses'],
            ],
            'pengajuan' => [
                'total' => 8,
                'baris' => [
                    ['nomor' => 'PGD-2026-0087', 'jenis' => 'Pengadaan • 10 PC laboratorium', 'tanggal' => '19 Okt 2026', 'status' => 'Menunggu persetujuan', 'nada' => 'peringatan', 'aksi' => 'Lihat', 'href' => $href],
                    ['nomor' => 'PRB-2026-0031', 'jenis' => 'Perbaikan • Epson EB-X500', 'tanggal' => '18 Okt 2026', 'status' => 'Dikerjakan', 'nada' => 'info', 'aksi' => 'Lihat', 'href' => $href],
                    ['nomor' => 'MTS-2026-0014', 'jenis' => 'Mutasi • Dell OptiPlex 7010', 'tanggal' => '17 Okt 2026', 'status' => 'Disetujui', 'nada' => 'sukses', 'aksi' => 'Lihat', 'href' => $href],
                    ['nomor' => 'HPS-2026-0006', 'jenis' => 'Penghapusan • HP ProDesk', 'tanggal' => '16 Okt 2026', 'status' => 'Perlu pemeriksaan', 'nada' => 'peringatan', 'aksi' => 'Lihat', 'href' => $href],
                ],
            ],
            'perkembangan' => [
                ['ikon' => 'selesai', 'judul' => 'Pengadaan PC menunggu Pimpinan', 'detail' => 'PGD-2026-0087 • Kepala Kantor merekomendasikan', 'waktu' => '20 Okt 2026, 14.30 WIB'],
                ['ikon' => 'selesai', 'judul' => 'Proyektor sedang diperbaiki', 'detail' => 'PRB-2026-0031 • Teknisi Budi Saputra', 'waktu' => '21 Okt 2026, 09.30 WIB'],
            ],
            'aksiCepat' => [
                ['label' => 'Pengadaan', 'href' => route('pemohon.pengadaan', absolute: false)],
                ['label' => 'Perbaikan', 'href' => route('pemohon.perbaikan', absolute: false)],
                ['label' => 'Mutasi', 'href' => route('pemohon.mutasi', absolute: false)],
                ['label' => 'Penghapusan', 'href' => route('pemohon.penghapusan', absolute: false)],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function pegawai(): array
    {
        $href = route('pegawai.aset', absolute: false);

        return [
            'kpi' => [
                ['label' => 'Aset tanggung jawab', 'nilai' => '4', 'keterangan' => 'Sesuai penetapan inventaris', 'nada' => 'sukses'],
                ['label' => 'Kondisi baik', 'nilai' => '4', 'keterangan' => 'Seluruh aset siap digunakan', 'nada' => 'sukses'],
                ['label' => 'Nilai perolehan', 'nilai' => 'Rp21,45 jt', 'keterangan' => 'Total aset tanggung jawab', 'nada' => 'sukses'],
                ['label' => 'Konfirmasi terakhir', 'nilai' => '12 Okt', 'keterangan' => 'Pemeriksaan fisik tahun 2026', 'nada' => 'sukses'],
            ],
            'aset' => [
                'total' => 4,
                'baris' => [
                    ['kode' => 'FTI-2024-0001', 'nama' => 'Lenovo ThinkPad E14', 'lokasi' => 'Ruang Dosen SI', 'kondisi' => 'Baik', 'nada' => 'sukses', 'aksi' => 'Lihat', 'href' => $href],
                    ['kode' => 'FTI-2024-0010', 'nama' => 'Monitor Dell P2422H', 'lokasi' => 'Ruang Dosen SI', 'kondisi' => 'Baik', 'nada' => 'sukses', 'aksi' => 'Lihat', 'href' => $href],
                    ['kode' => 'FTI-2023-0071', 'nama' => 'Printer Canon G3010', 'lokasi' => 'Ruang Dosen SI', 'kondisi' => 'Baik', 'nada' => 'sukses', 'aksi' => 'Lihat', 'href' => $href],
                    ['kode' => 'FTI-2022-0065', 'nama' => 'Kursi kerja ergonomis', 'lokasi' => 'Ruang Dosen SI', 'kondisi' => 'Baik', 'nada' => 'sukses', 'aksi' => 'Lihat', 'href' => $href],
                ],
            ],
            'aktivitas' => [
                ['ikon' => 'selesai', 'judul' => 'Pemeriksaan fisik selesai', 'detail' => '4 aset sesuai catatan dan kondisi baik', 'waktu' => '12 Okt 2026 • Nadia Putri'],
                ['ikon' => 'selesai', 'judul' => 'Penetapan tanggung jawab laptop', 'detail' => 'FTI-2024-0001 • BAST-2024-0001', 'waktu' => '15 Feb 2024'],
            ],
            'layanan' => [
                ['label' => 'Operator aset', 'nilai' => 'Nadia Putri'],
                ['label' => 'Unit layanan', 'nilai' => 'Kantor FTI • Ruang Administrasi'],
                ['label' => 'Jam layanan', 'nilai' => 'Senin–Jumat, 08.00–16.00 WIB'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function teknisi(): array
    {
        $href = route('teknisi.tugas', absolute: false);

        return [
            'kpi' => [
                ['label' => 'Tugas aktif', 'nilai' => '5', 'keterangan' => '3 dikerjakan, 2 menunggu', 'nada' => 'sukses'],
                ['label' => 'Target hari ini', 'nilai' => '1', 'keterangan' => 'TGS-2026-0046 • UPS APC', 'nada' => 'peringatan'],
                ['label' => 'Selesai bulan ini', 'nilai' => '12', 'keterangan' => 'Semua hasil telah dicatat', 'nada' => 'sukses'],
                ['label' => 'Rata-rata penyelesaian', 'nilai' => '2,3 hari', 'keterangan' => 'Perbaikan selama Oktober 2026', 'nada' => 'sukses'],
            ],
            'banner' => ['nada' => 'peringatan', 'teks' => 'Proyektor Epson EB-X500 (TGS-2026-0048) ditargetkan selesai 22 Oktober. Perbarui pemeriksaan dan kebutuhan suku cadang hari ini.'],
            'tugas' => [
                'total' => 5,
                'baris' => [
                    ['nomor' => 'TGS-2026-0048', 'aset' => 'Epson EB-X500', 'lokasi' => 'Lab. Sistem Informasi', 'target' => '22 Okt 2026', 'status' => 'Dikerjakan', 'nada' => 'info', 'aksi' => 'Lihat', 'href' => $href],
                    ['nomor' => 'TGS-2026-0046', 'aset' => 'UPS APC BX1400', 'lokasi' => 'Lab. Jaringan', 'target' => '21 Okt 2026', 'status' => 'Dikerjakan', 'nada' => 'info', 'aksi' => 'Lihat', 'href' => $href],
                    ['nomor' => 'TGS-2026-0049', 'aset' => 'Printer Canon G2010', 'lokasi' => 'Ruang Administrasi', 'target' => '24 Okt 2026', 'status' => 'Menunggu pemeriksaan', 'nada' => 'peringatan', 'aksi' => 'Lihat', 'href' => $href],
                ],
            ],
            'aktivitas' => [
                ['ikon' => 'selesai', 'judul' => 'Pemeriksaan proyektor diperbarui', 'detail' => 'TGS-2026-0048 • Pengecekan lampu dan filter', 'waktu' => '21 Okt 2026, 09.30 WIB'],
                ['ikon' => 'selesai', 'judul' => 'Perbaikan printer selesai', 'detail' => 'TGS-2026-0044 • Hasil cetak normal', 'waktu' => '20 Okt 2026, 15.00 WIB'],
            ],
            'agenda' => [
                ['ikon' => 'jadwal', 'judul' => 'Uji fungsi UPS setelah perbaikan', 'detail' => 'Lab. Jaringan • Bersama Dedi Putra', 'waktu' => '21 Okt 2026, 14.00 WIB'],
                ['ikon' => 'jadwal', 'judul' => 'Pemeliharaan AC berkala', 'detail' => 'PMH-2026-0041 • AC Daikin 2 PK', 'waktu' => '23 Okt 2026, 09.00 WIB'],
            ],
        ];
    }

    /**
     * @return list<array{label: string, nilai: string, persen: float, nada: string}>
     */
    private static function kondisi(): array
    {
        return [
            ['label' => 'Baik', 'nilai' => '1.106 aset • 88,6%', 'persen' => 88.6, 'nada' => 'sukses'],
            ['label' => 'Rusak ringan', 'nilai' => '108 aset • 8,7%', 'persen' => 8.7, 'nada' => 'peringatan'],
            ['label' => 'Rusak berat', 'nilai' => '34 aset • 2,7%', 'persen' => 2.7, 'nada' => 'bahaya'],
        ];
    }
}
