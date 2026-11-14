<?php

namespace App\Http\Controllers;

use App\Models\LogAktivitas;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LogAktivitasController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', LogAktivitas::class);

        $filter = $request->validate([
            'pengguna' => ['nullable', 'string', 'max:100'],
            'aksi' => ['nullable', 'string', 'max:30'],
            'tabel' => ['nullable', 'string', 'max:50'],
            'dari' => ['nullable', 'date'],
            'sampai' => ['nullable', 'date', 'after_or_equal:dari'],
        ]);

        $log = LogAktivitas::query()
            ->with('pengguna:id_pengguna,nama_lengkap,username')
            ->when($filter['pengguna'] ?? null, function ($query, string $kata) {
                $query->whereHas('pengguna', function ($pengguna) use ($kata) {
                    $pengguna->where('nama_lengkap', 'like', "%{$kata}%")
                        ->orWhere('username', 'like', "%{$kata}%");
                });
            })
            ->when($filter['aksi'] ?? null, fn ($query, string $aksi) => $query->where('aksi', $aksi))
            ->when($filter['tabel'] ?? null, fn ($query, string $tabel) => $query->where('nama_tabel', $tabel))
            ->when($filter['dari'] ?? null, fn ($query, string $dari) => $query->whereDate('waktu', '>=', $dari))
            ->when($filter['sampai'] ?? null, fn ($query, string $sampai) => $query->whereDate('waktu', '<=', $sampai))
            ->orderByDesc('waktu')
            ->orderByDesc('id_log')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (LogAktivitas $item) => [
                'id_log' => $item->id_log,
                'waktu' => $item->waktu?->format('Y-m-d H:i:s'),
                'aksi' => $item->aksi,
                'nama_tabel' => $item->nama_tabel,
                'id_data' => $item->id_data,
                'detail' => $item->detail,
                'pengguna' => $item->pengguna?->nama_lengkap ?? 'Tidak dikenal',
            ]);

        return Inertia::render('LogAktivitas/Index', [
            'log' => $log,
            'filter' => [
                'pengguna' => $filter['pengguna'] ?? '',
                'aksi' => $filter['aksi'] ?? '',
                'tabel' => $filter['tabel'] ?? '',
                'dari' => $filter['dari'] ?? '',
                'sampai' => $filter['sampai'] ?? '',
            ],
            'opsiAksi' => LogAktivitas::query()->distinct()->orderBy('aksi')->pluck('aksi'),
            'opsiTabel' => LogAktivitas::query()->distinct()->orderBy('nama_tabel')->pluck('nama_tabel'),
        ]);
    }
}
