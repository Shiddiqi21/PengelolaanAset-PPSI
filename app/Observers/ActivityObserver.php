<?php

namespace App\Observers;

use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;

class ActivityObserver
{
    public function created(Model $model): void
    {
        $this->write('tambah', $model, $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $this->write('ubah', $model, $model->getChanges());
    }

    public function deleted(Model $model): void
    {
        $this->write('hapus', $model, ['id' => $model->getKey()]);
    }

    private function write(string $aksi, Model $model, array $attributes): void
    {
        if ($model->getTable() === 'log_aktivitas') {
            return;
        }

        $detail = $this->detail($attributes);

        if ($aksi === 'ubah' && $detail === null) {
            return;
        }

        ActivityLogger::record($aksi, $model->getTable(), $model->getKey(), $detail);
    }

    private function detail(array $attributes): ?string
    {
        $clean = Arr::except($attributes, [
            'password',
            'password_hash',
            'remember_token',
            'created_at',
            'updated_at',
        ]);

        if ($clean === []) {
            return null;
        }

        return json_encode($clean, JSON_UNESCAPED_UNICODE);
    }
}
