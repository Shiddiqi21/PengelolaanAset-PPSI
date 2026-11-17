<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\PemeliharaanAset;
use App\Models\User;
use App\Models\Vendor;
use App\Services\ActivityLogger;
use App\Support\PeranNama;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PemeliharaanController extends Controller
{
    /**
     * Tampilkan jadwal dan riwayat pemeliharaan aset bagi Operator Aset (/pemeliharaan)
     */
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'terjadwal');
        if (! in_array($tab, ['terjadwal', 'dalam_proses', 'selesai', 'semua'], true)) {
            $tab = 'terjadwal';
        }

        $query = PemeliharaanAset::query()
            ->with(['aset.kategori', 'pelaksana', 'vendor']);

        if ($tab === 'terjadwal') {
            $query->where('status', 'terjadwal');
        } elseif ($tab === 'dalam_proses') {
            $query->where('status', 'dalam_proses');
        } elseif ($tab === 'selesai') {
            $query->where('status', 'selesai');
        }

        if ($request->filled('q')) {
            $keyword = '%' . $request->q . '%';
            $query->where(function ($q) use ($keyword) {
                $q->where('jenis_pemeliharaan', 'like', $keyword)
                    ->orWhereHas('aset', fn ($qa) => $qa->where('nama_barang', 'like', $keyword)->orWhere('kode_aset', 'like', $keyword))
                    ->orWhereHas('pelaksana', fn ($qp) => $qp->where('nama_lengkap', 'like', $keyword))
                    ->orWhereHas('vendor', fn ($qv) => $qv->where('nama_vendor', 'like', $keyword));
            });
        }

        $daftarPemeliharaan = $query
            ->orderBy($tab === 'selesai' ? 'tanggal_pelaksanaan' : 'tanggal_jadwal', $tab === 'selesai' ? 'desc' : 'asc')
            ->paginate(10)
            ->withQueryString()
            ->through(function (PemeliharaanAset $p) {
                $nadaStatus = match ($p->status) {
                    'selesai' => 'sukses',
                    'dalam_proses' => 'info',
                    'terjadwal' => 'peringatan',
                    'dibatalkan' => 'bahaya',
                    default => 'netral',
                };

                $labelStatus = match ($p->status) {
                    'terjadwal' => 'Terjadwal',
                    'dalam_proses' => 'Sedang Berjalan',
                    'selesai' => 'Selesai',
                    'dibatalkan' => 'Dibatalkan',
                    default => ucfirst($p->status),
                };

                $pelaksanaTeks = '-';
                if ($p->pelaksana) {
                    $pelaksanaTeks = "Teknisi: {$p->pelaksana->nama_lengkap}";
                } elseif ($p->vendor) {
                    $pelaksanaTeks = "Vendor: {$p->vendor->nama_vendor}";
                }

                return [
                    'id_pemeliharaan' => $p->id_pemeliharaan,
                    'id_aset' => $p->id_aset,
                    'kode_aset' => $p->aset?->kode_aset ?? '-',
                    'nama_barang' => $p->aset?->nama_barang ?? '-',
                    'merek_tipe' => $p->aset?->merek_tipe ?? '-',
                    'jenis_pemeliharaan' => $p->jenis_pemeliharaan,
                    'tanggal_jadwal' => $p->tanggal_jadwal?->format('d M Y') ?? '-',
                    'tanggal_pelaksanaan' => $p->tanggal_pelaksanaan?->format('d M Y') ?? '-',
                    'pelaksana' => $pelaksanaTeks,
                    'tipe_pelaksana' => $p->id_vendor ? 'vendor' : 'teknisi',
                    'id_pelaksana' => $p->id_pelaksana,
                    'id_vendor' => $p->id_vendor,
                    'uraian' => $p->uraian ?? '-',
                    'biaya' => (float) ($p->biaya ?? 0),
                    'status' => $p->status,
                    'status_label' => $labelStatus,
                    'status_nada' => $nadaStatus,
                ];
            });

        // Opsi aset aktif untuk jadwal baru
        $daftarAset = Aset::query()
            ->where('status_aset', '!=', 'dihapus')
            ->orderBy('nama_barang')
            ->get(['id_aset', 'kode_aset', 'nama_barang', 'merek_tipe']);

        // Opsi teknisi fakultas
        $daftarTeknisi = User::query()
            ->whereHas('semuaPeran', fn ($q) => $q->where('nama_peran', PeranNama::TEKNISI))
            ->where('is_aktif', true)
            ->orderBy('nama_lengkap')
            ->get(['id_pengguna', 'nama_lengkap', 'nip']);

        // Opsi vendor rekanan
        $daftarVendor = Vendor::query()
            ->orderBy('nama_vendor')
            ->get(['id_vendor', 'nama_vendor', 'kontak']);

        return Inertia::render('Pemeliharaan/Index', [
            'daftarPemeliharaan' => $daftarPemeliharaan,
            'daftarAset' => $daftarAset,
            'daftarTeknisi' => $daftarTeknisi,
            'daftarVendor' => $daftarVendor,
            'tabAktif' => $tab,
            'filters' => [
                'q' => $request->q ?? '',
                'tab' => $tab,
            ],
        ]);
    }

    /**
     * Tambahkan jadwal pemeliharaan baru.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'id_aset' => ['required', 'integer', 'exists:aset,id_aset'],
            'jenis_pemeliharaan' => ['required', 'string', 'max:150'],
            'tanggal_jadwal' => ['required', 'date'],
            'tipe_pelaksana' => ['required', 'in:teknisi,vendor'],
            'id_pelaksana' => ['required_if:tipe_pelaksana,teknisi', 'nullable', 'exists:pengguna,id_pengguna'],
            'id_vendor' => ['required_if:tipe_pelaksana,vendor', 'nullable', 'exists:vendor,id_vendor'],
            'uraian' => ['nullable', 'string', 'max:1000'],
            'biaya' => ['nullable', 'numeric', 'min:0'],
        ], [
            'id_aset.required' => 'Pilih aset yang akan dijadwalkan pemeliharaannya.',
            'jenis_pemeliharaan.required' => 'Jenis pemeliharaan wajib diisi.',
            'tanggal_jadwal.required' => 'Tanggal jadwal wajib ditentukan.',
            'tipe_pelaksana.required' => 'Pilih pelaksana pemeliharaan.',
            'id_pelaksana.required_if' => 'Pilih teknisi fakultas yang ditugaskan.',
            'id_vendor.required_if' => 'Pilih vendor rekanan yang ditunjuk.',
        ]);

        $perluVendor = $validated['tipe_pelaksana'] === 'vendor';

        $pemeliharaan = PemeliharaanAset::query()->create([
            'id_aset' => $validated['id_aset'],
            'jenis_pemeliharaan' => $validated['jenis_pemeliharaan'],
            'tanggal_jadwal' => $validated['tanggal_jadwal'],
            'id_pelaksana' => $perluVendor ? null : $validated['id_pelaksana'],
            'id_vendor' => $perluVendor ? $validated['id_vendor'] : null,
            'status' => 'terjadwal',
            'uraian' => $validated['uraian'] ?? null,
            'biaya' => $validated['biaya'] ?? null,
        ]);

        ActivityLogger::record(
            'tambah_jadwal_pemeliharaan',
            'pemeliharaan_aset',
            $pemeliharaan->id_pemeliharaan,
            "Jadwal pemeliharaan baru: {$pemeliharaan->jenis_pemeliharaan}",
            $request->user()->id_pengguna
        );

        return redirect()->route('pemeliharaan.index')->with('status', 'Jadwal pemeliharaan berhasil ditambahkan.');
    }

    /**
     * Perbarui realisasi / status jadwal pemeliharaan.
     */
    public function update(Request $request, PemeliharaanAset $pemeliharaan): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:dalam_proses,selesai,dibatalkan'],
            'tanggal_pelaksanaan' => ['nullable', 'date'],
            'uraian' => ['nullable', 'string', 'max:1500'],
            'biaya' => ['nullable', 'numeric', 'min:0'],
        ]);

        $pemeliharaan->update([
            'status' => $validated['status'],
            'tanggal_pelaksanaan' => $validated['tanggal_pelaksanaan'] ?? ($validated['status'] === 'selesai' ? now() : null),
            'uraian' => $validated['uraian'] ?? $pemeliharaan->uraian,
            'biaya' => $validated['biaya'] ?? $pemeliharaan->biaya,
        ]);

        ActivityLogger::record(
            'update_pemeliharaan',
            'pemeliharaan_aset',
            $pemeliharaan->id_pemeliharaan,
            "Status pemeliharaan diubah menjadi {$validated['status']}",
            $request->user()->id_pengguna
        );

        return redirect()->route('pemeliharaan.index')->with('status', 'Status pemeliharaan berhasil diperbarui.');
    }
}
