<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubUnitRequest;
use App\Http\Requests\UnitRequest;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', User::class);

        $unit = Unit::query()
            ->withCount(['subUnit', 'pengguna', 'ruangan'])
            ->orderBy('id_unit')
            ->get()
            ->map(fn (Unit $u) => [
                'id_unit' => $u->id_unit,
                'nama_unit' => $u->nama_unit,
                'jenis_unit' => $u->jenis_unit,
                'sub_unit_count' => $u->sub_unit_count,
                'pengguna_count' => $u->pengguna_count,
                'ruangan_count' => $u->ruangan_count,
            ]);

        $subUnit = SubUnit::query()
            ->with('unit:id_unit,nama_unit')
            ->withCount(['pengguna', 'ruangan'])
            ->orderBy('id_unit')
            ->orderBy('id_sub_unit')
            ->get()
            ->map(fn (SubUnit $s) => [
                'id_sub_unit' => $s->id_sub_unit,
                'id_unit' => $s->id_unit,
                'nama_unit' => $s->unit?->nama_unit ?? '-',
                'nama_sub_unit' => $s->nama_sub_unit,
                'jenis_sub_unit' => $s->jenis_sub_unit,
                'pengguna_count' => $s->pengguna_count,
                'ruangan_count' => $s->ruangan_count,
            ]);

        return Inertia::render('Unit/Index', [
            'daftarUnit' => $unit,
            'daftarSubUnit' => $subUnit,
        ]);
    }

    public function storeUnit(UnitRequest $request): RedirectResponse
    {
        $unit = Unit::query()->create($request->validated());

        return redirect()
            ->route('unit.index')
            ->with('status', "Unit {$unit->nama_unit} berhasil ditambahkan.");
    }

    public function updateUnit(UnitRequest $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validated());

        return redirect()
            ->route('unit.index')
            ->with('status', "Unit {$unit->nama_unit} berhasil diperbarui.");
    }

    public function destroyUnit(Unit $unit): RedirectResponse
    {
        $this->authorize('create', User::class);

        if ($unit->subUnit()->exists() || $unit->pengguna()->exists() || $unit->ruangan()->exists()) {
            return back()->withErrors([
                'status' => "Unit {$unit->nama_unit} tidak dapat dihapus karena masih memiliki sub-unit, akun pengguna, atau ruangan terkait.",
            ]);
        }

        $nama = $unit->nama_unit;
        $unit->delete();

        return redirect()
            ->route('unit.index')
            ->with('status', "Unit {$nama} berhasil dihapus.");
    }

    public function storeSubUnit(SubUnitRequest $request): RedirectResponse
    {
        $subUnit = SubUnit::query()->create($request->validated());

        return redirect()
            ->route('unit.index')
            ->with('status', "Sub-unit {$subUnit->nama_sub_unit} berhasil ditambahkan.");
    }

    public function updateSubUnit(SubUnitRequest $request, SubUnit $subUnit): RedirectResponse
    {
        $data = $request->validated();

        if ((int) $data['id_unit'] !== (int) $subUnit->id_unit
            && ($subUnit->pengguna()->exists() || $subUnit->ruangan()->exists())) {
            return back()->withErrors([
                'status' => "Unit induk untuk {$subUnit->nama_sub_unit} tidak dapat diubah karena sub-unit ini sudah dipakai oleh akun pengguna atau ruangan.",
            ]);
        }

        $subUnit->update($data);

        return redirect()
            ->route('unit.index')
            ->with('status', "Sub-unit {$subUnit->nama_sub_unit} berhasil diperbarui.");
    }

    public function destroySubUnit(SubUnit $subUnit): RedirectResponse
    {
        $this->authorize('create', User::class);

        if ($subUnit->pengguna()->exists() || $subUnit->ruangan()->exists()) {
            return back()->withErrors([
                'status' => "Sub-unit {$subUnit->nama_sub_unit} tidak dapat dihapus karena masih dipakai oleh akun pengguna atau ruangan.",
            ]);
        }

        $nama = $subUnit->nama_sub_unit;
        $subUnit->delete();

        return redirect()
            ->route('unit.index')
            ->with('status', "Sub-unit {$nama} berhasil dihapus.");
    }
}
