<?php

namespace App\Http\Controllers;

use App\Http\Requests\ResetPasswordPenggunaRequest;
use App\Http\Requests\StorePenggunaRequest;
use App\Http\Requests\UpdatePenggunaRequest;
use App\Models\Peran;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Support\PeranNama;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PenggunaController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $filter = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'peran' => ['nullable', 'integer'],
            'status' => ['nullable', 'in:aktif,nonaktif'],
        ]);

        $pengguna = User::query()
            ->with(['peran:id_peran,nama_peran', 'semuaPeran:id_peran,nama_peran', 'unit:id_unit,nama_unit', 'subUnit:id_sub_unit,nama_sub_unit'])
            ->when($filter['q'] ?? null, function ($query, string $kata) {
                $query->where(function ($where) use ($kata) {
                    $where->where('nama_lengkap', 'like', "%{$kata}%")
                        ->orWhere('username', 'like', "%{$kata}%")
                        ->orWhere('email', 'like', "%{$kata}%")
                        ->orWhere('nip', 'like', "%{$kata}%");
                });
            })
            ->when($filter['peran'] ?? null, fn ($query, $peran) => $query->whereHas('semuaPeran', fn ($q) => $q->where('peran.id_peran', $peran)))
            ->when($filter['status'] ?? null, fn ($query, string $status) => $query->where('is_aktif', $status === 'aktif'))
            ->orderBy('nama_lengkap')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id_pengguna' => $user->id_pengguna,
                'nama_lengkap' => $user->nama_lengkap,
                'username' => $user->username,
                'email' => $user->email,
                'nip' => $user->nip,
                'peran' => $user->namaSemuaPeran(),
                'unit' => $user->unit?->nama_unit,
                'sub_unit' => $user->subUnit?->nama_sub_unit,
                'is_aktif' => $user->is_aktif,
            ]);

        return Inertia::render('Pengguna/Index', [
            'pengguna' => $pengguna,
            'filter' => [
                'q' => $filter['q'] ?? '',
                'peran' => $filter['peran'] ?? '',
                'status' => $filter['status'] ?? '',
            ],
            'opsiPeran' => Peran::query()->orderBy('nama_peran')->get(['id_peran', 'nama_peran']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', User::class);

        return Inertia::render('Pengguna/Form', [
            'mode' => 'create',
            ...$this->formOptions(),
        ]);
    }

    public function store(StorePenggunaRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['password', 'peran']);

        $user = User::query()->create([
            ...$data,
            'password_hash' => $request->string('password')->toString(),
            'is_aktif' => true,
        ]);

        $this->simpanPeran($user, $request->input('peran', []));

        return redirect()->route('pengguna.index')->with('status', 'Akun berhasil dibuat.');
    }

    public function edit(User $user): Response
    {
        $this->authorize('update', $user);

        return Inertia::render('Pengguna/Form', [
            'mode' => 'edit',
            'akun' => [
                'id_pengguna' => $user->id_pengguna,
                'id_peran' => $user->id_peran,
                'peran' => $user->semuaPeran()->pluck('peran.id_peran')->map(fn ($id) => (int) $id)->values(),
                'id_unit' => $user->id_unit,
                'id_sub_unit' => $user->id_sub_unit,
                'nip' => $user->nip,
                'nama_lengkap' => $user->nama_lengkap,
                'email' => $user->email,
                'username' => $user->username,
                'is_aktif' => $user->is_aktif,
            ],
            ...$this->formOptions(),
        ]);
    }

    public function update(UpdatePenggunaRequest $request, User $user): RedirectResponse
    {
        $peranBaru = collect($request->input('peran', []))->map(fn ($id) => (int) $id)->sort()->values();
        $peranLama = $user->semuaPeran()->pluck('peran.id_peran')->map(fn ($id) => (int) $id)->sort()->values();
        $peranBerubah = $peranBaru->all() !== $peranLama->all()
            || (int) $request->input('id_peran') !== (int) $user->id_peran;

        if ($peranBerubah && $user->is($request->user())) {
            return back()->withErrors([
                'peran' => 'Anda tidak dapat mengubah peran akun yang sedang dipakai.',
            ]);
        }

        $idOperator = Peran::query()->where('nama_peran', PeranNama::OPERATOR)->value('id_peran');

        if ($user->adalahOperatorAktifTerakhir() && ! $peranBaru->contains((int) $idOperator)) {
            return back()->withErrors([
                'peran' => 'Akun ini operator aktif terakhir. Jadikan akun lain operator sebelum mencabut perannya.',
            ]);
        }

        $user->update($request->safe()->except('peran'));

        if ($peranBerubah) {
            $this->simpanPeran($user, $peranBaru->all());
        }

        return redirect()->route('pengguna.index')->with('status', 'Akun berhasil diperbarui.');
    }

    public function status(Request $request, User $user): RedirectResponse
    {
        $this->authorize('update', $user);

        if ($user->is($request->user())) {
            return back()->withErrors([
                'status' => 'Anda tidak dapat menonaktifkan akun yang sedang dipakai.',
            ]);
        }

        if ($user->adalahOperatorAktifTerakhir()) {
            return back()->withErrors([
                'status' => 'Akun ini operator aktif terakhir dan tidak dapat dinonaktifkan.',
            ]);
        }

        $user->update(['is_aktif' => ! $user->is_aktif]);

        return back()->with('status', $user->is_aktif ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.');
    }

    public function resetPassword(ResetPasswordPenggunaRequest $request, User $user): RedirectResponse
    {
        $user->update([
            'password_hash' => $request->string('password')->toString(),
        ]);

        // Perubahan kolom sandi tidak ikut tercatat oleh observer, jadi dicatat di sini.
        ActivityLogger::record('reset_password', 'pengguna', $user->id_pengguna, 'Kata sandi direset oleh operator');

        // Sesi lama milik akun tersebut tidak boleh tetap berlaku setelah sandinya direset.
        if (! $user->is($request->user()) && config('session.driver') === 'database') {
            DB::table(config('session.table', 'sessions'))
                ->where('user_id', $user->getAuthIdentifier())
                ->delete();
        }

        return back()->with('status', 'Kata sandi berhasil direset.');
    }

    /**
     * Menyimpan seluruh peran akun dan mencatatnya di log (perubahan pivot tidak ditangkap observer).
     *
     * @param  array<int, int|string>  $idPeran
     */
    private function simpanPeran(User $user, array $idPeran): void
    {
        $user->semuaPeran()->sync(array_map('intval', $idPeran));
        $user->unsetRelation('semuaPeran');

        ActivityLogger::record(
            'ubah_peran',
            'pengguna',
            $user->id_pengguna,
            'Peran: '.implode(', ', $user->namaSemuaPeran())
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'peran' => Peran::query()->orderBy('nama_peran')->get(['id_peran', 'nama_peran']),
            'unit' => Unit::query()->orderBy('nama_unit')->get(['id_unit', 'nama_unit']),
            'subUnit' => SubUnit::query()->orderBy('nama_sub_unit')->get(['id_sub_unit', 'id_unit', 'nama_sub_unit']),
        ];
    }
}
