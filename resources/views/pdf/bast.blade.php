<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Berita Acara Serah Terima - {{ $bast->nomor_bast }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 18mm 18mm 18mm 18mm;
        }
        body {
            font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #111827;
        }
        .header {
            text-align: center;
            border-bottom: 3px double #111827;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .header .univ-title {
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
            font-weight: normal;
        }
        .header .faculty-title {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 2px 0;
        }
        .header .contact-info {
            font-size: 8.5pt;
            color: #4b5563;
            margin: 0;
        }
        .doc-title {
            text-align: center;
            margin-bottom: 16px;
        }
        .doc-title h2 {
            font-size: 12.5pt;
            font-weight: bold;
            text-transform: uppercase;
            text-decoration: underline;
            margin: 0;
        }
        .doc-title p {
            font-size: 10pt;
            margin: 3px 0 0 0;
            font-family: monospace;
            font-weight: bold;
        }
        p {
            margin: 0 0 8px 0;
            text-align: justify;
        }
        .parties-table {
            width: 100%;
            margin-bottom: 12px;
            border-collapse: collapse;
        }
        .parties-table td {
            vertical-align: top;
            padding: 2px 0;
            font-size: 10.5pt;
        }
        .parties-table .col-label {
            width: 120px;
        }
        .parties-table .col-separator {
            width: 15px;
            text-align: center;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 9.5pt;
        }
        .items-table th, .items-table td {
            border: 1px solid #374151;
            padding: 6px 8px;
        }
        .items-table th {
            background-color: #f3f4f6;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9pt;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .signatures {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
        }
        .signatures td {
            width: 50%;
            vertical-align: top;
            text-align: center;
            font-size: 10pt;
        }
        .signature-box {
            height: 65px;
        }
        .stamp-note {
            font-size: 8pt;
            color: #6b7280;
            font-style: italic;
            border: 1px dashed #d1d5db;
            display: inline-block;
            padding: 3px 6px;
            margin-top: 10px;
        }
        .knowing-section {
            width: 100%;
            margin-top: 15px;
            text-align: center;
            font-size: 10pt;
        }
        .meta-footer {
            margin-top: 25px;
            border-top: 1px dashed #9ca3af;
            padding-top: 5px;
            font-size: 7.5pt;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>

    <!-- KOP SURAT FTI UNAND -->
    @php
        $logoPath = public_path('images/logo-fti-ikon.png');
        $logoBase64 = (extension_loaded('gd') && file_exists($logoPath))
            ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath))
            : null;
    @endphp
    <div class="header">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                @if($logoBase64)
                    <td style="width: 58px; vertical-align: middle; text-align: left;">
                        <img src="{{ $logoBase64 }}" alt="Logo FTI" style="width: 48px; height: 48px;">
                    </td>
                @endif
                <td style="vertical-align: middle; text-align: center;">
                    <p class="univ-title">Kementerian Pendidikan Tinggi, Sains, dan Teknologi</p>
                    <p class="univ-title" style="font-weight: bold;">Universitas Andalas</p>
                    <p class="faculty-title">Fakultas Teknologi Informasi</p>
                    <p class="contact-info">
                        Gedung FTI Kampus Limau Manis, Padang 25163 • Laman: https://fti.unand.ac.id • Pos-el: fti@unand.ac.id
                    </p>
                </td>
                @if($logoBase64)
                    <td style="width: 58px;"></td>
                @endif
            </tr>
        </table>
    </div>

    <!-- JUDUL DOKUMEN -->
    <div class="doc-title">
        <h2>Berita Acara Serah Terima Aset</h2>
        <p>Nomor: {{ $bast->nomor_bast }}</p>
    </div>

    <!-- NARASI HARI & TANGGAL -->
    <p>
        Pada hari ini, <strong>{{ $namaHari }}</strong> tanggal <strong>{{ $tanggalHari }}</strong> bulan <strong>{{ $namaBulan }}</strong> tahun <strong>{{ $tahunTeks }}</strong> ({{ $tanggalFormatLengkap }}), bertempat di lingkungan Fakultas Teknologi Informasi Universitas Andalas, kami yang bertanda tangan di bawah ini:
    </p>

    <!-- PIHAK PERTAMA -->
    <table class="parties-table">
        <tr>
            <td class="col-label">1. Nama / Instansi</td>
            <td class="col-separator">:</td>
            <td><strong>{{ $bast->pihak_pertama }}</strong></td>
        </tr>
        <tr>
            <td class="col-label">   Kedudukan</td>
            <td class="col-separator">:</td>
            <td>Pihak yang Menyerahkan Barang Milik Negara / Aset</td>
        </tr>
        <tr>
            <td colspan="3" style="padding-top: 2px;">
                Yang selanjutnya dalam Berita Acara ini disebut sebagai <strong>PIHAK PERTAMA</strong>.
            </td>
        </tr>
    </table>

    <!-- PIHAK KEDUA -->
    <table class="parties-table">
        <tr>
            <td class="col-label">2. Nama / Instansi</td>
            <td class="col-separator">:</td>
            <td><strong>{{ $bast->pihak_kedua }}</strong></td>
        </tr>
        <tr>
            <td class="col-label">   Kedudukan</td>
            <td class="col-separator">:</td>
            <td>Pihak yang Menerima Barang Milik Negara / Aset</td>
        </tr>
        <tr>
            <td colspan="3" style="padding-top: 2px;">
                Yang selanjutnya dalam Berita Acara ini disebut sebagai <strong>PIHAK KEDUA</strong>.
            </td>
        </tr>
    </table>

    <!-- DASAR & KLAUSUL -->
    <p>
        Berdasarkan transaksi <strong>{{ strtoupper($bast->jenis_bast) }}</strong> aset
        @if($referensiTeks)
            dengan referensi <strong>{{ $referensiTeks }}</strong>
        @endif
        @if($bast->keterangan)
            ({{ $bast->keterangan }}),
        @else
            ,
        @endif
        <strong>PIHAK PERTAMA</strong> menyerahkan kepada <strong>PIHAK KEDUA</strong>, dan <strong>PIHAK KEDUA</strong> menyatakan telah menerima dari <strong>PIHAK PERTAMA</strong> aset fisik dalam kondisi sebagaimana rincian berikut:
    </p>

    <!-- TABEL RINCIAN ASET -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 25px;">No</th>
                <th style="width: 100px;">Kode Aset</th>
                <th>Nama Barang & Spesifikasi</th>
                <th style="width: 80px;">Nomor Seri</th>
                <th style="width: 50px;">Jumlah</th>
                <th style="width: 70px;">Kondisi</th>
            </tr>
        </thead>
        <tbody>
            @forelse($bast->items as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td class="text-center font-mono">{{ $item->kode_aset ?? '-' }}</td>
                    <td>
                        <strong>{{ $item->nama_barang }}</strong>
                        @if($item->spesifikasi)
                            <br><span style="font-size: 8.5pt; color: #4b5563;">{{ $item->spesifikasi }}</span>
                        @endif
                    </td>
                    <td class="text-center font-mono">{{ $item->nomor_seri ?? '-' }}</td>
                    <td class="text-center">{{ $item->jumlah }} {{ $item->satuan ?? 'unit' }}</td>
                    <td class="text-center" style="text-transform: capitalize;">{{ str_replace('_', ' ', $item->kondisi) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" class="text-center" style="font-style: italic; color: #6b7280;">
                        Tidak ada rincian unit aset tercatat.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <p>
        Sejak ditandatanganinya Berita Acara ini, tanggung jawab fisik dan pengawasan atas aset tersebut beralih kepada <strong>PIHAK KEDUA</strong>. Demikian Berita Acara Serah Terima Aset ini dibuat dengan sebenarnya dalam rangkap 2 (dua) bermaterai cukup untuk dipergunakan sebagaimana mestinya.
    </p>

    <!-- TANDA TANGAN PARA PIHAK -->
    <table class="signatures">
        <tr>
            <td>
                <strong>PIHAK PERTAMA</strong><br>
                Yang Menyerahkan,
                <div class="signature-box">
                    <br><br><br>
                </div>
                <strong>( {{ $bast->pihak_pertama }} )</strong>
            </td>
            <td>
                <strong>PIHAK KEDUA</strong><br>
                Yang Menerima,
                <div class="signature-box">
                    <span class="stamp-note">Materai Rp 10.000</span>
                    <br><br>
                </div>
                <strong>( {{ $bast->pihak_kedua }} )</strong>
            </td>
        </tr>
    </table>

    <!-- MENGETAHUI PIMPINAN FAKULTAS -->
    <div class="knowing-section">
        <p style="margin-bottom: 2px;">Mengetahui,</p>
        <p style="font-weight: bold; margin-bottom: 0;">Wakil Dekan II Bidang Umum dan Keuangan<br>Fakultas Teknologi Informasi Universitas Andalas</p>
        <div style="height: 55px;"></div>
        <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">Dr. Eng. Ir. Derisma, M.T.</p>
        <p style="font-size: 9pt; color: #4b5563; margin-top: 1px;">NIP. 197412152000032001</p>
    </div>

    <div class="meta-footer">
        <span>Sistem Informasi Pengelolaan Aset FTI Universitas Andalas • Standar Operasional Prosedur 05/UN16.15.D/SOP/IV/2026</span>
        <span style="float: right;">Dicetak: {{ now()->translatedFormat('d F Y, H:i') }} WIB</span>
    </div>

</body>
</html>
